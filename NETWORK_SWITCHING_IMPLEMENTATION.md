# Runtime Network Switching Implementation

## Overview
This document describes the implementation of runtime network switching for the Stellar Forge dApp, allowing users to toggle between testnet and mainnet without reloading the page.

## Changes Made

### 1. **Network-Aware Services** (`src/services/stellar.ts`)
- Modified `StellarService` class to accept and store network as a constructor parameter
- Added `setNetwork(network)` method to update the active network
- Updated all network-dependent functions to accept network parameter:
  - `getNetworkConfig(network)`
  - `getNetworkPassphrase(network)`
  - `getRpcServer(network)`
  - `getRpcUrl(network)`
- Updated transaction functions to pass network through the call chain:
  - `simulateAndSubmit(server, tx, network)`
  - `buildTxBuilder(server, sourceAddress, network)`
  - `callView(..., network)`
  - `rpcCall(..., network)`
  - `buildFeeBumpTransaction(..., network)`
  - `submitFeeBumpTransaction(..., network)`

### 2. **Wallet Service Updates** (`src/services/wallet.ts`)
- Modified `signTransaction(xdr, network)` to accept network parameter
- Modified `getBalance(address, network)` to accept network parameter
- Both methods now use the provided network to determine correct Horizon/Freighter configuration
- Imported `NETWORK_CONFIGS` for direct network config access

### 3. **Reactive StellarContext** (`src/context/StellarContext.tsx`)
- Added `useNetwork()` hook to access current network from NetworkContext
- Changed `useMemo` dependency array from `[]` to `[network]`
- StellarService is now recreated whenever network changes
- This ensures all contract calls use the correct RPC endpoint

### 4. **Network-Aware WalletContext** (`src/context/WalletContext.tsx`)
- Added `useNetwork()` hook to access current network
- Added `useEffect` to refresh wallet balance when network changes
- `fetchBalance()` now passes network to `walletService.getBalance()`
- Balance automatically updates when user switches networks

### 5. **Enhanced NetworkSwitcher Component** (`src/components/NetworkSwitcher.tsx`)
- Added testnet emoji badge (🧪) to visually distinguish testnet
- Improved UI with better visual feedback
- Maintained mainnet confirmation dialog for safety
- Added LABELS constant for network display names
- Dropdown shows current network with checkmark

### 6. **App.tsx Fixes**
- Added missing imports: `StellarProvider`, `Routes`, `Route`, `Navigate`, `useState`
- Added `showFriendbotBanner` state for testnet banner
- Properly structured provider hierarchy

## Architecture

### Provider Hierarchy
```
ErrorBoundary
  → NetworkProvider (manages current network state + localStorage)
    → StellarProvider (recreates services on network change)
      → WalletProvider (refreshes balance on network change)
        → ToastProvider
          → TosProvider
            → AppContent
```

### Data Flow
1. User clicks NetworkSwitcher dropdown
2. Selects new network (with mainnet confirmation)
3. `NetworkContext.switchNetwork()` updates state + localStorage
4. `StellarContext` detects network change via dependency array
5. New `StellarService` instance created with new network
6. `WalletContext` detects network change
7. Balance is refreshed using new network's Horizon URL
8. All subsequent contract calls use new RPC endpoint

## Acceptance Criteria Met

✅ **Users can switch between testnet and mainnet from the UI without reloading**
- NetworkSwitcher component in header allows instant switching
- State persists in localStorage
- No page reload required

✅ **The correct Horizon and Soroban RPC URLs are used after switching**
- StellarService recreated with new network
- WalletService methods accept network parameter
- All RPC calls use network-specific endpoints

✅ **A 'TESTNET' badge is visible when on testnet**
- NetworkSwitcher shows 🧪 emoji + "Testnet" label
- Yellow background color for testnet
- Green background color for mainnet

✅ **A confirmation dialog is shown before switching to mainnet**
- MainnetConfirmationModal appears when selecting mainnet
- Warning message about real funds
- User must explicitly confirm

## Testing Checklist

- [ ] Switch from testnet to mainnet - confirmation dialog appears
- [ ] Switch from mainnet to testnet - no confirmation needed
- [ ] After switching, balance updates correctly
- [ ] Contract calls use correct RPC endpoint
- [ ] Network preference persists after page reload
- [ ] Testnet badge visible when on testnet
- [ ] Mainnet badge visible when on mainnet
- [ ] Wallet remains connected after network switch
- [ ] Freighter network mismatch error handled gracefully

## Future Enhancements

1. Add network indicator in transaction status
2. Show network-specific contract addresses
3. Add network-specific fee estimates
4. Implement network health status indicator
5. Add network-specific documentation links
