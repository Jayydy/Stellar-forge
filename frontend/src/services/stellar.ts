// Stellar SDK integration service
import { STELLAR_CONFIG, NETWORK_CONFIGS } from '../config/stellar'
import { walletService } from './wallet'
import type {
  ContractEvent,
  ContractEventType,
  DeploymentResult,
  FactoryState,
  GetEventsResult,
  TokenInfo,
} from '../types'
import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
  xdr,
  FeeBumpTransaction,
  Transaction,
} from 'stellar-sdk'
import { withRetry, HttpError } from '../utils/retry'

export type { FactoryState } from '../types'

// ── Utilities ─────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

// ── Contract error codes ──────────────────────────────────────────────────────
import { parseContractError } from '../utils/contractErrors'

// ── Network helpers ───────────────────────────────────────────────────────────

function getNetworkConfig(network: 'testnet' | 'mainnet') {
  return NETWORK_CONFIGS[network]
}

function getNetworkPassphrase(network: 'testnet' | 'mainnet'): string {
  return network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET
}

function getRpcServer(network: 'testnet' | 'mainnet'): rpc.Server {
  return new rpc.Server(getNetworkConfig(network).sorobanRpcUrl, {
    allowHttp: false,
  })
}

function getRpcUrl(network: 'testnet' | 'mainnet'): string {
  return getNetworkConfig(network).sorobanRpcUrl
}

// ── Transaction lifecycle ─────────────────────────────────────────────────────

/**
 * Simulate, sign, and submit a Soroban transaction.
 * Returns the transaction hash on success.
 */
async function simulateAndSubmit(
  server: rpc.Server,
  tx: ReturnType<TransactionBuilder['build']>,
  network: 'testnet' | 'mainnet',
): Promise<string> {
  // 1. Simulate to get resource fees and check for errors
  const simResult = await server.simulateTransaction(tx)

  if (rpc.Api.isSimulationError(simResult)) {
    throw parseContractError(new Error(simResult.error))
  }

  if (!rpc.Api.isSimulationSuccess(simResult)) {
    throw new Error('Transaction simulation returned an unexpected result')
  }

  // 2. Assemble the transaction with the simulated resource data
  const assembled = rpc.assembleTransaction(tx, simResult).build()

  // 3. Sign via Freighter
  const signedXdr = await walletService.signTransaction(assembled.toXDR(), network)

  // 4. Submit
  const submitResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase(network)),
  )

  if (submitResult.status === 'ERROR') {
    throw parseContractError(
      new Error(submitResult.errorResult?.toXDR('base64') ?? 'Submission failed'),
    )
  }

  const hash = submitResult.hash

  // 5. Poll until the transaction is confirmed
  await pollTransaction(server, hash)

  return hash
}

async function pollTransaction(
  server: rpc.Server,
  hash: string,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<rpc.Api.GetTransactionResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = (await withRetry(() =>
      server.getTransaction(hash),
    )) as rpc.Api.GetTransactionResponse
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return result
    }
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw parseContractError(new Error(`Transaction failed: ${hash}`))
    }
    // NOT_FOUND means still pending — wait and retry
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(`Transaction ${hash} timed out after ${maxAttempts} attempts`)
}

// ── Fee Bump Transactions ─────────────────────────────────────────────────────

/**
 * Wraps an inner (signed) transaction in a fee bump transaction.
 */
export async function buildFeeBumpTransaction(
  innerTxXdr: string,
  feeSource: string,
  network: 'testnet' | 'mainnet',
  baseFee: string = String(Number(BASE_FEE) * 10),
): Promise<string> {
  const networkPassphrase = getNetworkPassphrase(network)

  // Reconstruct the inner transaction from XDR
  const innerTx = TransactionBuilder.fromXDR(innerTxXdr, networkPassphrase) as Transaction

  // Build the fee bump envelope
  const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
    feeSource,
    baseFee,
    innerTx,
    networkPassphrase,
  )

  // The fee-source account must sign the fee bump envelope
  const signedFeeBumpXdr = await walletService.signTransaction(feeBumpTx.toXDR(), network)

  return signedFeeBumpXdr
}

