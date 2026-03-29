import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { HomePage } from './pages/home-page';
import { ContactPage } from './pages/contact-page';

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));

  expect(widths.docScrollWidth).toBeLessThanOrEqual(widths.innerWidth + 1);
  expect(widths.bodyScrollWidth).toBeLessThanOrEqual(widths.innerWidth + 1);
}

test('header navigation opens contact page and logo returns home', async ({
  page,
}) => {
  const homePage = new HomePage(page);
  const contactPage = new ContactPage(page);

  await homePage.goto();
  await homePage.contactNavLink.click();

  await expect(page).toHaveURL('/contact');
  await expect(contactPage.heading).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await homePage.logoLink.click();
  await expect(page).toHaveURL('/');
  await expect(homePage.mainHeading).toBeVisible();
});

test('hero CTA opens contact page', async ({ page }) => {
  const homePage = new HomePage(page);
  const contactPage = new ContactPage(page);

  await homePage.goto();
  await homePage.heroContactCtaLink.click();

  await expect(page).toHaveURL('/contact');
  await expect(contactPage.heading).toBeVisible();
  await expectNoHorizontalOverflow(page);
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
