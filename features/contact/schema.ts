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

function isValidEmail(value: string): boolean {
  if (/\s/.test(value)) {
    return false;
  }

  const atIndex = value.indexOf('@');
  if (atIndex <= 0 || atIndex !== value.lastIndexOf('@')) {
    return false;
  }

  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);

  if (!local || !domain || domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }

  if (domain.includes('..')) {
    return false;
  }

  const dotIndex = domain.indexOf('.');
  return dotIndex > 0 && dotIndex < domain.length - 1;
}

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

  if (!isValidEmail(data.email)) {
    return { error: 'Ongeldig e-mailadres' };
  }

  return { data };
}
