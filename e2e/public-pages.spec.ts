import { test, expect } from './fixtures';

const publicPages = [
  { path: '/nieuws', heading: 'Nieuws' },
  { path: '/ploeg', heading: 'Ploeg' },
  { path: '/wedstrijden', heading: 'Wedstrijden' },
  { path: '/fotos', heading: "Foto's" },
  { path: '/statistieken', heading: 'Statistieken' },
] as const;

publicPages.forEach(({ path, heading }) => {
  test(`${path} renders its page heading`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(path);
    await expect(
      page.getByRole('heading', { name: heading, level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cotersus' })).toHaveAttribute(
      'href',
      'https://www.cotersus.be/',
    );
  });
});

test('unknown routes render the localized not-found page', async ({ page }) => {
  await page.goto('/does-not-exist');

  await expect(
    page.getByRole('heading', { name: 'Pagina niet gevonden', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Ga terug naar de homepagina' }),
  ).toHaveAttribute('href', '/');
});
