export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  turnstileToken?: string;
}

export interface ContactValidationResult {
  data?: ContactFormData;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateContactPayload(
  payload: unknown,
): ContactValidationResult {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Ongeldige aanvraag' };
  }

  const source = payload as Record<string, unknown>;

  const data: ContactFormData = {
    name: clean(source.name),
    email: clean(source.email),
    subject: clean(source.subject),
    message: clean(source.message),
    turnstileToken: clean(source.turnstileToken) || undefined,
  };

  if (!data.name || !data.email || !data.subject || !data.message) {
    return { error: 'Alle velden zijn verplicht' };
  }

  if (!EMAIL_REGEX.test(data.email)) {
    return { error: 'Ongeldig e-mailadres' };
  }

  return { data };
}
