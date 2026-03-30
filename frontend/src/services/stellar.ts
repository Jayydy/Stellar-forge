// Stellar SDK integration service
import { STELLAR_CONFIG, NETWORK_CONFIGS } from '../config/stellar'
import { walletService } from './wallet'
import type {
  AppError,
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
import { parseContractError } from '../utils/contractErrors'

export type { FactoryState } from '../types'

// ── Utilities ─────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const h = hex.padEnd(64, '0').slice(0, 64)
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** Convert a raw error into the project's AppError shape. */
function toAppError(err: unknown): AppError {
  const parsed = parseContractError(err)
  return { code: 'CONTRACT_ERROR', message: parsed.message }
}

// ── Network helpers ───────────────────────────────────────────────────────────

function getNetworkConfig(network: 'testnet' | 'mainnet') {
  return NETWORK_CONFIGS[network]
}

function getNetworkPassphrase(network: 'testnet' | 'mainnet'): string {
  return network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET
}

function getRpcServer(network: 'testnet' | 'mainnet'): rpc.Server {
  return new rpc.Server(getNetworkConfig(network).sorobanRpcUrl, { allowHttp: false })
}

// ── Transaction lifecycle ─────────────────────────────────────────────────────

/**
 * Simulate, sign via Freighter, submit, and poll until confirmed.
 * Returns the transaction hash on success.
 */
async function simulateAndSubmit(
  server: rpc.Server,
  tx: ReturnType<TransactionBuilder['build']>,
  network: 'testnet' | 'mainnet',
): Promise<string> {
  const simResult = await server.simulateTransaction(tx)

  if (rpc.Api.isSimulationError(simResult)) {
    throw parseContractError(new Error(simResult.error))
  }
  if (!rpc.Api.isSimulationSuccess(simResult)) {
    throw new Error('Transaction simulation returned an unexpected result')
  }

  const assembled = rpc.assembleTransaction(tx, simResult).build()
  const signedXdr = await walletService.signTransaction(assembled.toXDR(), network)

  const submitResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase(network)),
  )

  if (submitResult.status === 'ERROR') {
    throw parseContractError(
      new Error(submitResult.errorResult?.toXDR('base64') ?? 'Submission failed'),
    )
  }

  await pollTransaction(server, submitResult.hash)
  return submitResult.hash
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
    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) return result
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw parseContractError(new Error(`Transaction failed: ${hash}`))
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(`Transaction ${hash} timed out after ${maxAttempts} attempts`)
}

// ── Fee Bump Transactions ─────────────────────────────────────────────────────

/**
 * Wrap a signed inner transaction in a fee bump envelope.
 * The fee-source account (connected via Freighter) signs the bump.
 */
export async function buildFeeBumpTransaction(
  innerTxXdr: string,
  feeSource: string,
  network: 'testnet' | 'mainnet',
  baseFee: string = String(Number(BASE_FEE) * 10),
): Promise<string> {
  const networkPassphrase = getNetworkPassphrase(network)
  const innerTx = TransactionBuilder.fromXDR(innerTxXdr, networkPassphrase) as Transaction
  const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
    feeSource,
    baseFee,
    innerTx,
    networkPassphrase,
  )
  return walletService.signTransaction(feeBumpTx.toXDR(), network)
}

/**
 * Submit a signed fee bump transaction and wait for confirmation.
 */