/**
 * Submit a signed fee bump transaction and wait for confirmation.
 */
export async function submitFeeBumpTransaction(
  signedFeeBumpXdr: string,
  network: 'testnet' | 'mainnet',
): Promise<string> {
  const server = getRpcServer(network)
  const networkPassphrase = getNetworkPassphrase(network)

  const feeBumpTx = TransactionBuilder.fromXDR(
    signedFeeBumpXdr,
    networkPassphrase,
  ) as FeeBumpTransaction

  const submitResult = await server.sendTransaction(feeBumpTx)

  if (submitResult.status === 'ERROR') {
    throw parseContractError(
      new Error(submitResult.errorResult?.toXDR('base64') ?? 'Fee bump submission failed'),
    )
  }

  await pollTransaction(server, submitResult.hash)

  return submitResult.hash
}

/**
 * Build a base TransactionBuilder for the given source account.
 */
async function buildTxBuilder(
  server: rpc.Server,
  sourceAddress: string,
  network: 'testnet' | 'mainnet',
): Promise<TransactionBuilder> {
  const account = await server.getAccount(sourceAddress)
  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(network),
  })
}

// ── Raw RPC types ────────────────────────────────────────────────────────────

interface RpcEventResponse {
  id: string
  type: string
  ledger: number
  ledgerClosedAt: string
  contractId: string
  pagingToken: string
  inSuccessfulContractCall: boolean
  txHash: string
  topic: string[] // base64-encoded XDR ScVal[]
  value: string // base64-encoded XDR ScVal
}

interface RpcGetEventsResult {
  events: RpcEventResponse[]
  latestLedger: number
}

// ── XDR decode helpers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scValToString(val: any): string {
  try {
    const v = val as {
      switch: () => unknown
      address: () => {
        switch: () => unknown
        accountId: () => { publicKey: () => { toString: () => string } }
        contractId: () => Uint8Array
      }
      i128: () => { hi: () => { toString: () => string }; lo: () => { toString: () => string } }
      u64: () => { toString: () => string }
      str: () => { toString: () => string }
      sym: () => { toString: () => string }
      vec: () => unknown[] | null
      toXDR: (format: 'base64') => string
    }
    const type = v.switch()
    if (type === xdr.ScValType.scvAddress()) {
      const addr = v.address()
      if (addr.switch() === xdr.ScAddressType.scAddressTypeAccount()) {
        return addr.accountId().publicKey().toString()
      }
      return Array.from(addr.contractId() as Uint8Array)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      const bytes: Uint8Array = addr.contractId()
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
    if (type === xdr.ScValType.scvI128()) {
      const hi = BigInt(v.i128().hi().toString())
      const lo = BigInt(v.i128().lo().toString())
      return ((hi << 64n) | lo).toString()
    }
    if (type === xdr.ScValType.scvU64()) return v.u64().toString()
    if (type === xdr.ScValType.scvString()) return v.str().toString()
    if (type === xdr.ScValType.scvSymbol()) return v.sym().toString()
    if (type === xdr.ScValType.scvVoid()) return 'none'
    if (type === xdr.ScValType.scvBool()) return val.b().toString()
    if (type === xdr.ScValType.scvVec()) {
      const items: string[] = (val.vec() ?? []).map((v: xdr.ScVal) => scValToString(v))
      return items.join(', ')
    }
    return val.toXDR('base64')
  } catch {
    return ''
  }
}

const EVENT_TOPICS: ContractEventType[] = [
  'token_created',
  'tokens_minted',
  'tokens_burned',
  'metadata_set',
  'fees_updated',
]

// ── Event parsing ─────────────────────────────────────────────────────────────

