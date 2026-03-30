# Admin Panel Testing Guide

## Prerequisites
1. Freighter wallet installed and configured
2. Development server running (`npm run dev` in frontend directory)
3. Factory contract deployed with known admin address
4. Test wallet with admin privileges

## Manual Testing Steps

### 1. Access Control Tests

#### Test 1.1: Non-connected Wallet
**Steps:**
1. Navigate to `http://localhost:5173/admin` (or your dev server URL)
2. Ensure wallet is NOT connected

**Expected Result:**
- Should see message: "Connect your wallet to access the Admin Panel."
- No form fields visible

#### Test 1.2: Non-admin User
**Steps:**
1. Connect wallet with an address that is NOT the factory admin
2. Navigate to `/admin`

**Expected Result:**
- Should see red error message: "Access denied. Only the factory admin can view this page."
- No form fields visible

#### Test 1.3: Admin User Access
**Steps:**
1. Connect wallet with the factory admin address
2. Navigate to `/admin`

**Expected Result:**
- Should see "Admin Panel" heading
- Two input fields visible: "Base Fee (XLM)" and "Metadata Fee (XLM)"
- Current fees pre-populated in XLM format
- "Submit Changes" button visible

### 2. Fee Display Tests

#### Test 2.1: Current Fees Display
**Steps:**
1. As admin, view the Admin Panel
2. Check the pre-populated values in both fee fields

**Expected Result:**
- Base Fee shows current factory base fee in XLM (7 decimal places)
- Metadata Fee shows current factory metadata fee in XLM (7 decimal places)
- Values match what's stored in the contract (converted from stroops)

**Example:**
- If contract has `baseFee = 10000000` stroops, display should show `1` XLM
- If contract has `metadataFee = 5000000` stroops, display should show `0.5` XLM

#### Test 2.2: Zero Fees
**Steps:**
1. If contract has zero fees, check display

**Expected Result:**
- Should display `0` for zero fees (not empty or error)

### 3. Fee Update Tests

#### Test 3.1: Update Single Fee
**Steps:**
1. As admin, change only the Base Fee (e.g., from 1 to 2)
2. Leave Metadata Fee unchanged
3. Click "Submit Changes"

**Expected Result:**
- Confirmation modal appears
- Modal shows: "Base Fee: 2 XLM" and "Metadata Fee: [original value] XLM"
- Click "Update Fees" to confirm
- Transaction signing prompt from Freighter
- After signing: Success toast "Fees updated successfully."
- Form refreshes with new values

#### Test 3.2: Update Both Fees
**Steps:**
1. Change both Base Fee and Metadata Fee
2. Click "Submit Changes"

**Expected Result:**
- Confirmation modal shows both new values
- Transaction succeeds
- Success toast appears
- Both fees update in the form

#### Test 3.3: Update with Decimal Values
**Steps:**
1. Enter decimal values (e.g., 1.5, 0.25, 0.0000001)
2. Submit

**Expected Result:**
- Accepts decimal values
- Converts correctly to stroops
- Transaction succeeds

### 4. Validation Tests

#### Test 4.1: Negative Fee
**Steps:**
1. Enter negative value (e.g., -1) in Base Fee
2. Click "Submit Changes"

**Expected Result:**
- Error message appears: "Must be a non-negative number."
- Confirmation modal does NOT appear
- No transaction initiated

#### Test 4.2: Invalid Input
**Steps:**
1. Enter invalid text (e.g., "abc") in fee field
2. Click "Submit Changes"

**Expected Result:**
- Error message appears
- No transaction initiated

#### Test 4.3: Empty Field
**Steps:**
1. Clear a fee field completely
2. Click "Submit Changes"

**Expected Result:**
- Validation error appears
- No transaction initiated

### 5. Transaction Flow Tests

#### Test 5.1: Successful Transaction
**Steps:**
1. Update fees with valid values
2. Confirm in modal
3. Sign transaction in Freighter
4. Wait for transaction to complete

**Expected Result:**
- Button shows "Submitting..." during transaction
- Input fields disabled during transaction
- Success toast appears: "Fees updated successfully."
- Form re-fetches and displays updated fees
- Transaction completes within 30 seconds

#### Test 5.2: Transaction Rejection
**Steps:**
1. Update fees
2. Confirm in modal
3. REJECT transaction in Freighter

**Expected Result:**
- Error toast appears with rejection message
- Form remains editable
- Original fees still displayed

