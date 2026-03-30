# Wallet Auto-Reconnect Testing Guide

## Prerequisites
- Freighter wallet extension installed in your browser
- Frontend application running (`npm run dev`)
- Browser DevTools open (F12)

## Test Cases

### 1. Test localStorage Persistence (Auto-Reconnect)

**Steps:**
1. Open the application in your browser
2. Connect your Freighter wallet
3. Open DevTools > Application > Local Storage
4. Verify `stellar_wallet_address` key exists with your wallet address
5. Refresh the page (F5)
6. **Expected:** Wallet should automatically reconnect without clicking "Connect"
7. **Expected:** Your address should be displayed immediately

**Verification:**
- Check that the wallet address is shown in the UI
- Check that the balance is loaded
- Check DevTools Console for any errors

---

### 2. Test Account Change Detection

**Steps:**
1. Connect your wallet to the application
2. Open Freighter extension
3. Switch to a different account in Freighter
4. Return to the application
5. **Expected:** The displayed address should update automatically to the new account
6. **Expected:** The balance should refresh for the new account

**Verification:**
- The UI shows the new wallet address
- The balance updates to match the new account
- No errors in DevTools Console

---

### 3. Test Network Change Detection

**Steps:**
1. Connect your wallet to the application
2. Note the current network (testnet/mainnet)
3. Open Freighter extension
4. Switch to a different network
5. Return to the application
6. **Expected:** An error message should appear: "Network changed in Freighter. Please verify you are on the correct network."

**Verification:**
- Error message is displayed in the UI
- Wallet remains connected
- Check DevTools Console for the network change event

---

### 4. Test Disconnect Clears localStorage

**Steps:**
1. Connect your wallet
2. Open DevTools > Application > Local Storage
3. Verify `stellar_wallet_address` exists
4. Click "Disconnect" in the application
5. **Expected:** The `stellar_wallet_address` key should be removed from localStorage
6. Refresh the page
7. **Expected:** Wallet should NOT auto-reconnect

**Verification:**
- localStorage key is removed
- After refresh, wallet is disconnected
- "Connect" button is visible

---

### 5. Test isInstalled Property

**Steps:**
1. Open the application with Freighter installed
2. Open DevTools Console
3. Type: `window.freighter`
4. **Expected:** Should return an object (Freighter is installed)
5. Check the UI for wallet connection options
6. **Expected:** Connect button should be enabled

**To test without Freighter:**
1. Disable Freighter extension
2. Refresh the page
3. **Expected:** UI should indicate Freighter is not installed
4. **Expected:** Connect button should show installation prompt

---

### 6. Test Event Listener Cleanup

**Steps:**
1. Connect wallet
2. Open DevTools Console
3. Type: `getEventListeners(window)`
4. Look for `freighter:accountChanged` and `freighter:networkChanged` listeners
5. Navigate away from the page or unmount the component
6. **Expected:** Event listeners should be cleaned up (no memory leaks)

---

## Automated Test Execution

To run the automated tests:

### Option 1: Using the batch file
```bash
# Double-click test-wallet.bat
# Or run from command prompt:
test-wallet.bat
```

### Option 2: Using npm directly
```bash
cd frontend
npm test -- --run useWallet
```

### Option 3: Run all tests
```bash
cd frontend
npm test -- --run
```

---

## Expected Test Results

All tests should pass:
- ✓ starts disconnected
- ✓ connect success sets address and connected state
- ✓ connect failure sets error and stays disconnected
- ✓ disconnect resets state
- ✓ isInstalled reflects wallet installation status
- ✓ restores connection from localStorage on mount

---

## Debugging Tips

### If auto-reconnect doesn't work:
1. Check localStorage for `stellar_wallet_address`
2. Check DevTools Console for errors
3. Verify Freighter is unlocked
4. Check that `checkExistingConnection()` is being called

### If account changes aren't detected:
1. Check if `WatchWalletChanges` is available
2. Check DevTools Console for event listener errors
3. Verify Freighter version supports the API

### If network changes aren't detected:
1. Check for error message in UI
2. Check DevTools Console for network change events
3. Verify the event listener is registered

---

## Code Coverage

The implementation covers:
- ✅ localStorage persistence (save/load/clear)
- ✅ Auto-reconnect on mount
- ✅ Account change detection (WatchWalletChanges + fallback)
- ✅ Network change detection
- ✅ isInstalled property
- ✅ Event listener cleanup
- ✅ Error handling for all edge cases

---

## Files Modified

1. `frontend/src/services/wallet.ts` - Added localStorage methods
2. `frontend/src/context/WalletContext.tsx` - Added event listeners
3. `frontend/src/types/freighter.d.ts` - Added event type definitions
4. `frontend/src/hooks/useWallet.test.tsx` - Added new test cases
