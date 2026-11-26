import { test, expect } from './fixtures';

const OK_STATUS = 200;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;

const collections = [
  'users',
  'players',
  'teams',
  'venues',
  'leagues',
  'seasons',
  'matches',
  'team-events',
  'reports',
  'previews',
  'news',
  'albums',
  'media',
  'bookings',
  'source-records',
] as const;

test.describe('Payload domain API', () => {
  test('serves the forgot-password endpoint without exposing account existence', async ({
    request,
  }) => {
    const response = await request.post('/api/users/forgot-password', {
      data: { email: 'missing-user@example.test' },
    });

    expect(response.status()).toBe(OK_STATUS);
    await expect(response).toBeOK();
    expect(await response.json()).toMatchObject({
      message: expect.any(String),
    });
  });

  test('denies unauthenticated REST reads across all collections and globals', async ({
    request,
  }) => {
    const protectedEndpoints = [
      ...collections.map((collection) => `/api/${collection}?limit=1`),
      '/api/globals/club-settings',
    ];

    await Promise.all(
      protectedEndpoints.map(async (endpoint) => {
        const response = await request.get(endpoint);

        expect(response.status(), endpoint).toBe(FORBIDDEN_STATUS);
      }),
    );

    const lockedDocumentsResponse = await request.get(
      '/api/payload-locked-documents?limit=1',
    );
    expect(lockedDocumentsResponse.status()).toBe(NOT_FOUND_STATUS);
  });
});
