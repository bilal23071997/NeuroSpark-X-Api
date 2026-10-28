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
- **The five official Vault categories are fixed top-level groups** (seeded; cannot be deleted, renamed or moved; only their description is editable). Admins manage **sub-groups** under them, one level deep, and deleting a sub-group with products is refused.
- **Files:** S3-compatible storage (R2/S3) with presigned PUT uploads. Images live under `public/` (public URL stored on the product); product files live under `private/` and their key is admin-only, never in a public response. Paid files are only reachable through a paid order's 10-minute download link.
- Product pages are a fixed theme plus an ordered `sections` list (`text`, `bullets`, `faq`, `image`); no free-form page builder.
- Site pages (`pages`: privacy, terms, ...) are admin-managed plain text and **seeded empty**: never invent legal text.
- **Payments (Stripe Checkout, hosted page):** module `payments`. Keys are entered in the admin (Payments screen) and stored AES-256-GCM encrypted (`PAYMENTS_ENCRYPTION_KEY`, env only); `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` env vars override them. Prices always come from the database. Orders are found by their Stripe session id (no buyer accounts); `checkout.session.completed` webhook (raw body, signature checked) marks them paid, and the thank-you lookup also self-heals by asking Stripe. Paid files are served by 10-minute presigned GET links. Only products with a price and a file are purchasable; free products have no checkout. Never log or return secret keys.
- **Not built yet, don't add without being asked:** refunds from the admin (done in the Stripe dashboard), tax, discount codes, email sending (newsletter/contact/receipts: Stripe emails the receipt), email verification, forgot-password. Test-mode checkout works end to end locally; live mode is untested.
- Never create fake products, prices, reviews, download links or payment confirmations.

## Response format (every JSON answer)

Requests send camelCase keys (`parentId`, `nicheId`). Answers always use one shape with **PascalCase keys at every depth** (`CompanyId`).

- **Each endpoint builds its own response class.** A controller never returns an entity: it returns a class whose properties are already PascalCase and fills it with `Response.from(entity)` (admin: `content.responses.ts`, `engagement.responses.ts`, `pages.responses.ts`, `users.responses.ts`, `vault.responses.ts`; website and other shapes: the `*Dto` response classes in each module's `*.dto.ts`). Nothing renames keys at runtime, and Swagger documents these classes as they are. A new endpoint needs a response class with a `from()` (or an object typed as one).
- The envelope is added by `src/common/response-envelope.interceptor.ts` (success) and `all-exceptions.filter.ts` (errors):
  - Success: `{ Success: true, StatusCode, Data, MetaData: { Timestamp, Path, Count? } }` (`Count` only for lists).
  - Failure: `{ Success: false, StatusCode, Error, ErrorMessage, Errors?, MetaData }` (`Errors` lists every validation message; `ErrorMessage` is the first).
  - Files (the newsletter CSV, a plain string) are sent as they are. Unexpected errors are logged and answered with a generic 500.
- `src/common/swagger-envelope.ts` puts each documented schema inside the wrapper so `/docs` shows the real shape.
- `src/common/responses.spec.ts` checks that response classes have only capitalised keys and expose no password or token hashes.
- The frontends read the answers as they are, with no key conversion: the admin's `src/lib/api/types.ts` is PascalCase, and the website declares PascalCase wire types (`Api*` in `src/lib/api.ts`) that it maps to its own camelCase types. Change the format in all three repos together.

## Layout

`src/` modules: `auth` (login/refresh/logout/me/password), `users` (+ first-admin seed), `roles`, `content` (niches, articles, episodes + `/public/*`), `vault` (5 official categories + sub-groups, products with sections/images/private file), `storage` (presigned uploads), `pages` (site pages), `engagement` (free resources, newsletter, contact), `settings` (4 fixed keys), `payments` (Stripe config, checkout, orders, webhook), `health`, `common` (decorators, role enum, hash helper).

Conventions to follow when adding a module:
- ESM: relative imports end in `.js`.
- Entities in `*.entity.ts`, DTOs in `dto.ts` / `*.dto.ts` (the Swagger plugin only reads those suffixes and documents fields; doc comments become descriptions, `@example` becomes examples).
- Every route needs a token by default. Website-facing routes are `@Public()` and live under `/public/*`; admin routes live under `/admin/*` and are open to any staff role unless narrowed with `@Roles(Role.Admin)`. A route with no `@Roles()` allows every staff role.
- Add `@ApiTags`, `@ApiOperation`, response decorators and `@ApiBearerAuth('access-token')` on protected controllers. Keep `README.md`'s endpoint table in step.
- TypeORM here rejects `undefined` in `where`: only include filters that were given.
- Slugs: lowercase letters, numbers, single hyphens; use `assertSlugFree`/`slugify` from `content/helpers.ts`.
- Publishing pattern: `draft`/`published`, `publishedAt` set the first time, one featured item at a time (set inside a transaction).
- Vault, uploads and pages admin endpoints are admin-only (`@Roles(Role.Admin)`): editors are blocked from them.
- `npm test` runs vitest unit tests (storage presigning with a mocked presigner, product sections, category rules with mocked repositories). A live upload could not be tested because no bucket exists yet.
- **Schema = migrations** (`src/migrations`, listed in `index.ts`, run on boot). Keep `DB_SYNCHRONIZE=false` outside local dev; after changing an entity run `npm run migration:generate -- src/migrations/Name` and register the class. The baseline skips a database that already has `users`.
- Rate limits are on (`@nestjs/throttler`, per visitor via `ClientIpThrottlerGuard`: the website sends `X-Client-IP` + `X-Internal-Key`, trusted only when the key matches `INTERNAL_API_KEY`): 10/min on login, 5/min on public form posts. `/docs` is hidden in production unless `SWAGGER_ENABLED=true`.

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
