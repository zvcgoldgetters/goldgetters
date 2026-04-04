# AGENTS.md

This file provides working guidance for coding agents contributing to this repository.

## Project Snapshot

- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Payload CMS 3, SQLite.
- Package manager: npm (`package-lock.json` is committed).
- Main areas:
  - Frontend app routes: `app/(frontend)`
  - Payload admin/API routes: `app/(payload)`
  - Shared UI/components: `components/`
  - Feature logic (contact flow): `features/contact/`
  - Payload collections/config: `payload/`, `payload.config.ts`
  - Tests: unit/integration in Vitest, end-to-end in Playwright (`e2e/`)

## Setup

1. Install dependencies:
   - `npm install`
2. Create environment file from sample:
   - `cp .env.example .env`
3. Ensure required env vars are set (SMTP, Turnstile, Payload secret, DB URI).

## Common Commands

- Dev server: `npm run dev`
- Build (includes Payload migrations): `npm run build`
- CI-equivalent build: `npm run ci`
- Lint: `npm run lint`
- Format: `npm run format`
- Format check: `npm run format:check`
- Unit tests: `npm run test`
- E2E tests: `npm run e2e`
- Payload migrations:
  - Run pending: `npm run migrate`
  - Create migration: `npm run migrate:create`
  - Roll back migration: `npm run migrate:down`

## Agent Workflow

When implementing changes:

1. Understand impact scope before editing (frontend, payload, or both).
2. Keep changes minimal and focused; avoid broad refactors unless requested.
3. Run targeted validation first, then broader checks:
   - Minimum: `npm run lint`
   - If behavior changes: relevant `npm run test` or `npm run e2e`
4. If schema/content model changes are made, include a migration and run `npm run migrate`.
5. Summarize exactly what was changed and list any checks not run.

## Coding Conventions

- Use TypeScript and existing project patterns; avoid introducing new frameworks.
- Prefer server components by default in App Router; use client components only where needed.
- Keep UI consistent with existing component primitives in `components/ui` and `components/goldgetters`.
- Use `lib/env/*` helpers for environment access patterns where applicable.
- Do not hardcode secrets; use env vars.
- Keep files ASCII unless there is an existing reason not to.
- Follow repository best-practice skills when relevant (for example: `next-best-practices`, `vercel-react-best-practices`, `vitest`, `playwright-expert`).

## Tests and Quality Gates

- Husky pre-commit runs `lint-staged` (primarily formatting staged files).
- Do not rely only on pre-commit hooks; run lint/tests explicitly for meaningful changes.
- For UI flows or routing changes, prefer updating/adding Playwright coverage in `e2e/`.
- For isolated logic, prefer Vitest coverage.

## Notes for Payload/Admin Changes

- Review both `payload.config.ts` and related collection files in `payload/collections/`.
- Admin-related routes and assets live under `app/(payload)/admin`.
- Be careful when editing generated/import-map style files; update source-of-truth files when possible.
- Use the `payload` skill guidance for Payload-specific modeling, hooks, access control, and API patterns.

## Definition of Done (for agent PRs)

- Change is scoped and complete.
- Lint/tests relevant to the change pass (or failures are documented).
- Migrations included when required.
- No secrets committed.
- Handoff summary includes:
  - Files changed
  - Commands run
  - Follow-ups or known limitations
