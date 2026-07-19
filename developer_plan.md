# OpenCart – Solo Developer Task Plan
A multi-vendor digital marketplace with Stripe Connect split payments. Built with Next.js + PostgreSQL + Prisma + Redis + Docker. One developer, four weeks, one deployable app.

---

## Task ID Convention
W1–W4 = Week number · FE = Frontend · BE = Backend · FS = Full-stack (you own both sides)  
Scope: S = Small (≈0.5–1 day) · M = Medium (1–2 days) · L = Large (2+ days)  
Developer: Solo (you own everything)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Docker locally, Railway in prod) |
| ORM | Prisma |
| Auth | NextAuth.js (credentials + role-based) |
| Payments | Stripe Connect (Express accounts) |
| Cache / rate limit | Redis (Docker locally, Railway in prod) |
| Email | Resend (free tier) |
| Deploy | Railway (DB + Redis + app in one place) |
| Containerisation | Docker Compose (local dev) |
| API docs | Swagger UI (`swagger-jsdoc` + `swagger-ui-express` via a standalone Express handler) |

---

## Status Summary

| Week | Tasks | Status |
|---|---|---|
| W1 – Foundation | 0 / 6 | Not started |
| W2 – Core marketplace | 0 / 6 | Not started |
| W3 – Dashboards & polish | 0 / 5 | Not started |
| W4 – Deploy & impress | 0 / 4 | Not started |

---

## Week 1 – Foundation: Auth, Roles & Stripe Onboarding

Get the project scaffolded, users able to register as buyer or seller, and sellers able to connect their Stripe account. By end of week you have a working local environment with auth and Stripe Connect OAuth flowing correctly.

**Checkpoint: Day 3** — buyer and seller can register and log in with correct role.  
**Checkpoint: Day 5** — seller completes Stripe Connect onboarding and is stored in DB.

| ID | Task | Scope | Deps | Done |
|---|---|---|---|---|
| W1-1 | **Project scaffold** – `create-next-app` with TypeScript + Tailwind + App Router. Docker Compose with `postgres` and `redis` services. Prisma init, connect to local Postgres. Health check route `GET /api/health`. Folder structure: `app/`, `lib/`, `prisma/`, `components/`. | S | — | Done |
| W1-2 | **DB schema v1** – Prisma models: `User` (id, email, passwordHash, role: BUYER\|SELLER\|ADMIN, stripeAccountId, stripeOnboarded, createdAt), `Store` (id, sellerId, name, description, createdAt). Run first migration. | S | W1-1 | Done |
| W1-3 | **Auth with NextAuth** – Credentials provider with bcrypt. Session includes `id`, `email`, `role`. Three roles enforced via middleware: buyers can't access `/seller/*`, sellers can't access `/admin/*`. Register page with role selection (buyer / seller). | M | W1-2 | Done |
| W1-4 | **Stripe Connect onboarding** – After seller registers, redirect to `/seller/onboarding`. Call Stripe `accounts.create` (Express type), generate an `accountLinks.create` onboarding URL, redirect seller to Stripe. On return to `/seller/onboarding/return`, mark `stripeOnboarded: true` in DB. Store `stripeAccountId` on User. | L | W1-3 | Done |
| W1-5 | **Store creation** – After Stripe onboarding completes, prompt seller to name their store (`POST /api/store`). Seller is blocked from listing products until store exists and `stripeOnboarded: true`. | S | W1-4 | Done |
| W1-6 | **Swagger UI setup** – Install `swagger-jsdoc` and `next-swagger-doc`. Create `lib/swagger.ts` that builds the OpenAPI 3.0 spec from JSDoc `@swagger` comments on every route file. Expose `GET /api/docs` as a Next.js route handler that returns the JSON spec, and serve Swagger UI at `/api/docs/ui` using a standalone HTML page that points `SwaggerUIBundle` at `/api/docs`. Add `@swagger` comments to all W1 routes (`/api/health`, `/api/auth/register`, `/api/store`) to seed the UI. Gate the `/api/docs` route to `NODE_ENV !== 'production'` so it never ships to prod. | M | W1-5 | Done |

**Done when:** Buyer can register and log in. Seller can register, complete Stripe Connect onboarding, and create a store. All W1 routes are visible and testable in Swagger UI at `localhost:3000/api/docs/ui`.

---

## Week 2 – Core Marketplace: Listings, Checkout & Payments

The most critical week. Buyers browse products, purchase via Stripe, and sellers get paid automatically with platform fee deducted. Front-load the Stripe webhook work — it's the riskiest piece.

