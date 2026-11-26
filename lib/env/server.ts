const EMPTY_ENV_VALUES = new Set(['', '""', "''", 'null', 'undefined']);

function readEnvFrom(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const trimmed = env[name]?.trim();
  if (!trimmed) {
    return undefined;
  }
  return EMPTY_ENV_VALUES.has(trimmed.toLowerCase()) ? undefined : trimmed;
}

function readEnv(name: string): string | undefined {
  return readEnvFrom(process.env, name);
}

function normalizeServerOrigin(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) {
    return undefined;
  }

  const candidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function resolvePayloadServerUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const explicitOrigin =
    normalizeServerOrigin(readEnvFrom(env, 'PAYLOAD_SERVER_URL')) ??
    normalizeServerOrigin(readEnvFrom(env, 'NEXT_PUBLIC_SITE_URL'));
  if (explicitOrigin) {
    return explicitOrigin;
  }

  const vercelOrigin =
    readEnvFrom(env, 'VERCEL_ENV') === 'preview'
      ? (normalizeServerOrigin(readEnvFrom(env, 'VERCEL_BRANCH_URL')) ??
        normalizeServerOrigin(readEnvFrom(env, 'VERCEL_URL')))
      : (normalizeServerOrigin(
          readEnvFrom(env, 'VERCEL_PROJECT_PRODUCTION_URL'),
        ) ?? normalizeServerOrigin(readEnvFrom(env, 'VERCEL_URL')));

  if (vercelOrigin) {
    return vercelOrigin;
  }

  return readEnvFrom(env, 'NODE_ENV') === 'production'
    ? 'https://goldgetters.be'
    : 'http://localhost:3000';
}

function readEnvOrEmpty(name: string): string {
  return readEnv(name) ?? '';
}

function readEnvBool(name: string): boolean {
  const value = readEnv(name)?.toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

export const serverEnv = {
  smtpHost: readEnvOrEmpty('SMTP_HOST'),
  smtpPort: Number.parseInt(readEnv('SMTP_PORT') ?? '587', 10),
  smtpUser: readEnvOrEmpty('SMTP_USER'),
  smtpPass: readEnvOrEmpty('SMTP_PASS'),
  contactEmailTo: readEnvOrEmpty('CONTACT_EMAIL_TO'),
  contactEmailFrom: readEnvOrEmpty('CONTACT_EMAIL_FROM'),
  payloadEmailFrom:
    readEnv('PAYLOAD_EMAIL_FROM') ??
    readEnv('CONTACT_EMAIL_FROM') ??
    readEnv('SMTP_USER') ??
    'noreply@goldgetters.local',
  payloadEmailFromName: readEnv('PAYLOAD_EMAIL_FROM_NAME') ?? 'Goldgetters',
  turnstileSecretKey: readEnvOrEmpty('TURNSTILE_SECRET_KEY'),
  payloadSecret: readEnvOrEmpty('PAYLOAD_SECRET'),
  payloadAdminEmail: readEnvOrEmpty('PAYLOAD_ADMIN_EMAIL'),
  payloadAdminPassword: readEnvOrEmpty('PAYLOAD_ADMIN_PASSWORD'),
  payloadAutoLoginEnabled: readEnvBool('PAYLOAD_AUTO_LOGIN_ENABLED'),
  payloadServerUrl: resolvePayloadServerUrl(),
  databaseUri:
    readEnv('DATABASE_URI') ?? readEnv('DATABASE_URL') ?? 'file:./payload.db',
  databaseAuthToken: readEnv('DATABASE_AUTH_TOKEN'),
} as const;

export function isSmtpConfigured(): boolean {
  return Boolean(
    serverEnv.smtpHost && serverEnv.smtpUser && serverEnv.smtpPass,
  );
}
