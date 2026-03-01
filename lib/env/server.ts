const EMPTY_ENV_VALUES = new Set(['', '""', "''", 'null', 'undefined']);

function readEnv(name: string): string | undefined {
  const trimmed = process.env[name]?.trim();
  if (!trimmed) return undefined;
  return EMPTY_ENV_VALUES.has(trimmed.toLowerCase()) ? undefined : trimmed;
}

function readEnvOrEmpty(name: string): string {
  return readEnv(name) ?? '';
}

export const serverEnv = {
  smtpHost: readEnvOrEmpty('SMTP_HOST'),
  smtpPort: Number.parseInt(readEnv('SMTP_PORT') ?? '587', 10),
  smtpUser: readEnvOrEmpty('SMTP_USER'),
  smtpPass: readEnvOrEmpty('SMTP_PASS'),
  contactEmailTo: readEnvOrEmpty('CONTACT_EMAIL_TO'),
  contactEmailFrom: readEnvOrEmpty('CONTACT_EMAIL_FROM'),
  turnstileSecretKey: readEnvOrEmpty('TURNSTILE_SECRET_KEY'),
  payloadSecret: readEnvOrEmpty('PAYLOAD_SECRET'),
  databaseUri:
    readEnv('DATABASE_URI') ?? readEnv('DATABASE_URL') ?? 'file:./payload.db',
  databaseAuthToken: readEnv('DATABASE_AUTH_TOKEN'),
} as const;

export function isSmtpConfigured(): boolean {
  return Boolean(
    serverEnv.smtpHost && serverEnv.smtpUser && serverEnv.smtpPass,
  );
}