**Checkpoint: Day 2** — product listing CRUD working, products visible on storefront.  
**Checkpoint: Day 4** — full purchase flow working end-to-end in Stripe test mode.

| ID | Task | Scope | Deps | Done |
|---|---|---|---|---|
| W2-1 | **DB schema v2** – Add Prisma models: `Product` (id, storeId, name, description, price, imageUrl, category, active, createdAt), `Order` (id, buyerId, sellerId, productId, stripeSessionId, amountTotal, platformFee, status: PENDING\|PAID\|FAILED, createdAt). Run migration. | S | W1-5 | Done |
| W2-2 | **Product CRUD (seller)** – Seller pages: `POST /api/products` (create), `PUT /api/products/:id` (edit), `DELETE /api/products/:id` (soft delete → `active: false`). Image upload via Cloudinary unsigned upload (free, no server needed). Guard all routes: only the store owner can edit their products. | M | W2-1 | Done |
| W2-3 | **Public storefront** – `/` page: grid of all active products across all stores, category filter pills, search by name (Postgres `ILIKE`). `/products/:id` individual product page with seller store name, price, description, and "Buy now" button. Use React Server Components for initial fetch. | M | W2-2 | Done |
| W2-4 | **Stripe Checkout session** – `POST /api/checkout` creates a Stripe Checkout session with `payment_intent_data.transfer_data.destination` set to the seller's `stripeAccountId` and `application_fee_amount` set to 5% of price. Returns `url`, redirect buyer to Stripe-hosted checkout. Create an `Order` with status `PENDING`. | M | W2-3 | Done |
| W2-5 | **Stripe webhook handler** – `POST /api/webhooks/stripe` (raw body, verify signature). On `checkout.session.completed`: find order by `stripeSessionId`, set status to `PAID`. On `checkout.session.expired`: set status to `FAILED`. Use Redis to deduplicate webhook events (store processed event IDs with 24h TTL). | L | W2-4 | Done |
| W2-6 | **Redis rate limiting** – Middleware applied to `/api/checkout` and `/api/webhooks/stripe`. Use `ioredis` with a sliding window counter (max 10 checkout attempts per IP per minute). Return 429 with `Retry-After` header on breach. | S | W2-5 | Done |

**Done when:** Buyer can browse products, complete Stripe checkout, and seller receives funds automatically with 5% platform fee deducted.

---

## Week 3 – Dashboards, Orders & Polish

Both sides of the marketplace feel complete. Sellers see their revenue and orders. Buyers see their purchase history and can access digital products. Confirmation emails go out automatically.

**Checkpoint: Day 2** — seller dashboard showing real order data.  
**Checkpoint: Day 4** — buyer order history working, confirmation email sending.

| ID | Task | Scope | Deps | Done |
|---|---|---|---|---|
| W3-1 | **Seller dashboard** – `/seller/dashboard`: stats cards (total revenue, orders this month, active listings, avg order value). Recent orders table (order ID, product name, amount, status badge, date). All data from Prisma queries — no extra API calls. Server component with `revalidate`. | M | W2-5 | Done |
| W3-2 | **Stripe Connect payout balance** – On seller dashboard, call Stripe `balance.retrieve` with `stripeAccountId` to show available payout balance and next payout date. Cache result in Redis for 5 minutes (avoid hammering Stripe API). | S | W3-1 | Done |
| W3-3 | **Buyer order history** – `/orders`: list of buyer's paid orders with product name, seller store, amount, date. Each order has a "Download / access" button (for digital products just show a placeholder success state — no real file delivery needed for MVP). | S | W2-5 | Done|
| W3-4 | **Transactional email** – Use Resend to send two emails: (1) buyer order confirmation on `PAID` webhook (product name, amount, order ID), (2) seller new sale notification (buyer info, product, amount after fee). Trigger from the webhook handler. | M | W2-5 | Done |
| W3-5 | **UI polish** – Loading skeletons on storefront and dashboards. Empty states: no products listed yet, no orders yet. Form validation errors inline (Zod + react-hook-form). Mobile-responsive storefront grid. Proper 404 page. Toast notifications on successful purchase / product save. | M | All W3 | Done |

**Done when:** Seller sees real revenue data and Stripe payout balance. Buyer sees order history. Both receive confirmation emails. UI has no blank flashes or missing states.

---

## Week 4 – Deploy & Impress

Ship it. App live on Railway, full purchase flow works on production, repo is clean, README is strong, and you have a demo to show in interviews.

**Checkpoint: Day 2** — app deployed on Railway, health check green.  
**Checkpoint: Day 4** — full end-to-end purchase flow verified on prod in Stripe test mode.