async function parseRpcEvent(raw: RpcEventResponse): Promise<ContractEvent | null> {
  try {
    if (!raw.topic?.length) return null

    const topic0 = raw.topic[0]
    if (!topic0) return null
    const topicVal = xdr.ScVal.fromXDR(topic0, 'base64')
    const eventType = scValToString(topicVal) as ContractEventType
    if (!EVENT_TOPICS.includes(eventType)) return null

    const valueVal = xdr.ScVal.fromXDR(raw.value, 'base64')
    const items: unknown[] = valueVal.vec() ?? []

    const data: Record<string, string> = {}

    switch (eventType) {
      case 'token_created':
        data.tokenAddress = scValToString(items[0])
        data.creator = scValToString(items[1])
        break
      case 'tokens_minted':
        data.tokenAddress = scValToString(items[0])
        data.to = scValToString(items[1])
        data.amount = scValToString(items[2])
        break
      case 'tokens_burned':
        data.tokenAddress = scValToString(items[0])
        data.from = scValToString(items[1])
        data.amount = scValToString(items[2])
        break
      case 'metadata_set':
        data.tokenAddress = scValToString(items[0])
        data.metadataUri = scValToString(items[1])
        break
      case 'fees_updated':
        data.baseFee = scValToString(items[0])
        data.metadataFee = scValToString(items[1])
        break
    }

    return {
      id: raw.id,
      type: eventType,
      ledger: raw.ledger,
      timestamp: raw.ledgerClosedAt ? Math.floor(new Date(raw.ledgerClosedAt).getTime() / 1000) : 0,
      txHash: raw.txHash,
      data,
    }
  } catch {
    return null
  }
}

// ── JSON-RPC helper ───────────────────────────────────────────────────────────

