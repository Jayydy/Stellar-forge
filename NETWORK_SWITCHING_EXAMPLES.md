# Network Switching - Code Examples

## Using Network Context

### Example 1: Display Current Network
```typescript
import { useNetwork } from './context/NetworkContext'

export function NetworkDisplay() {
  const { network } = useNetwork()
  
  return (
    <div>
      Current Network: {network === 'testnet' ? '🧪 Testnet' : '🌐 Mainnet'}
    </div>
  )
}
```

### Example 2: Get Network Configuration
```typescript
import { useNetwork } from './context/NetworkContext'

export function NetworkInfo() {
  const { network, rpcUrl, horizonUrl, networkPassphrase } = useNetwork()
  
  return (
    <div>
      <p>Network: {network}</p>
      <p>RPC URL: {rpcUrl}</p>
      <p>Horizon URL: {horizonUrl}</p>
      <p>Passphrase: {networkPassphrase}</p>
    </div>
  )
}
```

### Example 3: Switch Network Programmatically
```typescript
import { useNetwork } from './context/NetworkContext'

export function NetworkSwitchButton() {
  const { network, switchNetwork } = useNetwork()
  
  const handleSwitch = () => {
    const newNetwork = network === 'testnet' ? 'mainnet' : 'testnet'
    switchNetwork(newNetwork)
  }
  
  return (
    <button onClick={handleSwitch}>
      Switch to {network === 'testnet' ? 'Mainnet' : 'Testnet'}
    </button>
  )
}
```

---

## Using Stellar Service

### Example 1: Deploy Token (Network-Aware)
```typescript
import { useStellarContext } from './context/StellarContext'
import { useNetwork } from './context/NetworkContext'

export function DeployTokenForm() {
  const { stellarService } = useStellarContext()
  const { network } = useNetwork()
  
  const handleDeploy = async (params: any) => {
    try {
      // stellarService is automatically using the current network
      const result = await stellarService.deployToken(params)
      console.log(`Token deployed on ${network}:`, result.tokenAddress)
    } catch (error) {
      console.error('Deployment failed:', error)
    }
  }
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      handleDeploy({
        name: 'My Token',
        symbol: 'MTK',
        decimals: 7,
        initialSupply: '1000000',
        salt: '0'.repeat(64),
        tokenWasmHash: '0'.repeat(64),
        feePayment: '70000000'
      })
    }}>
      <button type="submit">Deploy on {network}</button>
    </form>
  )
}
```

### Example 2: Get Token Info
```typescript
import { useStellarContext } from './context/StellarContext'

export function TokenInfo({ tokenAddress }: { tokenAddress: string }) {
  const { stellarService } = useStellarContext()
  const [info, setInfo] = React.useState(null)
  
  React.useEffect(() => {
    stellarService.getTokenInfo(tokenAddress)
      .then(setInfo)
      .catch(console.error)
  }, [tokenAddress, stellarService])
  
  return info ? (
    <div>
      <p>Name: {info.name}</p>
      <p>Symbol: {info.symbol}</p>
      <p>Decimals: {info.decimals}</p>
    </div>
  ) : (
    <p>Loading...</p>
  )
}
```

### Example 3: Mint Tokens
```typescript
import { useStellarContext } from './context/StellarContext'
import { useNetwork } from './context/NetworkContext'

export function MintTokensForm({ tokenAddress }: { tokenAddress: string }) {
  const { stellarService } = useStellarContext()
  const { network } = useNetwork()
  const [amount, setAmount] = React.useState('')
  const [recipient, setRecipient] = React.useState('')
  
  const handleMint = async () => {
    try {
      const hash = await stellarService.mintTokens({
        tokenAddress,
        to: recipient,
        amount,
        feePayment: '10000000'
      })
      console.log(`Minted on ${network}:`, hash)
    } catch (error) {
      console.error('Mint failed:', error)
    }
  }
  
  return (
    <div>
      <input
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Recipient address"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />
      <button onClick={handleMint}>Mint on {network}</button>
    </div>
  )
}
```

---

## Using Wallet Service

### Example 1: Get Balance on Current Network
```typescript
import { walletService } from './services/wallet'
import { useNetwork } from './context/NetworkContext'
import React from 'react'

export function BalanceDisplay({ address }: { address: string }) {
  const { network } = useNetwork()
  const [balance, setBalance] = React.useState<string | null>(null)
  
  React.useEffect(() => {
    walletService.getBalance(address, network)
      .then(setBalance)
      .catch(console.error)
  }, [address, network])
  
  return <div>Balance: {balance} XLM</div>
}
```

### Example 2: Sign Transaction on Current Network
```typescript
import { walletService } from './services/wallet'
import { useNetwork } from './context/NetworkContext'

export function SignTransactionButton({ xdr }: { xdr: string }) {
  const { network } = useNetwork()
  
  const handleSign = async () => {
    try {
      const signedXdr = await walletService.signTransaction(xdr, network)
      console.log('Signed on', network)
      return signedXdr
    } catch (error) {
      console.error('Signing failed:', error)
    }
  }
  
  return (
    <button onClick={handleSign}>
      Sign on {network}
    </button>
  )
}
```

---

## Network-Aware Component Pattern