| ID | Task | Scope | Deps | Done |
|---|---|---|---|---|
| W4-1 | **Docker Compose + Railway deploy** – Finalise `docker-compose.yml` (next app + postgres + redis). Deploy to Railway: create project, add Postgres and Redis plugins, set all env vars. Confirm `GET /api/health` returns 200 on prod URL. Run `prisma migrate deploy` on prod DB. | M | All done | - |
| W4-2 | **Stripe prod config** – Switch to Stripe live mode keys on Railway. Register prod webhook endpoint in Stripe dashboard (`/api/webhooks/stripe`). Re-test full purchase flow with a real card in test mode on prod URL. Confirm seller receives payout minus 5% fee in Stripe dashboard. | M | W4-1 | - |
| W4-3 | **README** – Setup instructions (clone, Docker Compose up, set env vars, seed DB). Architecture diagram (buyer → Next.js → Stripe → seller via Connect). How Stripe Connect split payment works (plain English). Link to Swagger UI (`/api/docs/ui`) with a screenshot of the full route list. Screenshots: storefront, seller dashboard, Stripe payout. Link to live demo. | S | W4-1 | - |
| W4-4 | **Demo video + final cleanup** – Record a 2-min Loom: register as seller → connect Stripe → list a product → buy it as a buyer → show seller dashboard with revenue updated → show Stripe dashboard with split payment. Clean up any console errors, remove debug logs, set proper meta titles. | S | W4-3 | - |

**Done when:** App is live on Railway, full purchase flow works on prod, README has setup instructions and live demo link, and you have a demo video ready to share in interviews.

---

## API Reference

### Auth
```
POST /api/auth/register     { email, password, role } → { user }
POST /api/auth/[...nextauth]  NextAuth handlers (login, session, signout)
```

### Store
```
POST /api/store             { name, description } → { store }
GET  /api/store/:id         store detail + products
```

### Products
```
POST   /api/products              create product (seller only)
PUT    /api/products/:id          update product (owner only)
DELETE /api/products/:id          soft delete (owner only)
GET    /api/products              public listing (search, category filter)
GET    /api/products/:id          product detail
```

### Checkout & Orders
```
POST /api/checkout          { productId } → { stripeCheckoutUrl }
GET  /api/orders            buyer's order history (auth)
POST /api/webhooks/stripe   Stripe webhook (raw body)
```

### Seller
```
GET /api/seller/dashboard   revenue stats + recent orders (seller only)
GET /api/seller/balance     Stripe Connect payout balance (seller only)
```

### Stripe Connect
```
GET /api/stripe/connect         create Stripe account + return onboarding URL
GET /api/stripe/connect/return  handle return from Stripe onboarding
```

### Swagger (dev only)
```
GET /api/docs       OpenAPI 3.0 JSON spec (auto-built from JSDoc comments)
GET /api/docs/ui    Swagger UI — browse and test all endpoints interactively
```
> Add `@swagger` JSDoc comments on every new route file as you build each week. By W4 the UI is a complete, always-up-to-date API reference you can open in an interview to show the full surface area of the project.

---

## Environment Variables

### `.env.local`
```
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/opencart

# NextAuth
NEXTAUTH_SECRET=some-long-random-secret
NEXTAUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
PLATFORM_FEE_PERCENT=5

# Redis
REDIS_URL=redis://localhost:6379

# Cloudinary (image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...

# Resend (email)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# Swagger (set to 'production' on Railway to disable docs endpoint)
NODE_ENV=development
```

---

## Git Workflow

Branch from `develop`. PRs always target `develop`. Never push to `main` directly.

**Branch names:** `feature/W1-3-nextauth` · `feature/W2-5-stripe-webhook` · `fix/W3-2-redis-cache`  
**Commit format:** `feat(W1-3): add NextAuth with role-based middleware` · `fix(W2-5): deduplicate webhook events with Redis`  
**Deploy from `main` only** — merge `develop → main` at the end of each week when the checkpoint is green.

---

## Scope Guard

If you fall behind, cut in this order — lowest impact first:

1. Admin view (W3) — drop entirely, not needed for the demo
2. Resend emails (W3-4) — stub it out, log to console instead
3. Cloudinary image upload — use a placeholder image URL instead
4. Redis rate limiting (W2-6) — remove for MVP, add a TODO comment

**Never cut:** Stripe Connect split payment flow. That is the entire point of this project.

---

## Resume Line

*"Built a multi-vendor digital marketplace with Stripe Connect split payments, role-based multi-tenancy, and Redis-backed rate limiting — deployed on Railway with Next.js, PostgreSQL, and Prisma."*
