import { test, expect } from './fixtures';

const OK_STATUS = 200;

test('Payload admin launches', async ({ page }) => {
  const response = await page.goto('/admin');

  expect(response?.status()).toBe(OK_STATUS);
  await expect(page).toHaveURL(/\/admin\/(?:login|create-first-user)/);
  await expect(page.getByRole('heading')).toBeVisible();
});
