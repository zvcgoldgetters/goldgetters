import { test, expect } from './fixtures';
import { HomePage } from './pages/home-page';

test('has title', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();
  await expect(homePage.mainHeading).toBeVisible();

  await expect(page).toHaveTitle(/Goldgetters|ZVC/);
});
