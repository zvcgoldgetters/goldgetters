import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { HomePage } from './pages/home-page';

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));

  expect(widths.docScrollWidth).toBeLessThanOrEqual(widths.innerWidth + 1);
  expect(widths.bodyScrollWidth).toBeLessThanOrEqual(widths.innerWidth + 1);
}

test('has title', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();
  await expect(homePage.mainHeading).toBeVisible();
  await expect(homePage.contactNavLink).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await expect(page).toHaveTitle(/Goldgetters|ZVC/);
});
