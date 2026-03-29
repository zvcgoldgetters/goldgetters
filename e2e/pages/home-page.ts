import type { Locator, Page } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly mainHeading: Locator;
  readonly contactNavLink: Locator;
  readonly heroContactCtaLink: Locator;
  readonly logoLink: Locator;
  readonly themeToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mainHeading = page.getByRole('heading', {
      name: /zvc goldgetters/i,
      level: 1,
    });
    this.contactNavLink = page.getByRole('link', { name: /^contact$/i });
    this.heroContactCtaLink = page.getByRole('link', {
      name: /neem contact op/i,
    });
    this.logoLink = page.getByRole('link', { name: /zvc goldgetters/i });
    this.themeToggle = page.getByRole('button', { name: /toggle theme/i });
  }

  async goto() {
    await this.page.goto('/');
  }
}
