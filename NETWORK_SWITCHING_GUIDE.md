# Network Switching - Developer Guide

## Quick Start

The network switching feature is now fully integrated. Users can switch between testnet and mainnet from the UI header without reloading the page.

## How It Works

### For Users
1. Click the network badge in the top-right header (yellow for testnet, green for mainnet)
2. Select desired network from dropdown
3. If switching to mainnet, confirm the warning dialog
4. Network switches instantly, balance updates automatically

### For Developers

#### Using Network Context
```typescript
import { useNetwork } from './context/NetworkContext'

function MyComponent() {
  const { network, switchNetwork, rpcUrl, horizonUrl, networkPassphrase } = useNetwork()
  
  // network: 'testnet' | 'mainnet'
  // switchNetwork(network): void
  // rpcUrl: string (Soroban RPC URL)
  // horizonUrl: string (Horizon API URL)
  // networkPassphrase: string (for transaction signing)
}
```

#### Using Stellar Service
```typescript
import { useStellarContext } from './context/StellarContext'

function MyComponent() {
  const { stellarService } = useStellarContext()
  
  // stellarService is automatically network-aware
  // It's recreated whenever network changes
  const result = await stellarService.deployToken({...})
}
```

#### Using Wallet Service
```typescript
import { walletService } from './services/wallet'
import { useNetwork } from './context/NetworkContext'

function MyComponent() {
  const { network } = useNetwork()
  
  // Pass network to wallet service methods
  const balance = await walletService.getBalance(address, network)
  const signedXdr = await walletService.signTransaction(xdr, network)
}
```

## Key Implementation Details

### Network Persistence
- Network selection is stored in localStorage under key `stellarforge_network`
- Persists across page reloads
- Falls back to `VITE_NETWORK` env var if not set

### Service Recreation
- `StellarService` is recreated when network changes (via StellarContext)
- This ensures all RPC calls use the correct endpoint
- Wallet balance is refreshed automatically

### Error Handling
- Network mismatch errors from Freighter are caught and displayed
- User is prompted to switch Freighter to the correct network
- Balance fetch failures are logged but don't break the app

## Testing Network Switching

### Manual Testing
```bash
# Start dev server
npm run dev

# In browser:
1. Connect wallet
2. Note current balance
3. Click network badge
4. Switch to different network
5. Verify balance updates
6. Try creating/minting tokens
7. Verify transactions use correct network
```

### Checking Network in DevTools
```javascript
// In browser console
localStorage.getItem('stellarforge_network') // 'testnet' or 'mainnet'
```

## Common Issues & Solutions

### Issue: Balance doesn't update after network switch
**Solution**: Check that WalletContext has `useNetwork()` hook and balance refresh effect

### Issue: Transactions fail with network mismatch
**Solution**: Ensure `walletService.signTransaction()` receives correct network parameter

### Issue: RPC calls go to wrong endpoint
**Solution**: Verify StellarService is being recreated (check React DevTools Profiler)

## Files Modified

1. `src/services/stellar.ts` - Network-aware RPC calls
2. `src/services/wallet.ts` - Network parameter in signing/balance
3. `src/context/StellarContext.tsx` - Service recreation on network change
4. `src/context/WalletContext.tsx` - Balance refresh on network change
5. `src/components/NetworkSwitcher.tsx` - Enhanced UI with testnet badge
6. `src/App.tsx` - Added missing imports

## Environment Variables

No new environment variables needed. Existing `VITE_NETWORK` is used as fallback.

## Performance Considerations

- StellarService recreation is lightweight (just creates new instance)
- RPC Server instances are created on-demand (not cached)
- Balance refresh is debounced by React's effect cleanup
- No unnecessary re-renders due to proper dependency arrays

## Security Notes

- Mainnet switching requires explicit user confirmation
- Network selection is client-side only (no server calls)
- Freighter handles actual network validation
- All transactions are signed by user's wallet