export async function submitFeeBumpTransaction(
  signedFeeBumpXdr: string,
  network: 'testnet' | 'mainnet',
): Promise<string> {
  const server = getRpcServer(network)
  const feeBumpTx = TransactionBuilder.fromXDR(
    signedFeeBumpXdr,
    getNetworkPassphrase(network),
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

// ── Shared builder helper ─────────────────────────────────────────────────────

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

// ── View function helper ──────────────────────────────────────────────────────

/**
 * Call a read-only contract function via simulation (no signing required).
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

// ── Raw RPC types ─────────────────────────────────────────────────────────────

interface RpcEventResponse {
  id: string
  type: string
  ledger: number
  ledgerClosedAt: string
  contractId: string
  pagingToken: string
  inSuccessfulContractCall: boolean
  txHash: string
  topic: string[]
  value: string
}

interface RpcGetEventsResult {
  events: RpcEventResponse[]
  latestLedger: number
}

// ── XDR decode helper ─────────────────────────────────────────────────────────

function scValToString(val: xdr.ScVal): string {
  try {
    const type = val.switch()
    if (type === xdr.ScValType.scvAddress()) {
      const addr = val.address()
      if (addr.switch() === xdr.ScAddressType.scAddressTypeAccount()) {
        return addr.accountId().publicKey().toString()
      }
      return Array.from(addr.contractId() as Uint8Array)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
    if (type === xdr.ScValType.scvI128()) {
      const hi = BigInt(val.i128().hi().toString())
      const lo = BigInt(val.i128().lo().toString())
      return ((hi << 64n) | lo).toString()
    }
    if (type === xdr.ScValType.scvU64()) return val.u64().toString()
    if (type === xdr.ScValType.scvString()) return val.str().toString()
    if (type === xdr.ScValType.scvSymbol()) return val.sym().toString()
    if (type === xdr.ScValType.scvBool()) return val.b().toString()
    if (type === xdr.ScValType.scvVoid()) return 'none'
    if (type === xdr.ScValType.scvVec()) {
      return (val.vec() ?? []).map((v) => scValToString(v)).join(', ')
    }
    return val.toXDR('base64')
  } catch {
    return ''
  }
}

// ── Event parsing ─────────────────────────────────────────────────────────────

const EVENT_TOPICS: ContractEventType[] = [
  'token_created',
  'tokens_minted',
  'tokens_burned',
  'metadata_set',
  'fees_updated',
]

async function parseRpcEvent(raw: RpcEventResponse): Promise<ContractEvent | null> {
  try {
    if (!raw.topic?.length) return null
    const topicVal = xdr.ScVal.fromXDR(raw.topic[0], 'base64')
    const eventType = scValToString(topicVal) as ContractEventType
    if (!EVENT_TOPICS.includes(eventType)) return null

    const items: xdr.ScVal[] = xdr.ScVal.fromXDR(raw.value, 'base64').vec() ?? []
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
      timestamp: raw.ledgerClosedAt
        ? Math.floor(new Date(raw.ledgerClosedAt).getTime() / 1000)
        : 0,
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
    const res = await fetch(getNetworkConfig(network).sorobanRpcUrl, {
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
      const errorMsg: string = json.error.message ?? 'RPC error'
      if (errorMsg.toLowerCase().includes('rate limit')) throw new HttpError(429, errorMsg)
      throw new Error(errorMsg)
    }
    return json.result as T
  })
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

  // ── deployToken ─────────────────────────────────────────────────────────────

  /**
   * Build and submit a `create_token` invocation to the factory contract.
   * Waits for transaction inclusion and returns the new contract ID.
   */
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

      const tx = (await buildTxBuilder(server, sourceAddress, this.network))
        .addOperation(
          contract.call(
            'create_token',
            new Address(sourceAddress).toScVal(),
            nativeToScVal(hexToBytes(params.salt), { type: 'bytes' }),
            nativeToScVal(hexToBytes(params.tokenWasmHash), { type: 'bytes' }),
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

      // Extract the returned token address from the transaction result
      const txResult = await server.getTransaction(hash)
      let tokenAddress = ''
      if (txResult.status === rpc.Api.GetTransactionStatus.SUCCESS && txResult.returnValue) {
        tokenAddress = scValToNative(txResult.returnValue) as string
      }

      return { tokenAddress, transactionHash: hash, success: true }
    } catch (err) {
      const appErr = toAppError(err)
      throw new Error(appErr.message)
    }
  }

  // ── mintTokens ──────────────────────────────────────────────────────────────

  /**
   * Invoke `mint_tokens` on the factory contract for the given token address.
   * `amount` and `feePayment` are decimal string representations of i128 values.
   */
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

      const tx = (await buildTxBuilder(server, sourceAddress, this.network))
        .addOperation(
          contract.call(
            'mint_tokens',
            new Address(params.tokenAddress).toScVal(),  // token_address
            new Address(sourceAddress).toScVal(),         // admin (caller)
            new Address(params.to).toScVal(),             // to
            nativeToScVal(BigInt(params.amount), { type: 'i128' }),
            nativeToScVal(BigInt(params.feePayment), { type: 'i128' }),
          ),
        )
        .setTimeout(30)
        .build()

      return await simulateAndSubmit(server, tx, this.network)
    } catch (err) {
      const appErr = toAppError(err)
      throw new Error(appErr.message)
    }
  }

  // ── burnTokens ──────────────────────────────────────────────────────────────

  /**
   * Invoke `burn` on the factory contract.
   * `amount` is a decimal string representation of an i128 value.
   */
  async burnTokens(params: { tokenAddress: string; amount: string }): Promise<string> {
    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('Factory contract ID is not configured')

      const sourceAddress = walletService.getConnectedAddress()
      if (!sourceAddress) throw new Error('Wallet not connected')

      const server = getRpcServer(this.network)
      const contract = new Contract(contractId)

      const tx = (await buildTxBuilder(server, sourceAddress, this.network))
        .addOperation(
          contract.call(
            'burn',
            new Address(params.tokenAddress).toScVal(), // token_address
            new Address(sourceAddress).toScVal(),        // from (caller)
            nativeToScVal(BigInt(params.amount), { type: 'i128' }),
          ),
        )
        .setTimeout(30)
        .build()

      return await simulateAndSubmit(server, tx, this.network)
    } catch (err) {
      const appErr = toAppError(err)
      throw new Error(appErr.message)
    }
  }

  // ── setMetadata ─────────────────────────────────────────────────────────────

  /**
   * Invoke `set_metadata` on the factory contract.
   * `feePayment` is a decimal string representation of an i128 value.
   */
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

      const tx = (await buildTxBuilder(server, sourceAddress, this.network))
        .addOperation(
          contract.call(
            'set_metadata',
            new Address(params.tokenAddress).toScVal(), // token_address
            new Address(sourceAddress).toScVal(),        // admin (caller)
            nativeToScVal(params.metadataUri, { type: 'string' }),
            nativeToScVal(BigInt(params.feePayment), { type: 'i128' }),
          ),
        )
        .setTimeout(30)
        .build()

      return await simulateAndSubmit(server, tx, this.network)
    } catch (err) {
      const appErr = toAppError(err)
      throw new Error(appErr.message)
    }
  }

  // ── getTokenInfo ────────────────────────────────────────────────────────────

  /**
   * Perform a read-only RPC simulation of `get_token_info` on the factory
   * contract and map the response to the local TokenInfo interface.
   */
  async getTokenInfo(index: number): Promise<TokenInfo> {
    const contractId = STELLAR_CONFIG.factoryContractId
    if (!contractId) throw new Error('Factory contract ID is not configured')

    const sourceAddress = walletService.getConnectedAddress()
    if (!sourceAddress) throw new Error('Wallet not connected')

    try {
      const server = getRpcServer(this.network)
      const retval = await callView(
        server,
        contractId,
        'get_token_info',
        [nativeToScVal(index, { type: 'u32' })],
        sourceAddress,
        this.network,
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const native = scValToNative(retval) as any
      return {
        name: String(native.name ?? ''),
        symbol: String(native.symbol ?? ''),
        decimals: Number(native.decimals ?? 7),
        creator: native.creator?.toString() ?? '',
        createdAt: Number(native.created_at ?? 0),
        totalSupply: native.total_supply?.toString(),
      }
    } catch (err) {
      const appErr = toAppError(err)
      throw new Error(appErr.message)
    }
  }

  // ── getTransaction ──────────────────────────────────────────────────────────

  /**
   * Fetch transaction details from the Horizon server using the transaction hash.
   */
  async getTransaction(hash: string): Promise<Record<string, unknown>> {
    try {
      return await withRetry(async () => {
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
        return res.json() as Promise<Record<string, unknown>>
      })
    } catch (err) {
      const appErr = toAppError(err)
      throw new Error(appErr.message)
    }
  }

  // ── getFactoryState ─────────────────────────────────────────────────────────

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
      const appErr = toAppError(err)
      throw new Error(appErr.message)
    }
  }

  // ── accountExists ───────────────────────────────────────────────────────────

  async accountExists(address: string): Promise<boolean> {
    return withRetry(async () => {
      const { horizonUrl } = getNetworkConfig(this.network)
      const res = await fetch(`${horizonUrl}/accounts/${address}`)
      if (res.status === 404) return false
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

  // ── updateFees ──────────────────────────────────────────────────────────────

  async updateFees(params: { baseFee: string; metadataFee: string }): Promise<string> {
    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('Factory contract ID is not configured')

      const sourceAddress = walletService.getConnectedAddress()
      if (!sourceAddress) throw new Error('Wallet not connected')

      const server = getRpcServer(this.network)
      const contract = new Contract(contractId)

      // Contract expects Option<i128> — wrap each value in Some(i128)
      const someI128 = (v: bigint) =>
        xdr.ScVal.scvVec([
          xdr.ScVal.scvSymbol('Some'),
          nativeToScVal(v, { type: 'i128' }),
        ])

      const tx = (await buildTxBuilder(server, sourceAddress, this.network))
        .addOperation(
          contract.call(
            'update_fees',
            new Address(sourceAddress).toScVal(),
            someI128(BigInt(params.baseFee)),
            someI128(BigInt(params.metadataFee)),
          ),
        )
        .setTimeout(30)
        .build()

      return await simulateAndSubmit(server, tx, this.network)
    } catch (err) {
      const appErr = toAppError(err)
      throw new Error(appErr.message)
    }
  }

  // ── getContractEvents ───────────────────────────────────────────────────────

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

  // ── getAllTokens ─────────────────────────────────────────────────────────────

  async getAllTokens(): Promise<TokenInfo[]> {
    return []
  }

  /**
   * Get all events for a specific token address.
   * Filters factory events to only those related to the given token.
   */
  async getTokenEvents(
    tokenAddress: string,
    limit = 20,
    cursor?: string,
  ): Promise<GetEventsResult> {
    const contractId = STELLAR_CONFIG.factoryContractId
    if (!contractId) {
      return { events: [], cursor: null }
    }

    // Fetch events from the factory contract
    const result = await this.getContractEvents(contractId, limit, cursor)

    // Filter to only events related to this token
    const tokenEvents = result.events.filter(
      (event) => event.data.tokenAddress === tokenAddress,
    )

    return {
      events: tokenEvents,
      cursor: result.cursor,
    }
  }
}

export const stellarService = new StellarService()
