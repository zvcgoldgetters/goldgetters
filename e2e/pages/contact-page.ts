import { expect, type Locator, type Page } from '@playwright/test';

export class ContactPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly subjectInput: Locator;
  readonly messageInput: Locator;
  readonly submitButton: Locator;
  readonly successAlert: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /^contact$/i, level: 1 });
    this.nameInput = page.getByRole('textbox', { name: /naam/i });
    this.emailInput = page.getByRole('textbox', { name: /e-mailadres/i });
    this.subjectInput = page.getByRole('textbox', { name: /onderwerp/i });
    this.messageInput = page.getByRole('textbox', { name: /bericht/i });
    this.submitButton = page.getByRole('button', { name: /verzend bericht/i });
    this.successAlert = page
      .getByRole('alert')
      .filter({ hasText: /bedankt voor uw bericht/i });
    this.errorAlert = page
      .getByRole('alert')
      .filter({ hasText: /er is een fout opgetreden/i });
  }

  async goto() {
    await this.page.goto('/contact');
  }

  async fillValidForm() {
    await this.nameInput.click();
    await this.nameInput.clear();
    await this.nameInput.pressSequentially('Test User');
    await expect(this.nameInput).toHaveValue('Test User');

    await this.emailInput.click();
    await this.emailInput.clear();
    await this.emailInput.pressSequentially('test@example.com');
    await expect(this.emailInput).toHaveValue('test@example.com');

    await this.subjectInput.click();
    await this.subjectInput.clear();
    await this.subjectInput.pressSequentially('Vraag over trainingen');
    await expect(this.subjectInput).toHaveValue('Vraag over trainingen');

    await this.messageInput.click();
    await this.messageInput.clear();
    await this.messageInput.pressSequentially(
      'Kunnen jullie trainingsuren delen?',
    );
    await expect(this.messageInput).toHaveValue(
      'Kunnen jullie trainingsuren delen?',
    );
  }
}