#### Test 5.3: Transaction Failure
**Steps:**
1. Update fees with insufficient balance or other error condition
2. Attempt to submit

**Expected Result:**
- Error toast with descriptive message
- Form remains editable

### 6. UI/UX Tests

#### Test 6.1: Loading State
**Steps:**
1. Navigate to `/admin` while factory state is loading
2. Observe loading indicator

**Expected Result:**
- Shows "Loading factory state…" message
- No form visible during loading

#### Test 6.2: Disabled State During Transaction
**Steps:**
1. Submit a fee update
2. Observe UI during transaction processing

**Expected Result:**
- Input fields are disabled
- Submit button shows "Submitting…"
- Submit button is disabled
- Cannot edit fields until transaction completes

#### Test 6.3: Confirmation Modal
**Steps:**
1. Update fees
2. Click "Submit Changes"
3. Review confirmation modal

**Expected Result:**
- Modal title: "Confirm Fee Update"
- Shows both fee values in XLM
- "Update Fees" button to confirm
- "Cancel" button to abort
- Clicking Cancel closes modal without transaction

#### Test 6.4: Navigation Link
**Steps:**
1. Connect as admin
2. Check navigation bar

**Expected Result:**
- "Admin" link visible in nav bar (amber/yellow color)
- Link only visible when connected as admin
- Clicking link navigates to `/admin`

### 7. Edge Cases

#### Test 7.1: Very Small Fees
**Steps:**
1. Enter very small values (e.g., 0.0000001 XLM)
2. Submit

**Expected Result:**
- Accepts and converts correctly
- No precision loss

#### Test 7.2: Very Large Fees
**Steps:**
1. Enter large values (e.g., 100000 XLM)
2. Submit

**Expected Result:**
- Accepts and converts correctly
- No overflow errors

#### Test 7.3: Network Switch During Edit
**Steps:**
1. Start editing fees
2. Switch network (testnet ↔ mainnet)
3. Observe behavior

**Expected Result:**
- Form should handle network change gracefully
- May need to reconnect wallet

#### Test 7.4: Wallet Disconnect During Edit
**Steps:**
1. Start editing fees
2. Disconnect wallet
3. Observe behavior

**Expected Result:**
- Should redirect or show "connect wallet" message
- No crash or error

### 8. Accessibility Tests

#### Test 8.1: Keyboard Navigation
**Steps:**
1. Use Tab key to navigate through form
2. Use Enter to submit

**Expected Result:**
- Can navigate all fields with keyboard
- Form submits on Enter key
- Focus indicators visible

#### Test 8.2: Screen Reader
**Steps:**
1. Use screen reader to navigate Admin Panel

**Expected Result:**
- All labels properly announced
- Error messages announced
- Loading states announced (aria-live)

#### Test 8.3: Dark Mode
**Steps:**
1. Toggle dark mode
2. Review Admin Panel appearance

**Expected Result:**
- All text readable in dark mode
- Proper contrast maintained
- No visual glitches

## Automated Test Execution

To run the automated test suite:

```bash
cd frontend
npm test AdminPanel.test.tsx
```

Or run all tests:
```bash
npm test
```

For coverage report:
```bash
npm run test:coverage
```

## Test Checklist

- [ ] Non-connected wallet shows connect message
- [ ] Non-admin user sees access denied
- [ ] Admin user sees full panel
- [ ] Current fees display correctly in XLM
- [ ] Can update base fee independently
- [ ] Can update metadata fee independently
- [ ] Can update both fees together
- [ ] Negative fees rejected with error
- [ ] Invalid input rejected with error
- [ ] Confirmation modal appears before submission
- [ ] Transaction signing works via Freighter
- [ ] Success toast appears after update
- [ ] Fees refresh after successful update
- [ ] Error toast appears on failure
- [ ] Form disabled during transaction
- [ ] Admin nav link only visible to admin
- [ ] Keyboard navigation works
- [ ] Dark mode displays correctly

## Known Issues / Notes

1. PowerShell execution policy may prevent npm commands on Windows
   - Solution: Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell as admin
   
2. Freighter wallet must be on same network as app (testnet/mainnet)

3. Admin address is case-sensitive and must match exactly

## Success Criteria

All tests pass with:
- ✅ Proper access control (admin-only)
- ✅ Accurate fee display (stroops → XLM conversion)
- ✅ Successful fee updates
- ✅ Proper validation and error handling
- ✅ Good UX (loading states, confirmations, toasts)
- ✅ Accessibility compliance
