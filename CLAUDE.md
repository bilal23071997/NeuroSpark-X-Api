# NeuroSpark X™ API — Working Instructions

Read automatically by every Claude Code session in this repo. Follow it so work
stays consistent on any machine.

## What this is

The one backend for the NeuroSpark X™ ecosystem: **NestJS 12 + TypeScript +
TypeORM + PostgreSQL** (hosted on Supabase). Content and store live as separate
modules inside this single API. The plan and decisions are in the website repo:
`E:\Next\NS\NeuroSpark-X-Website\Documentation\Backend-Phase-Plan.md`.

Sibling repos (each has its own `CLAUDE.md`):
- `E:\Next\NS\NeuroSpark-X-Website` — public website; reads Insights/Listen from the public endpoints.
- `E:\Next\NS\NeuroSpark-X-Admin` — admin portal; calls the `/admin/*` and `/auth/*` endpoints.

## Decisions that are already made (don't relitigate)

- PostgreSQL + TypeORM. Not MongoDB, not Prisma.
- **Only staff sign in** (roles `admin`, `editor`). Shoppers have no accounts and no `customers` table.
- Roles live in a static seeded `roles` table; `users.roleId` is a foreign key to it.
- Podcast series are **not** an API entity: the series list is hardcoded on the website and in the admin. Episodes just carry a `series` slug.
- Episodes are YouTube links (no audio/video hosting) and cannot be published without one.
- Money is stored as integer cents (`priceCents`, `salePriceCents`).
- **Not built yet, don't add without being asked:** cart, checkout, Stripe, orders, file storage / secure downloads, email sending (newsletter/contact are stored only), email verification, forgot-password. No payment account exists yet.
- Never create fake products, prices, reviews, download links or payment confirmations.

## Layout

`src/` modules: `auth` (login/refresh/logout/me/password), `users` (+ first-admin seed), `roles`, `content` (niches, articles, episodes + `/public/*`), `vault` (5 fixed categories, products), `engagement` (free resources, newsletter, contact), `settings` (4 fixed keys), `health`, `common` (decorators, role enum, hash helper).

Conventions to follow when adding a module:
- ESM: relative imports end in `.js`.
- Entities in `*.entity.ts`, DTOs in `dto.ts` / `*.dto.ts` (the Swagger plugin only reads those suffixes and documents fields; doc comments become descriptions, `@example` becomes examples).
- Every route needs a token by default. Website-facing routes are `@Public()` and live under `/public/*`; admin routes live under `/admin/*` and are open to any staff role unless narrowed with `@Roles(Role.Admin)`. A route with no `@Roles()` allows every staff role.
- Add `@ApiTags`, `@ApiOperation`, response decorators and `@ApiBearerAuth('access-token')` on protected controllers. Keep `README.md`'s endpoint table in step.
- TypeORM here rejects `undefined` in `where`: only include filters that were given.
- Slugs: lowercase letters, numbers, single hyphens; use `assertSlugFree`/`slugify` from `content/helpers.ts`.
- Publishing pattern: `draft`/`published`, `publishedAt` set the first time, one featured item at a time (set inside a transaction).
- Rate limits are on (`@nestjs/throttler`): 10/min on login, 5/min on public form posts. `/docs` is hidden in production unless `SWAGGER_ENABLED=true`.

## Running it

```powershell
cd E:\Next\NS\NeuroSpark-X-Api
npm run start:dev        # http://localhost:3001, docs at /docs, OpenAPI JSON at /docs-json
```

`.env` (git-ignored) holds `DATABASE_URL` (Supabase, `DB_SSL=true`), the JWT secrets, `CORS_ORIGINS` and the `SEED_ADMIN_*` account. `.env.example` lists every variable. `DB_SYNCHRONIZE=true` auto-creates tables in dev; switch to migrations before production.

## Working on this machine (Windows)

- Use the **PowerShell** tool for `npm run build` and for starting the server; the Bash tool can't spawn Node child processes reliably.
- Large Bash heredoc batches fail to parse here: use the Write/Edit tools for big files.
- npm 10.9.4 crashes on this Nest 12 tree (`edgesOut`): `.npmrc` sets `legacy-peer-deps=true`.
- When you start the API for a test, pass an explicit port (`$env:PORT='3012'`; `.env` says 3001, which the user's own dev server may be using) and stop only the process you started.

## Testing and the shared database

There is no local Postgres: every environment, including tests, talks to the **same Supabase database**.
- Prefix test data with `ZZ-test` and delete everything you create when you finish.
- Never drop or truncate tables, never edit rows you didn't create, never print secrets or passwords.
- Test through the real API (login with the seed admin from `.env`, call endpoints, check the response and the public endpoints). `tsc --noEmit` and `npm run build` must pass.
- Known leftover: deactivated `zz-test-*` / `ed2@` / `editor1@` users remain in `users` because there is no delete-user endpoint.

## Git

- Don't commit or push unless the user asks. One feature per commit with a clear message.
- Never commit `.env`, `dist`, `node_modules`, or the `*.log` files that dev runs leave in the repo root.
