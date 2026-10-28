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

### Request and response format

Requests send camelCase keys (`parentId`, `nicheId`). Every JSON answer has the same shape, with PascalCase keys at every depth (`CompanyId`):

```json
{ "Success": true, "StatusCode": 200, "Data": { }, "MetaData": { "Timestamp": "…", "Path": "/public/niches", "Count": 2 } }
```

`Count` appears only for lists. A failure looks like this (`Errors` lists every validation problem and is left out when there is only one):

```json
{ "Success": false, "StatusCode": 400, "Error": "Bad Request", "ErrorMessage": "email must be an email", "Errors": ["…"], "MetaData": { "Timestamp": "…", "Path": "/auth/login" } }
```

The newsletter CSV export is a file and is sent as it is. `/docs` shows these real shapes.

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
| GET, POST, PATCH /:id, DELETE /:id, PUT /reorder | /admin/vault/categories (the tree: 5 official categories + their sub-groups) | admin only |
| CRUD + POST /:id/publish, /unpublish | /admin/vault/products (cover, gallery, sections, private file fields) | admin only |
| POST | /admin/uploads/presign (short-lived upload URL; 503 until STORAGE_* is set) | admin only |
| CRUD + POST /:id/publish, /unpublish | /admin/pages (privacy, terms and other site pages; nothing is seeded) | admin only |
| GET | /public/vault/categories (tree with sub-groups and published counts), /public/vault/products[?category=&featured=&popular=] (a top-level slug includes its sub-groups), /public/vault/products/:slug | public, published only |
| GET | /public/pages (slug + title for the footer), /public/pages/:slug | public, published only |
| CRUD | /admin/free-resources | any staff |
| GET, PATCH, DELETE | /admin/newsletter (+ GET /admin/newsletter/export.csv) | admin only |
| GET, PATCH, DELETE | /admin/contact-messages | admin only |
| GET, PUT | /admin/settings, /admin/settings/:key | admin only |
| GET | /public/free-resources, /public/settings | public |
| GET, PUT, DELETE, POST | /admin/payments/settings, /admin/payments/settings/:mode, /admin/payments/test | admin only (Stripe keys, masked; encrypted at rest) |
| GET | /admin/orders, /admin/orders/:id | admin only |
| GET, POST | /public/payments/status, /public/checkout, /public/orders/:sessionId, /public/orders/:sessionId/items/:itemId/download | public |
| POST | /public/payments/webhook | public, Stripe signature checked |
| POST | /public/newsletter, /public/contact | public, 5 per minute per IP |

Articles are filed under niches; episodes carry a series slug (the series list is hardcoded on the website) and are YouTube links (an episode cannot be published without one). Only one article and one episode can be featured at a time.

The Vault catalog stores prices as integer US cents. Buying works through Stripe Checkout (hosted page): the website sends the product slugs to POST /public/checkout, the API re-reads the prices, saves the order, and sends the buyer to Stripe; the signed webhook marks the order paid and the buyer downloads the file from a 10-minute link. The five categories are a static seeded table. Newsletter sign-ups and contact messages are stored, not emailed.

Rate limits: 120 requests/minute per visitor overall, 10/minute on /auth/login and POST /public/checkout, 5/minute on the public form posts, 20/minute on order lookups. Set TRUST_PROXY=true behind nginx or Vercel so the real client IP is used. The website calls this API from its own server, so it also sends the visitor address in X-Client-IP together with X-Internal-Key; the address is trusted only when the key equals INTERNAL_API_KEY (set the same value on both). /docs is hidden in production unless SWAGGER_ENABLED=true.

Send Authorization: Bearer <accessToken>. Every route needs a token unless marked @Public(); narrow by role with @Roles(Role.Admin).

## Before production

- Keep `DB_SYNCHRONIZE=false`: the schema is built by the migrations in `src/migrations` (run on startup; `DB_MIGRATIONS_RUN=false` skips them). After changing an entity, run `npm run migration:generate -- src/migrations/Name` and add the new class to `src/migrations/index.ts`. `npm run migration:run` applies them by hand.
- Daily Postgres backups; keep the DB port closed to the internet.

## Deploying to Vercel

NestJS deploys with zero config (entrypoint `src/main.ts`). Set these env vars on the Vercel project:

- `DATABASE_URL`: the Supabase **transaction pooler** URL (port 6543, IPv4); the direct `db.*.supabase.co:5432` host is IPv6-only and will not connect from Vercel.
- `DB_SSL=true`, `DB_SYNCHRONIZE=false` (the migrations create the tables on the first start), `DB_POOL_MAX=1`, `TRUST_PROXY=true`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (new values, not the dev ones), `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (used once, when the users table is empty)
- `CORS_ORIGINS`: the admin and website URLs, comma-separated, no trailing slash
- `SWAGGER_ENABLED=true` only if `/docs` should be public

Use a separate Supabase project for production if you can. Rate limits are counted per serverless instance, so they are looser than they look. Schema changes need a migration (see Before production).

## Vault groups, product pages, files and site pages

- **Groups:** the five official categories are fixed top-level groups (seeded; never deletable, renamable or movable; only their description can be edited). Admins add, rename, reorder, move and delete **sub-groups** under them, one level deep. A product's `categoryId` can be a category or a sub-group. Deleting a sub-group that still has products is refused (409).
- **Product pages:** a product has `coverImageUrl`, `galleryImages` and an ordered `sections` list (`text`, `bullets`, `faq`, `image`). The website draws them in a fixed theme; the admin only chooses content and order.
- **Files:** uploads go straight to an S3-compatible bucket (Cloudflare R2 / S3) with a presigned URL from `POST /admin/uploads/presign`. Images (png, jpeg, webp, gif, up to 5 MB) go under `public/` and come back with a `publicUrl`. Product files (pdf, zip, epub, office, csv, audio, mp4; up to 1000 MB) go under `private/` and are never public: the `fileKey` appears only in admin responses, and a file is served only through the 10-minute download link of a paid order.
- **Site pages:** `/admin/pages` holds privacy, terms and similar pages as plain text (blank line between paragraphs, `## ` starts a heading). No page is seeded.
- **Env vars:** `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_REGION` (default `auto`), `STORAGE_PUBLIC_BASE_URL` (public address of the bucket's `public/` files, needed for images). If they are missing the API still starts and the upload endpoint answers 503.
- **Roles:** Vault, uploads and pages endpoints are admin-only, so editors cannot use them.
