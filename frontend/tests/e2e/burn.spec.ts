import { test, expect, type Page } from '@playwright/test';
import { mockFreighter } from './helpers/wallet-mock';

const TEST_ADDRESS = 'GCV6L3B2R6G2H5J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4J4';
const TEST_TOKEN = process.env.E2E_TOKEN_ADDRESS ?? 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

test.describe('Burn Flow', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await mockFreighter(page, TEST_ADDRESS);
    await page.goto('/');
    await page.getByRole('button', { name: /Connect Wallet/i }).click();
  });

  test('should burn tokens from an account', async ({ page }: { page: Page }) => {
    await page.goto('/burn');

    await page.getByLabel(/Token Address/i).fill(TEST_TOKEN);
    await page.getByLabel(/Amount/i).fill('100');

    await page.getByRole('button', { name: /Burn/i }).click();

    await expect(page.getByText(/Burn successful|burned successfully/i)).toBeVisible({ timeout: 15000 });
  });

  test('should show error for zero burn amount', async ({ page }: { page: Page }) => {
    await page.goto('/burn');

    await page.getByLabel(/Token Address/i).fill(TEST_TOKEN);
    await page.getByLabel(/Amount/i).fill('0');

    await page.getByRole('button', { name: /Burn/i }).click();

    await expect(page.getByText(/invalid|must be greater/i)).toBeVisible();
  });
});
