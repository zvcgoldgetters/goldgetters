import { test, expect } from './fixtures';
import { HomePage } from './pages/home-page';
import { ContactPage } from './pages/contact-page';

test('header navigation opens contact page and logo returns home', async ({
  page,
}) => {
  const homePage = new HomePage(page);
  const contactPage = new ContactPage(page);

  await homePage.goto();
  await homePage.contactNavLink.click();

  await expect(page).toHaveURL('/contact');
  await expect(contactPage.heading).toBeVisible();

  await homePage.logoLink.click();
  await expect(page).toHaveURL('/');
  await expect(homePage.mainHeading).toBeVisible();
});

test('theme toggle updates html theme class', async ({ page }) => {
  const homePage = new HomePage(page);
  const html = page.locator('html');

  await homePage.goto();

  const hadDarkClassBefore = /\bdark\b/.test(
    (await html.getAttribute('class')) ?? '',
  );

  await homePage.themeToggle.click();

  if (hadDarkClassBefore) {
    await expect(html).not.toHaveClass(/\bdark\b/);
    return;
  }

  await expect(html).toHaveClass(/\bdark\b/);
});
