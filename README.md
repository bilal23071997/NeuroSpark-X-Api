# NeuroSpark X API

NestJS + TypeScript + TypeORM + PostgreSQL. One API with separate modules
(auth/users now; content and store next). Plan: see `Documentation/Backend-Phase-Plan.md`
in the website repo.

## Run locally

1. Install PostgreSQL and create a database (`neurospark_x`).
2. `cp .env.example .env` and fill in `DATABASE_URL`, both JWT secrets and the seed admin.
3. `npm install` (this project uses `legacy-peer-deps`, see `.npmrc`)
4. `npm run start:dev` — API on http://localhost:3001

On first start, if the users table is empty, an admin is created from
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## Endpoints

Interactive docs: http://localhost:3001/docs (OpenAPI JSON at /docs-json, importable in Postman).

Only staff sign in (roles: admin, editor). Roles live in the static roles table; users.roleId is a foreign key to it. Website shoppers have no accounts.

| Method | Path | Access |
|---|---|---|
| GET | /health | public |
| POST | /auth/login, /auth/refresh | public |
| POST | /auth/logout, /auth/password; GET /auth/me | any signed-in staff |
| GET/POST/PATCH | /admin/users | admin only |
| GET | /admin/roles | admin only |
| CRUD | /admin/niches, /admin/articles, /admin/episodes | any staff |
| POST | /admin/articles/:id/publish, /unpublish; same for /admin/episodes | any staff |
| GET | /public/niches, /public/articles[/:slug], /public/episodes[/:slug] | public, published only |
| CRUD + POST /:id/publish, /unpublish | /admin/vault/products (GET /admin/vault/categories is read-only) | admin only |
| GET | /public/vault/categories, /public/vault/products[?category=&featured=&popular=], /public/vault/products/:slug | public, published only |
| CRUD | /admin/free-resources | any staff |
| GET, PATCH, DELETE | /admin/newsletter (+ GET /admin/newsletter/export.csv) | admin only |
| GET, PATCH, DELETE | /admin/contact-messages | admin only |
| GET, PUT | /admin/settings, /admin/settings/:key | admin only |
| GET | /public/free-resources, /public/settings | public |
| POST | /public/newsletter, /public/contact | public, 5 per minute per IP |

Articles are filed under niches; episodes carry a series slug (the series list is hardcoded on the website) and are YouTube links (an episode cannot be published without one). Only one article and one episode can be featured at a time.

The Vault is a catalog only: prices are integer US cents, there is no cart, checkout, Stripe or orders yet. The five categories are a static seeded table. Newsletter sign-ups and contact messages are stored, not emailed.

Rate limits: 120 requests/minute per IP overall, 10/minute on /auth/login, 5/minute on the public form posts. Set TRUST_PROXY=true behind nginx or Vercel so the real client IP is used. /docs is hidden in production unless SWAGGER_ENABLED=true.

Send Authorization: Bearer <accessToken>. Every route needs a token unless marked @Public(); narrow by role with @Roles(Role.Admin).

## Before production

- Turn `DB_SYNCHRONIZE` off and switch to TypeORM migrations.
- Add rate limiting on `/auth/login`.
- Daily Postgres backups; keep the DB port closed to the internet.

## Deploying to Vercel

NestJS deploys with zero config (entrypoint `src/main.ts`). Set these env vars on the Vercel project:

- `DATABASE_URL`: the Supabase **transaction pooler** URL (port 6543, IPv4); the direct `db.*.supabase.co:5432` host is IPv6-only and will not connect from Vercel.
- `DB_SSL=true`, `DB_SYNCHRONIZE=false`, `DB_POOL_MAX=1`, `TRUST_PROXY=true`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (new values, not the dev ones), `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (used once, when the users table is empty)
- `CORS_ORIGINS`: the admin and website URLs, comma-separated, no trailing slash
- `SWAGGER_ENABLED=true` only if `/docs` should be public

Use a separate Supabase project for production if you can. Rate limits are counted per serverless instance, so they are looser than they look. Schema changes need migrations once `DB_SYNCHRONIZE` is off.
