import { describe, expect, it } from 'vitest';
import { validateContactPayload } from './schema';

describe('validateContactPayload', () => {
  it('trims valid fields and preserves a turnstile token', () => {
    expect(
      validateContactPayload({
        name: ' Test User ',
        email: ' test.user@example.com ',
        subject: ' Vraag ',
        message: ' Hallo ',
        turnstileToken: ' token ',
      }),
    ).toEqual({
      data: {
        name: 'Test User',
        email: 'test.user@example.com',
        subject: 'Vraag',
        message: 'Hallo',
        turnstileToken: 'token',
      },
    });
  });

  it('rejects missing required fields', () => {
    expect(
      validateContactPayload({
        name: 'Test User',
        email: 'test.user@example.com',
        subject: '',
        message: 'Hallo',
      }),
    ).toEqual({ error: 'Alle velden zijn verplicht' });
  });

  it('rejects malformed email addresses', () => {
    expect(
      validateContactPayload({
        name: 'Test User',
        email: 'test.user@example',
        subject: 'Vraag',
        message: 'Hallo',
      }),
    ).toEqual({ error: 'Ongeldig e-mailadres' });
  });

  it('rejects non-object payloads', () => {
    expect(validateContactPayload(null)).toEqual({
      error: 'Ongeldige aanvraag',
    });
  });
});