### Example: Complete Component with Network Awareness
```typescript
import React from 'react'
import { useNetwork } from './context/NetworkContext'
import { useStellarContext } from './context/StellarContext'
import { useWalletContext } from './context/WalletContext'

export function NetworkAwareComponent() {
  const { network, switchNetwork } = useNetwork()
  const { stellarService } = useStellarContext()
  const { wallet } = useWalletContext()
  
  const [tokens, setTokens] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  
  // Fetch tokens when network or wallet changes
  React.useEffect(() => {
    if (!wallet.isConnected || !wallet.address) return
    
    setLoading(true)
    stellarService
      .getTokensByCreator(wallet.address)
      .then(setTokens)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [network, wallet.address, stellarService])
  
  return (
    <div>
      <h2>My Tokens on {network}</h2>
      
      <button onClick={() => switchNetwork(network === 'testnet' ? 'mainnet' : 'testnet')}>
        Switch to {network === 'testnet' ? 'Mainnet' : 'Testnet'}
      </button>
      
      {loading ? (
        <p>Loading tokens...</p>
      ) : (
        <ul>
          {tokens.map(token => (
            <li key={token.name}>
              {token.name} ({token.symbol}) - {token.totalSupply}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## Error Handling

### Example: Network Mismatch Error
```typescript
import { walletService } from './services/wallet'
import { useNetwork } from './context/NetworkContext'

export function SafeTransactionSigner({ xdr }: { xdr: string }) {
  const { network } = useNetwork()
  const [error, setError] = React.useState<string | null>(null)
  
  const handleSign = async () => {
    try {
      setError(null)
      const signedXdr = await walletService.signTransaction(xdr, network)
      return signedXdr
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      
      if (message.includes('network')) {
        setError(`Please switch Freighter to ${network}`)
      } else {
        setError(message)
      }
    }
  }
  
  return (
    <div>
      <button onClick={handleSign}>Sign Transaction</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
```

---

## Testing Examples

### Example: Unit Test for Network Context
```typescript
import { render, screen } from '@testing-library/react'
import { NetworkProvider, useNetwork } from './context/NetworkContext'

function TestComponent() {
  const { network } = useNetwork()
  return <div>{network}</div>
}

test('NetworkProvider provides network', () => {
  render(
    <NetworkProvider>
      <TestComponent />
    </NetworkProvider>
  )
  
  expect(screen.getByText('testnet')).toBeInTheDocument()
})
```

### Example: Integration Test for Network Switching
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { NetworkProvider } from './context/NetworkContext'
import { StellarProvider } from './context/StellarContext'
import { NetworkSwitcher } from './components/NetworkSwitcher'

test('Network switching updates StellarService', async () => {
  render(
    <NetworkProvider>
      <StellarProvider>
        <NetworkSwitcher />
      </StellarProvider>
    </NetworkProvider>
  )
  
  const button = screen.getByRole('button')
  fireEvent.click(button)
  
  const mainnetOption = screen.getByText('Mainnet')
  fireEvent.click(mainnetOption)
  
  // Verify confirmation dialog appears
  expect(screen.getByText(/real funds/i)).toBeInTheDocument()
})
```

---

## Best Practices

### ✅ DO
```typescript
// Use useNetwork() to get current network
const { network } = useNetwork()

// Pass network to service methods
const balance = await walletService.getBalance(address, network)

// Use useStellarContext() for contract calls
const { stellarService } = useStellarContext()
const result = await stellarService.deployToken(params)

// Handle network-specific errors
if (error.includes('network')) {
  // Show network mismatch message
}
```

### ❌ DON'T
```typescript
// Don't hardcode network
const balance = await walletService.getBalance(address, 'testnet')

// Don't create StellarService manually
const service = new StellarService() // Wrong!

// Don't ignore network changes
// (Always use useEffect with network dependency)

// Don't assume network from localStorage
// (Use useNetwork() hook instead)
```

---

## Debugging

### Check Current Network
```javascript
// In browser console
localStorage.getItem('stellarforge_network')
```

### Check StellarService Network
```javascript
// In React DevTools Context Inspector
// Look at StellarContext value
```

### Monitor Network Changes
```typescript
import { useNetwork } from './context/NetworkContext'

export function NetworkMonitor() {
  const { network } = useNetwork()
  
  React.useEffect(() => {
    console.log('Network changed to:', network)
  }, [network])
  
  return null
}
```

---

## Migration Guide

### If You Have Existing Code

**Before:**
```typescript
const balance = await walletService.getBalance(address)
```

**After:**
```typescript
const { network } = useNetwork()
const balance = await walletService.getBalance(address, network)
```

**Before:**
```typescript
const service = new StellarService()
```

**After:**
```typescript
const { stellarService } = useStellarContext()
```

---

## Performance Tips

1. **Memoize network-dependent values**
   ```typescript
   const networkConfig = React.useMemo(() => ({
     rpc: getRpcUrl(network),
     horizon: getHorizonUrl(network)
   }), [network])
   ```

2. **Debounce balance refresh**
   ```typescript
   const debouncedFetchBalance = React.useMemo(
     () => debounce(fetchBalance, 500),
     []
   )
   ```

3. **Cache RPC responses**
   ```typescript
   const [cache, setCache] = React.useState({})
   const getCachedData = (key) => cache[`${network}:${key}`]
   ```
