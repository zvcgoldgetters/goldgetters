import { test, expect } from './fixtures';
import { ContactPage } from './pages/contact-page';
import type { Page } from '@playwright/test';

async function mockTurnstile(page: Page) {
  await page.route(
    'https://challenges.cloudflare.com/turnstile/v0/api.js',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          (() => {
            window.turnstile = {
              render: (_container, options) => {
                if (options && typeof options.callback === 'function') {
                  options.callback('e2e-turnstile-token');
                }
                return 'e2e-turnstile-widget';
              },
              reset: () => {},
              remove: () => {}
            };
          })();
        `,
      });
    },
  );
}

test('contact form shows validation errors for empty submit', async ({
  page,
}) => {
  const contactPage = new ContactPage(page);

  await contactPage.goto();
  await contactPage.submitButton.click();

  await expect(page.getByText('Naam is verplicht')).toBeVisible();
  await expect(page.getByText('E-mailadres is verplicht')).toBeVisible();
  await expect(page.getByText('Onderwerp is verplicht')).toBeVisible();
  await expect(page.getByText('Bericht is verplicht')).toBeVisible();
});

test('contact form shows invalid email validation message', async ({
  page,
}) => {
  const contactPage = new ContactPage(page);

  await contactPage.goto();
  await contactPage.nameInput.fill('Test User');
  // Valid for native email input, but rejected by app regex (missing dot in domain).
  await contactPage.emailInput.fill('test@localhost');
  await contactPage.subjectInput.fill('Onderwerp');
  await contactPage.messageInput.fill('Een geldig bericht');

  await contactPage.submitButton.click();

  await expect(page.getByText('Ongeldig e-mailadres')).toBeVisible();
});

test('contact form shows success message when API responds with 200', async ({
  page,
}) => {
  const contactPage = new ContactPage(page);
  await mockTurnstile(page);

  await page.route('**/api/contact', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'E-mail succesvol verzonden' }),
    });
  });

  await contactPage.goto();
  await contactPage.fillValidForm();
  const successResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/contact') &&
      response.request().method() === 'POST' &&
      response.status() === 200,
  );
  await contactPage.submitButton.click();
  await successResponse;

  await expect(contactPage.successAlert).toBeVisible();
  await expect(contactPage.nameInput).toHaveValue('');
  await expect(contactPage.emailInput).toHaveValue('');
  await expect(contactPage.subjectInput).toHaveValue('');
  await expect(contactPage.messageInput).toHaveValue('');
});

test('contact form shows API error message when request fails', async ({
  page,
}) => {
  const contactPage = new ContactPage(page);
  await mockTurnstile(page);

  await page.route('**/api/contact', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Interne serverfout' }),
    });
  });

  await contactPage.goto();
  await contactPage.fillValidForm();
  const errorResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/contact') &&
      response.request().method() === 'POST' &&
      response.status() === 500,
  );
  await contactPage.submitButton.click();
  await errorResponse;

  await expect(contactPage.errorAlert).toBeVisible();
});
