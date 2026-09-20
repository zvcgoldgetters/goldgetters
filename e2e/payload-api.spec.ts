import { test, expect } from './fixtures';

const OK_STATUS = 200;
const FORBIDDEN_STATUS = 403;

const publicCollections = [
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
] as const;
const privateCollections = ['users', 'bookings', 'source-records'] as const;

test.describe('Payload domain API', () => {
  test('exposes public collection reads', async ({ request }) => {
    await Promise.all(
      publicCollections.map(async (collection) => {
        const response = await request.get(`/api/${collection}?limit=1`);

        expect(response.status(), collection).toBe(OK_STATUS);
        await expect(response).toBeOK();
        expect(await response.json()).toMatchObject({
          docs: expect.any(Array),
        });
      }),
    );
  });

  test('protects private finance and administrator resources', async ({
    request,
  }) => {
    const privateEndpoints = [
      ...privateCollections.map((collection) => `/api/${collection}?limit=1`),
      '/api/globals/club-settings',
    ];

    await Promise.all(
      privateEndpoints.map(async (endpoint) => {
        const response = await request.get(endpoint);

        expect(response.status(), endpoint).toBe(FORBIDDEN_STATUS);
      }),
    );
  });
});
