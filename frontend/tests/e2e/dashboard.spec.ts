import { test, expect, type Page } from '@playwright/test';
import { mockFreighter } from './helpers/wallet-mock';

test.describe('Token Dashboard', () => {
  const TEST_ADDRESS = 'GCV6L3B2R6G2H5J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4';

  test.beforeEach(async ({ page }: { page: Page }) => {
    // 1. Mock Freighter
    await mockFreighter(page, TEST_ADDRESS);
    
    // 2. Navigate and connect
    await page.goto('/');
    await page.getByRole('button', { name: /Connect Wallet/i }).click();
  });

  test('should load dashboard and display tokens', async ({ page }: { page: Page }) => {
    // 1. Navigate to Dashboard
    await page.getByRole('link', { name: /My Tokens|Dashboard/i }).first().click();

    // 2. Verify dashboard header
    await expect(page.getByRole('heading', { name: /My Tokens|Dashboard/i })).toBeVisible();

    // 3. Verify that at least some content is loaded (could be empty state)
    // Adjust based on actual UI
    const tokenList = page.locator('.token-list-container');
    await expect(tokenList).toBeVisible();
    
    // 4. Check for 'No tokens found' if nothing is created yet
    // or specific tokens if seeded
  });
});
