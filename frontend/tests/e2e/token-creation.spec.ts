import { test, expect, type Page } from '@playwright/test';
import { mockFreighter } from './helpers/wallet-mock';
import { fundAccount } from './helpers/e2e-setup';

test.describe('Token Creation', () => {
  const TEST_ADDRESS = 'GCV6L3B2R6G2H5J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4';

  test.beforeEach(async ({ page }: { page: Page }) => {
    // 1. Mock Freighter
    await mockFreighter(page, TEST_ADDRESS);
    
    // 2. Fund the test account on the local testnet (optional but good practice)
    try {
      await fundAccount(TEST_ADDRESS);
    } catch (e) {
      console.warn('Friendbot funding failed (normal if already funded):', e);
    }

    // 3. Navigate and connect
    await page.goto('/');
    await page.getByRole('button', { name: /Connect Wallet/i }).click();
  });

  test('should create a new token successfully', async ({ page }: { page: Page }) => {
    // 1. Navigate to Create Token page
    await page.getByRole('link', { name: /Create Token/i }).first().click();

    // 2. Fill the form
    await page.getByLabel(/Token Name/i).fill('Test Token');
    await page.getByLabel(/Token Symbol/i).fill('TST');
    await page.getByLabel(/Initial Supply/i).fill('1000');
    await page.getByLabel(/Decimals/i).fill('7');

    // 3. Submit the form
    const createButton = page.getByRole('button', { name: /Create/i });
    await createButton.click();

    // 4. Verify success state
    // This could be a success message or redirect to dashboard
    await expect(page.getByText(/Token created successfully/i)).toBeVisible();
    
    // 5. Verify the token appears in the dashboard
    await expect(page.getByText('Test Token')).toBeVisible();
    await expect(page.getByText('TST')).toBeVisible();
  });
});
