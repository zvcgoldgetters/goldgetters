# AGENTS.md

Repository guidance for coding agents working on Goldgetters. Keep this file focused on executable instructions and project-specific constraints.

## Project Overview

Goldgetters is a Next.js 16 application with a public frontend and an integrated Payload CMS admin/API surface.

- Runtime stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Payload CMS 3, SQLite.
- Package manager: npm. `package-lock.json` is committed; do not switch package managers.
- Node version: use Node.js 20 or newer, matching CI.
- Path aliases: `@/*` points to the repository root; `@payload-config` points to `payload.config.ts`.
- Payload GraphQL is disabled.

## Key Directories

- `app/(frontend)/` - public App Router routes, root frontend layout, global CSS, icons, loading/error/not-found states.
- `app/(payload)/` - Payload admin integration and generated admin files.
- `components/ui/` - shadcn-style UI primitives.
- `components/goldgetters/` - project-specific design, layout, section, and site components.
- `components/` - legacy/shared components still used by routes.
- `components/navigation/` - site navigation data.
- `features/contact/` - contact form schema and server integrations for mail and Turnstile.
- `lib/env/` - environment parsing helpers; prefer these over direct `process.env` reads in app code.
- `lib/i18n/` - localized copy.
- `payload/collections/` - Payload collection definitions.
- `migrations/` - Payload migrations.
- `e2e/` - Playwright tests and page objects.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill required `.env` values:
   - `PAYLOAD_SECRET` is required before Payload can load.
   - `DATABASE_URI` defaults to `file:./payload.db` if omitted; `DATABASE_URL` is also accepted by `lib/env/server.ts`.
   - Contact email flow uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_EMAIL_TO`, and `CONTACT_EMAIL_FROM`.
   - Turnstile uses `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
   - Payload admin auto-login can use `PAYLOAD_AUTO_LOGIN_ENABLED`, `PAYLOAD_ADMIN_EMAIL`, and `PAYLOAD_ADMIN_PASSWORD` in development.
   - `DATABASE_AUTH_TOKEN` is optional for database providers that require it.

Do not commit real secrets or local database files.

## Common Commands

- Start development server: `npm run dev`
- Open app locally: `http://localhost:3000`
- Open Payload admin locally: `http://localhost:3000/admin`
- Production build with migrations: `npm run build`
- CI-equivalent build: `npm run ci`
- Start built app: `npm run start`
- Lint: `npm run lint`
- Format all supported files: `npm run format`
- Check formatting: `npm run format:check`
- Unit/integration tests: `npm run test`
- End-to-end tests: `npm run e2e`
- Run pending Payload migrations: `npm run migrate`
- Create a Payload migration: `npm run migrate:create`
- Roll back a Payload migration: `npm run migrate:down`

## Testing Instructions

- Vitest is configured in `vitest.config.ts` with `jsdom`, React plugin support, globals enabled, `@` alias support, and `passWithNoTests: true`.
- Run all Vitest tests with `npm run test`.
- Run a focused Vitest file or pattern with `npx vitest run <path-or-pattern>`.
- Playwright tests live in `e2e/` and use `playwright.config.ts`.
- Run all E2E tests with `npm run e2e`.
- Run a focused E2E file with `npx playwright test e2e/<file>.spec.ts`.
- Playwright starts the dev server with `NEXT_PUBLIC_TURNSTILE_SITE_KEY='' npm run dev` and reuses an existing `http://localhost:3000` server outside CI.
- Playwright projects cover Chromium, WebKit, Pixel 7, iPhone 14, and 320px mobile variants.
- Monocart coverage output goes to `monocart-report/`; do not hand-edit generated report files.
- Prefer Vitest for isolated logic and Playwright for routing, layout, responsive, theme, and contact-flow behavior.

## Code Style

- Use TypeScript and keep `strict` compatibility.
- Prefer Server Components in `app/(frontend)` routes; add Client Component boundaries only for state, effects, browser APIs, or event handlers.
- Reuse existing component primitives from `components/ui/` and `components/goldgetters/` before introducing new patterns.
- For shadcn-style additions, follow `components.json`: `new-york` style, RSC enabled, TypeScript, lucide icons, and aliases under `@/components`, `@/components/ui`, and `@/lib`.
- Tailwind CSS 4 is wired through PostCSS; global styles live at `app/(frontend)/globals.css`.
- Use `lib/env/server.ts` and `lib/env/client.ts` for environment access.
- Keep code and prose ASCII unless the touched file already uses non-ASCII content for a reason.
- Prettier config uses single quotes, trailing commas, and LF endings.
- ESLint extends the project base config plus Next core-web-vitals and TypeScript rules. Do not silence rules without a narrow reason.

## Payload and Admin Notes

- Review `payload.config.ts` and relevant files in `payload/collections/` for Payload changes.
- `payload.config.ts` is the source of truth for admin configuration, collections, editor, database adapter, and generated Payload types.
- `app/(payload)/admin/importMap.*` and `app/(payload)/layout.tsx` are generated/integration files. Prefer changing Payload config or collection source files instead of editing generated output directly.
- Schema or content model changes require a migration in `migrations/`.
- After creating or editing migrations, run `npm run migrate` against the intended local database.
- Payload types are emitted to `payload-types.ts`; avoid manual edits unless there is no generator-backed alternative.

## CI and Quality Gates

CI runs on pushes and pull requests targeting `main`.

- Install: `npm ci`
- Lint: `npm run lint`
- Format check: `npm run format:check`
- Tests: `npm run test`
- E2E: `npm run e2e` on pull requests, with Playwright browser installation and Monocart report upload.

Before handoff, run the narrowest meaningful checks first, then broader checks as risk increases:

1. `npm run lint`
2. `npm run test` when logic, validation, utilities, or component behavior changes.
3. `npm run e2e` when routes, navigation, responsive UI, contact flow, theme behavior, or Payload integration changes.
4. `npm run format` before final handoff.

If a check cannot be run, document the reason and the risk.

## Security and Environment Rules

- Never hardcode secrets, SMTP credentials, Turnstile secrets, Payload secrets, or database tokens.
- Keep public environment values limited to `NEXT_PUBLIC_*` variables.
- Treat contact form, mailer, Turnstile, and Payload auth changes as security-sensitive.
- Preserve server-only boundaries for `features/contact/server/*` and `lib/env/server.ts`.

## Agent Workflow

1. Identify whether the change affects frontend routes, shared components, contact flow, Payload schema/admin, tests, or CI.
2. Read the closest existing implementation before editing and follow its style.
3. Keep changes scoped; avoid opportunistic refactors.
4. Add or update tests for changed behavior.
5. Include migrations for Payload schema/content model changes.
6. Run relevant checks and formatting.
7. Summarize changed files, commands run, and any limitations.

## PR and Commit Guidance

- Use conventional commit format when committing.
- Keep PRs focused on one coherent change.
- PR descriptions should mention user-facing behavior, Payload migrations, environment changes, and validation performed.
- Do not rely on Husky alone. The pre-commit hook runs `npx lint-staged`, which primarily formats staged files.
