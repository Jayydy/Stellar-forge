import { test, expect, type Page } from '@playwright/test';
import { mockFreighter } from './helpers/wallet-mock';
import { fundAccount } from './helpers/e2e-setup';

test.describe('Token Metadata', () => {
  const TEST_ADDRESS = 'GCV6L3B2R6G2H5J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4';

  test.beforeEach(async ({ page }: { page: Page }) => {
    await mockFreighter(page, TEST_ADDRESS);
    try {
      await fundAccount(TEST_ADDRESS);
    } catch (e) {
      console.warn('Friendbot funding failed:', e);
    }
    await page.goto('/');
    await page.getByRole('button', { name: /Connect Wallet/i }).click();
  });

  test('should create token and upload metadata', async ({ page }: { page: Page }) => {
    // 1. Create a token first
    await page.getByRole('link', { name: /Create Token/i }).first().click();
    await page.getByLabel(/Token Name/i).fill('Meta Token');
    await page.getByLabel(/Token Symbol/i).fill('META');
    await page.getByLabel(/Initial Supply/i).fill('100');
    await page.getByLabel(/Decimals/i).fill('7');
    await page.getByRole('button', { name: /Create/i }).click();

    await expect(page.getByText(/Token created successfully/i)).toBeVisible();

    // 2. Go to Token Detail page (it usually redirects or we can click it)
    await page.getByText('Meta Token').click();

    // 3. Open Set Metadata form
    await page.getByRole('button', { name: /Set Metadata/i }).click();

    // 4. Fill metadata
    await page.getByLabel(/Metadata URI/i).fill('ipfs://QmTest123456789');
    
    // In a real E2E with full IPFS integration we might upload a file,
    // but here we are testing the contract interaction via the UI.
    
    await page.getByRole('button', { name: /Save Metadata/i }).click();

    // 5. Verify metadata appears on the page
    await expect(page.getByText(/Metadata URI set/i)).toBeVisible();
    await expect(page.getByText('ipfs://QmTest123456789')).toBeVisible();
  });
});
