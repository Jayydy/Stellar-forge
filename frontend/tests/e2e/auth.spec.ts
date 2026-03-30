import { test, expect } from '@playwright/test';
import { mockFreighter } from './helpers/wallet-mock';

test.describe('Wallet Connection', () => {
  const TEST_ADDRESS = 'GCV6L3B2R6G2H5J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4';

  test('should connect wallet and display address', async ({ page }) => {
    // 1. Mock Freighter
    await mockFreighter(page, TEST_ADDRESS);

    // 2. Navigate to the app
    await page.goto('/');

    // 3. Find and click the "Connect Wallet" button
    const connectButton = page.getByRole('button', { name: /Connect Wallet/i });
    await expect(connectButton).toBeVisible();
    await connectButton.click();

    // 4. Verify that the address is displayed (or a portion of it)
    await expect(page.getByText(TEST_ADDRESS.substring(0, 4))).toBeVisible();
    await expect(page.getByText(TEST_ADDRESS.substring(48))).toBeVisible();
  });

  test('should disconnect wallet', async ({ page }) => {
    // 1. Mock Freighter and connect
    await mockFreighter(page, TEST_ADDRESS);
    await page.goto('/');
    await page.getByRole('button', { name: /Connect Wallet/i }).click();

    // 2. Verify connected
    await expect(page.getByText(TEST_ADDRESS.substring(0, 4))).toBeVisible();

    // 3. Click disconnect button (assuming it appears after connection)
    // You might need to adjust the selector based on the actual UI
    const disconnectButton = page.getByRole('button', { name: /Disconnect/i }).first();
    await disconnectButton.click();

    // 4. Verify "Connect Wallet" button is back
    await expect(page.getByRole('button', { name: /Connect Wallet/i })).toBeVisible();
  });
});
