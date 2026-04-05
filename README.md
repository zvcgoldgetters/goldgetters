# Goldgetters

Goldgetters is a Next.js 16 application with a public frontend and an integrated Payload CMS admin.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Payload CMS 3
- SQLite

## Prerequisites

- Node.js 20+
- npm (this repo uses `package-lock.json`)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file:

```bash
cp .env.example .env
```

3. Fill in required values in `.env`:

- `PAYLOAD_SECRET` (required)
- `DATABASE_URI` (defaults to `file:./payload.db` if omitted)
- SMTP values for contact email flow:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
- Turnstile values for contact form:
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - `TURNSTILE_SECRET_KEY`
- Optional:
  - `CONTACT_EMAIL_TO`
  - `CONTACT_EMAIL_FROM`
  - `PAYLOAD_AUTO_LOGIN_ENABLED`
  - `PAYLOAD_ADMIN_EMAIL`
  - `PAYLOAD_ADMIN_PASSWORD`
  - `DATABASE_AUTH_TOKEN`

## Development

Run the dev server:

```bash
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)  
Payload admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## Scripts

- `npm run dev` - start local development server
- `npm run build` - run Payload migrations, then build Next.js
- `npm run ci` - CI-equivalent build (`payload migrate && next build`)
- `npm run start` - start production server
- `npm run lint` - run ESLint
- `npm run format` - run Prettier write
- `npm run format:check` - run Prettier check
- `npm run test` - run Vitest unit/integration tests
- `npm run e2e` - run Playwright end-to-end tests
- `npm run migrate` - run pending Payload migrations
- `npm run migrate:create` - create a new migration
- `npm run migrate:down` - roll back a migration

## Project Structure

- `app/(frontend)` - public routes/pages
- `app/(payload)` - Payload admin integration and generated admin layout
- `components/` - shared UI components
- `features/contact/` - contact form validation + server integrations
- `payload/` - collections and CMS schema
- `migrations/` - Payload migrations
- `e2e/` - Playwright tests

## Testing & Quality

Typical local validation flow:

```bash
npm run lint
npm run test
npm run e2e
npm run format
```

Use targeted checks where possible, then run broader checks before merging.

## Notes

- Payload GraphQL is disabled in this project.
- The Payload admin layout file under `app/(payload)/layout.tsx` is generated. Prefer changing source config files instead of editing generated files directly.
