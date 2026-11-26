import { describe, expect, it } from 'vitest';
import { resolvePayloadServerUrl } from './server';

function makeEnv(entries: readonly [string, string][]): NodeJS.ProcessEnv {
  return Object.fromEntries(entries) as NodeJS.ProcessEnv;
}

describe('resolvePayloadServerUrl', () => {
  it('prefers explicit PAYLOAD_SERVER_URL and normalizes to its origin', () => {
    expect(
      resolvePayloadServerUrl(
        makeEnv([
          ['NODE_ENV', 'production'],
          ['PAYLOAD_SERVER_URL', 'https://staging.goldgetters.be/admin/'],
          ['VERCEL_PROJECT_PRODUCTION_URL', 'goldgetters.be'],
        ]),
      ),
    ).toBe('https://staging.goldgetters.be');
  });

  it('falls back to NEXT_PUBLIC_SITE_URL when PAYLOAD_SERVER_URL is unset', () => {
    expect(
      resolvePayloadServerUrl(
        makeEnv([
          ['NEXT_PUBLIC_SITE_URL', 'https://www.goldgetters.be/news'],
          ['NODE_ENV', 'production'],
        ]),
      ),
    ).toBe('https://www.goldgetters.be');
  });

  it('uses HTTPS Vercel preview host for preview deployments', () => {
    expect(
      resolvePayloadServerUrl(
        makeEnv([
          ['NODE_ENV', 'production'],
          ['VERCEL_BRANCH_URL', 'goldgetters-git-preview.vercel.app'],
          ['VERCEL_ENV', 'preview'],
          ['VERCEL_URL', 'goldgetters-123.vercel.app'],
        ]),
      ),
    ).toBe('https://goldgetters-git-preview.vercel.app');
  });

  it('uses HTTPS Vercel production host when configured', () => {
    expect(
      resolvePayloadServerUrl(
        makeEnv([
          ['NODE_ENV', 'production'],
          ['VERCEL_ENV', 'production'],
          ['VERCEL_PROJECT_PRODUCTION_URL', 'goldgetters.be'],
        ]),
      ),
    ).toBe('https://goldgetters.be');
  });

  it('defaults to the production HTTPS domain in production and localhost otherwise', () => {
    expect(resolvePayloadServerUrl(makeEnv([['NODE_ENV', 'production']]))).toBe(
      'https://goldgetters.be',
    );
    expect(
      resolvePayloadServerUrl(makeEnv([['NODE_ENV', 'development']])),
    ).toBe('http://localhost:3000');
    expect(resolvePayloadServerUrl(makeEnv([['NODE_ENV', 'test']]))).toBe(
      'http://localhost:3000',
    );
  });
});