async function rpcCall<T>(
  method: string,
  params: unknown,
  network: 'testnet' | 'mainnet',
): Promise<T> {
  return withRetry(async () => {
    const res = await fetch(getRpcUrl(network), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
    if (!res.ok) {
      const retryAfter = res.headers.get('Retry-After')
      throw new HttpError(
        res.status,
        `RPC HTTP error ${res.status}`,
        retryAfter ? parseInt(retryAfter, 10) : undefined,
      )
    }
    const json = await res.json()
    if (json.error) {
      // JSON-RPC level error - might be transient (e.g. rate limit error in body)
      const errorMsg = json.error.message ?? 'RPC error'
      if (errorMsg.toLowerCase().includes('rate limit')) {
        throw new HttpError(429, errorMsg)
      }
      throw new Error(errorMsg)
    }
    return json.result as T
  })
}

// ── View function helper ──────────────────────────────────────────────────────

/**
 * Call a read-only (view) contract function via simulation.
 * No signing or submission required.
 */
async function callView(
  server: rpc.Server,
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  sourceAddress: string,
  network: 'testnet' | 'mainnet',
): Promise<xdr.ScVal> {
  const contract = new Contract(contractId)
  const account = await server.getAccount(sourceAddress)
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(network),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const simResult = await server.simulateTransaction(tx)

  if (rpc.Api.isSimulationError(simResult)) {
    throw parseContractError(new Error(simResult.error))
  }

  if (!rpc.Api.isSimulationSuccess(simResult) || !simResult.result) {
    throw new Error(`View call to ${method} returned no result`)
  }

  return simResult.result.retval
}

// ── StellarService ────────────────────────────────────────────────────────────

export class StellarService {
  private network: 'testnet' | 'mainnet'

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network
  }

  setNetwork(network: 'testnet' | 'mainnet') {
    this.network = network
  }

  async deployToken(params: {
    name: string
    symbol: string
    decimals: number
    initialSupply: string
    salt: string
    tokenWasmHash: string
    feePayment: string
  }): Promise<DeploymentResult> {
    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('Factory contract ID is not configured')

      const sourceAddress = walletService.getConnectedAddress()
      if (!sourceAddress) throw new Error('Wallet not connected')

      const server = getRpcServer(this.network)
      const contract = new Contract(contractId)

      const saltBytes = hexToBytes(params.salt.padEnd(64, '0').slice(0, 64))
      const wasmHashBytes = hexToBytes(params.tokenWasmHash.padEnd(64, '0').slice(0, 64))

      const txBuilder = await buildTxBuilder(server, sourceAddress, this.network)
      const tx = txBuilder
        .addOperation(
          contract.call(
            'create_token',
            new Address(sourceAddress).toScVal(),
            nativeToScVal(saltBytes, { type: 'bytes' }),
            nativeToScVal(wasmHashBytes, { type: 'bytes' }),
            nativeToScVal(params.name, { type: 'string' }),
            nativeToScVal(params.symbol, { type: 'string' }),
            nativeToScVal(params.decimals, { type: 'u32' }),
            nativeToScVal(BigInt(params.initialSupply), { type: 'u128' }),
            nativeToScVal(BigInt(params.feePayment), { type: 'i128' }),
          ),
        )
        .setTimeout(30)
        .build()

      const hash = await simulateAndSubmit(server, tx, this.network)

      const txResult = await server.getTransaction(hash)
      let tokenAddress = ''
      if (txResult.status === rpc.Api.GetTransactionStatus.SUCCESS && txResult.returnValue) {
        tokenAddress = scValToNative(txResult.returnValue) as string
      }

      return { tokenAddress, transactionHash: hash, success: true }
    } catch (err) {
      throw parseContractError(err)
    }
  }

  async mintTokens(params: {
    tokenAddress: string
    to: string
    amount: string
    feePayment: string
  }): Promise<string> {
    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('Factory contract ID is not configured')

      const sourceAddress = walletService.getConnectedAddress()
      if (!sourceAddress) throw new Error('Wallet not connected')

      const server = getRpcServer(this.network)
      const contract = new Contract(contractId)

      const txBuilder = await buildTxBuilder(server, sourceAddress, this.network)
      const tx = txBuilder
        .addOperation(
          contract.call(
            'mint_tokens',
            new Address(params.tokenAddress).toScVal(),
            new Address(sourceAddress).toScVal(),
            new Address(params.to).toScVal(),
            nativeToScVal(BigInt(params.amount), { type: 'i128' }),
            nativeToScVal(BigInt(params.feePayment), { type: 'i128' }),
          ),
        )
        .setTimeout(30)
        .build()

      return await simulateAndSubmit(server, tx, this.network)
    } catch (err) {
      throw parseContractError(err)
    }
  }

  async burnTokens(params: { tokenAddress: string; amount: string }): Promise<string> {
    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('Factory contract ID is not configured')

      const sourceAddress = walletService.getConnectedAddress()
      if (!sourceAddress) throw new Error('Wallet not connected')

      const server = getRpcServer(this.network)
      const contract = new Contract(contractId)

      const txBuilder = await buildTxBuilder(server, sourceAddress, this.network)
      const tx = txBuilder
        .addOperation(
          contract.call(
            'burn',
            new Address(params.tokenAddress).toScVal(),
            new Address(sourceAddress).toScVal(),
            nativeToScVal(BigInt(params.amount), { type: 'i128' }),
          ),
        )
        .setTimeout(30)
        .build()

      return await simulateAndSubmit(server, tx, this.network)
    } catch (err) {
      throw parseContractError(err)
    }
  }

  async setMetadata(params: {
    tokenAddress: string
    metadataUri: string
    feePayment: string
  }): Promise<string> {
    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('Factory contract ID is not configured')

      const sourceAddress = walletService.getConnectedAddress()
      if (!sourceAddress) throw new Error('Wallet not connected')

      const server = getRpcServer(this.network)
      const contract = new Contract(contractId)

      const txBuilder = await buildTxBuilder(server, sourceAddress, this.network)
      const tx = txBuilder
        .addOperation(
          contract.call(
            'set_metadata',
            new Address(params.tokenAddress).toScVal(),
            new Address(sourceAddress).toScVal(),
            nativeToScVal(params.metadataUri, { type: 'string' }),
            nativeToScVal(BigInt(params.feePayment), { type: 'i128' }),
          ),
        )
        .setTimeout(30)
        .build()

      return await simulateAndSubmit(server, tx, this.network)
    } catch (err) {
      throw parseContractError(err)
    }
  }

  async getTokenInfo(tokenAddressOrIndex: string | number): Promise<TokenInfo> {
    const contractId = STELLAR_CONFIG.factoryContractId

    if (typeof tokenAddressOrIndex === 'string') {
      return this._getTokenInfoByAddress(tokenAddressOrIndex)
    }

    if (!contractId) throw new Error('Factory contract ID is not configured')

    const sourceAddress = walletService.getConnectedAddress()
    if (!sourceAddress) {
      return this._getTokenInfoByAddress(String(tokenAddressOrIndex))
    }

    try {
      const server = getRpcServer(this.network)
      const retval = await callView(
        server,
        contractId,
        'get_token_info',
        [nativeToScVal(tokenAddressOrIndex as number, { type: 'u32' })],
        sourceAddress,
        this.network,
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const native = scValToNative(retval) as any
      return {
        name: native.name ?? '',
        symbol: native.symbol ?? '',
        decimals: Number(native.decimals ?? 7),
        creator: native.creator?.toString() ?? '',
        createdAt: Number(native.created_at ?? 0),
        totalSupply: native.total_supply?.toString(),
      }
    } catch (err) {
      throw parseContractError(err)
    }
  }

  async getFactoryState(): Promise<FactoryState> {
    const contractId = STELLAR_CONFIG.factoryContractId
    if (!contractId) throw new Error('Factory contract ID is not configured')

    const sourceAddress = walletService.getConnectedAddress()
    if (!sourceAddress) throw new Error('Wallet not connected')

    try {
      const server = getRpcServer(this.network)
      const retval = await callView(
        server,
        contractId,
        'get_state',
        [],
        sourceAddress,
        this.network,
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const native = scValToNative(retval) as any
      return {
        admin: native.admin?.toString() ?? '',
        paused: Boolean(native.paused),
        treasury: native.treasury?.toString() ?? '',
        baseFee: native.base_fee?.toString() ?? '0',
        metadataFee: native.metadata_fee?.toString() ?? '0',
        tokenCount: Number(native.token_count ?? 0),
      }
    } catch (err) {
      throw parseContractError(err)
    }
  }

  async getTransaction(hash: string): Promise<Record<string, unknown>> {
    return withRetry(async () => {
      const { horizonUrl } = getNetworkConfig(this.network)
      const res = await fetch(`${horizonUrl}/transactions/${hash}`)
      if (!res.ok) {
        if (res.status === 404) throw new Error(`Transaction not found: ${hash}`)
        const retryAfter = res.headers.get('Retry-After')
        throw new HttpError(
          res.status,
          `Horizon error ${res.status}`,
          retryAfter ? parseInt(retryAfter, 10) : undefined,
        )
      }
      return res.json()
    })
  }

  /**
   * Check whether a Stellar account exists on Horizon.
   * Returns false for unfunded accounts and throws on transport failures.
   */
  async accountExists(address: string): Promise<boolean> {
    return withRetry(async () => {
      const { horizonUrl } = getNetworkConfig(this.network)
      const res = await fetch(`${horizonUrl}/accounts/${address}`)

      if (res.status === 404) {
        return false
      }

      if (!res.ok) {
        const retryAfter = res.headers.get('Retry-After')
        throw new HttpError(
          res.status,
          `Horizon error ${res.status}`,
          retryAfter ? parseInt(retryAfter, 10) : undefined,
        )
      }

      return true
    })
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Derive TokenInfo by scanning factory contract events for a given token address.
   */
  private async _getTokenInfoByAddress(tokenAddress: string): Promise<TokenInfo> {
    const contractId = STELLAR_CONFIG.factoryContractId
    if (!contractId) {
      return {
        name: tokenAddress,
        symbol: '—',
        decimals: 7,
        totalSupply: '0',
        creator: '',
        createdAt: 0,
      }
    }

    const { events } = await this.getContractEvents(contractId, 100)
    const tokenEvents = events.filter((e) => e.data.tokenAddress === tokenAddress)

    if (!tokenEvents.length) throw new Error(`Token not found: ${tokenAddress}`)

    const creationEvent = tokenEvents.find((e) => e.type === 'token_created')
    const metadataEvent = [...tokenEvents]
      .filter((e) => e.type === 'metadata_set')
      .sort((a, b) => b.ledger - a.ledger)[0]

    let supply = 0n
    for (const e of tokenEvents) {
      if (e.type === 'tokens_minted') supply += BigInt(e.data.amount ?? '0')
      if (e.type === 'tokens_burned') supply -= BigInt(e.data.amount ?? '0')
    }

    return {
      name: tokenAddress,
      symbol: '—',
      decimals: 7,
      totalSupply: supply.toString(),
      creator: creationEvent?.data.creator ?? '',
      createdAt: creationEvent?.timestamp ?? 0,
      ...(metadataEvent?.data.metadataUri ? { metadataUri: metadataEvent.data.metadataUri } : {}),
    }
  }

  async getTokensByCreator(creator: string): Promise<TokenInfo[]> {
    const contractId = STELLAR_CONFIG.factoryContractId
    if (!contractId) return []

    const { events } = await this.getContractEvents(contractId, 100)
    const results: TokenInfo[] = []

    for (const event of events) {
      if (event.type === 'token_created' && event.data.creator === creator) {
        const tokenAddress = event.data.tokenAddress
        if (!tokenAddress) continue
        try {
          const info = await this._getTokenInfoByAddress(tokenAddress)
          results.push(info)
        } catch {
          // skip tokens that fail to load
        }
      }
    }

    return results
  }

  async getContractEvents(
    contractId: string,
    limit = 20,
    cursor?: string,
  ): Promise<GetEventsResult> {
    const params: Record<string, unknown> = {
      filters: [{ type: 'contract', contractIds: [contractId] }],
      pagination: { limit, ...(cursor ? { cursor } : {}) },
    }

    const result = await rpcCall<RpcGetEventsResult>('getEvents', params, this.network)

    const parsed = await Promise.all(result.events.map(parseRpcEvent))
    const events = parsed
      .filter((e): e is ContractEvent => e !== null)
      .sort((a, b) => b.ledger - a.ledger)

    const lastEvent = result.events[result.events.length - 1]
    return { events, cursor: lastEvent?.pagingToken ?? null }
  }

  async updateFees(params: { baseFee: string; metadataFee: string }): Promise<string> {
    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('Factory contract ID is not configured')

      const sourceAddress = walletService.getConnectedAddress()
      if (!sourceAddress) throw new Error('Wallet not connected')

      const server = getRpcServer(this.network)
      const contract = new Contract(contractId)

      const txBuilder = await buildTxBuilder(server, sourceAddress, this.network)
      const tx = txBuilder
        .addOperation(
          contract.call(
            'update_fees',
            new Address(sourceAddress).toScVal(),
            nativeToScVal(BigInt(params.baseFee), { type: 'i128' }),
            nativeToScVal(BigInt(params.metadataFee), { type: 'i128' }),
          ),
        )
        .setTimeout(30)
        .build()

      return await simulateAndSubmit(server, tx, this.network)
    } catch (err) {
      throw parseContractError(err)
    }
  }

  async getAllTokens(): Promise<TokenInfo[]> {
    return []
  }
}

export const stellarService = new StellarService()
