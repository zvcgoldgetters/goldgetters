import { serverEnv } from '@/lib/env/server';

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  if (!serverEnv.turnstileSecretKey) return false;

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: serverEnv.turnstileSecretKey,
          response: token,
        }),
      },
    );

    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
