# OpenCart

A multi-vendor digital marketplace where sellers list products, buyers purchase them, and Stripe Connect automatically splits payments between the seller and the platform — no manual payouts, no touching money.

Live demo: ... (tobediscussed) · API docs: `/api/docs/ui`

---

## What it does

**As a buyer** — browse products across all sellers, filter by category, purchase via Stripe Checkout, and view your order history.

**As a seller** — connect your Stripe account via Stripe Connect OAuth, list digital products, and watch revenue land in your Stripe dashboard automatically after every sale (minus the 5% platform fee).

**Under the hood** — when a buyer pays $100, Stripe routes $95 to the seller and $5 to the platform in a single transaction. No cron jobs, no manual transfers. That's Stripe Connect.

---

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js (credentials + role-based sessions) |
| Payments | Stripe Connect (Express accounts) |
| Cache / rate limit | Redis (`ioredis`, sliding window) |
| Email | Resend |
| API docs | Swagger UI (`swagger-jsdoc` + `next-swagger-doc`) |
| Deploy | Railway (app + Postgres + Redis) |
| Containerisation | Docker Compose (local dev) |

---

## Architecture

```
Buyer                    Next.js App                    Stripe
  │                          │                             │
  │── POST /api/checkout ───▶│── create Checkout session ─▶│
  │                          │   (transfer_data: seller)   │
  │◀── redirect to Stripe ───│◀── session.url ─────────────│
  │                          │                             │
  │── complete payment ─────────────────────────────────▶ │
  │                          │                             │
  │                          │◀── webhook: session.completed
  │                          │                             │
  │                          │── mark Order PAID           │
  │                          │── email buyer + seller      │
  │                          │                             │
  │                       Seller                        Stripe
  │                    (gets 95%)                   (keeps 5% fee)
```

### How the split payment works

1. Buyer hits "Buy now" → `POST /api/checkout` creates a Stripe Checkout session with two key fields:
   - `transfer_data.destination` = seller's `stripeAccountId`
   - `application_fee_amount` = 5% of the price in cents
2. Stripe handles the payment, takes the platform fee, and transfers the rest to the seller's connected account automatically.
3. Stripe fires a `checkout.session.completed` webhook → app marks the order as `PAID` and sends confirmation emails.
4. Seller sees their balance update in real time on their Stripe dashboard and in the seller dashboard on this app.

No money is ever held by the app itself.

---

## Project structure

```
opencart/
├── app/
│   ├── (buyer)/
│   │   ├── page.tsx                 # storefront — product grid
│   │   ├── products/[id]/page.tsx   # product detail + buy button
│   │   └── orders/page.tsx          # buyer order history
│   ├── (seller)/
│   │   ├── seller/dashboard/        # revenue stats, order list
│   │   ├── seller/products/         # CRUD for listings
│   │   └── seller/onboarding/       # Stripe Connect OAuth flow
│   └── api/
│       ├── auth/                    # NextAuth + register
│       ├── products/                # listing CRUD
│       ├── checkout/                # Stripe session creation
│       ├── webhooks/stripe/         # webhook handler
│       ├── orders/                  # buyer order history
│       ├── seller/                  # dashboard + balance
│       ├── stripe/connect/          # Connect onboarding
│       ├── store/                   # store CRUD
│       ├── health/                  # GET /api/health
│       └── docs/                    # Swagger JSON + UI
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── lib/
│   ├── prisma.ts                    # Prisma client singleton
│   ├── redis.ts                     # ioredis client
│   ├── stripe.ts                    # Stripe client
│   ├── swagger.ts                   # OpenAPI spec builder
│   └── email.ts                     # Resend helpers
├── components/
├── docker-compose.yml
├── Dockerfile
└── .env.local
```

---

## Data models

```prisma
model User {
  id               String   @id @default(cuid())
  email            String   @unique
  passwordHash     String
  role             Role     @default(BUYER)   // BUYER | SELLER | ADMIN
  stripeAccountId  String?
  stripeOnboarded  Boolean  @default(false)
  store            Store?
  orders           Order[]
  createdAt        DateTime @default(now())
}

model Store {
  id          String    @id @default(cuid())
  sellerId    String    @unique
  seller      User      @relation(fields: [sellerId], references: [id])
  name        String
  description String?
  products    Product[]
  createdAt   DateTime  @default(now())
}

model Product {
  id          String   @id @default(cuid())
  storeId     String
  store       Store    @relation(fields: [storeId], references: [id])
  name        String
  description String
  price       Int      // in cents
  imageUrl    String?
  category    String?
  active      Boolean  @default(true)
  orders      Order[]
  createdAt   DateTime @default(now())
}

model Order {
  id               String      @id @default(cuid())
  buyerId          String
  buyer            User        @relation(fields: [buyerId], references: [id])
  productId        String
  product          Product     @relation(fields: [productId], references: [id])
  sellerId         String
  stripeSessionId  String      @unique
  amountTotal      Int         // in cents
  platformFee      Int         // in cents (5%)
  status           OrderStatus @default(PENDING)  // PENDING | PAID | FAILED
  createdAt        DateTime    @default(now())
}
```

---

## API reference

Full interactive docs available at `http://localhost:3000/api/docs/ui` (dev only).

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | — | Health check |
| `POST` | `/api/auth/register` | — | Register as buyer or seller |
| `POST` | `/api/auth/[...nextauth]` | — | NextAuth login / session / signout |
| `POST` | `/api/store` | Seller | Create store |
| `GET` | `/api/store/:id` | — | Store detail + products |
| `GET` | `/api/products` | — | Browse all products (search, filter) |
| `GET` | `/api/products/:id` | — | Product detail |
| `POST` | `/api/products` | Seller | Create product listing |
| `PUT` | `/api/products/:id` | Seller (owner) | Update product |
| `DELETE` | `/api/products/:id` | Seller (owner) | Soft delete product |
| `POST` | `/api/checkout` | Buyer | Create Stripe Checkout session |
| `POST` | `/api/webhooks/stripe` | Stripe | Handle payment events |
| `GET` | `/api/orders` | Buyer | Order history |
| `GET` | `/api/seller/dashboard` | Seller | Revenue stats + recent orders |
| `GET` | `/api/seller/balance` | Seller | Stripe Connect payout balance |
| `GET` | `/api/stripe/connect` | Seller | Start Stripe Connect onboarding |
| `GET` | `/api/stripe/connect/return` | Seller | Handle return from Stripe |
| `GET` | `/api/docs` | Dev only | OpenAPI 3.0 JSON spec |
| `GET` | `/api/docs/ui` | Dev only | Swagger UI |

---

## Running locally

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- A [Stripe account](https://stripe.com) (free) with Connect enabled
- A [Resend account](https://resend.com) (free tier)
- A [Cloudinary account](https://cloudinary.com) (free tier)

### 1. Clone and install

```bash
git clone https://github.com/yourusername/opencart.git
cd opencart
npm install
```

### 2. Set environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/opencart

# NextAuth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
PLATFORM_FEE_PERCENT=5

# Redis
REDIS_URL=redis://localhost:6379

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...

# Resend
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# Environment
NODE_ENV=development
```

### 3. Start Postgres and Redis

```bash
docker-compose up -d
```

### 4. Run database migrations

```bash
npx prisma migrate dev
npx prisma generate
```

Optionally seed with sample data:

```bash
npx prisma db seed
```

### 5. Start the Stripe webhook listener

In a separate terminal (requires [Stripe CLI](https://stripe.com/docs/stripe-cli)):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret it prints and set it as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
Swagger UI: [http://localhost:3000/api/docs/ui](http://localhost:3000/api/docs/ui)

---

## Testing the payment flow locally

Stripe provides test card numbers — no real money is involved.

1. Register as a **seller**, complete Stripe Connect onboarding (use test mode)
2. Create a store and list a product
3. Open an incognito tab, register as a **buyer**
4. Purchase the product using Stripe test card `4242 4242 4242 4242` (any future expiry, any CVC)
5. Check the seller dashboard — revenue should update
6. Check your Stripe dashboard → Connected accounts → the seller's balance should show the transfer minus 5%

---

## Deploying to Railway

### 1. Create a Railway project

```bash
npm install -g @railway/cli
railway login
railway init
```

### 2. Add Postgres and Redis plugins

In the Railway dashboard, add a **PostgreSQL** plugin and a **Redis** plugin to your project. Railway injects `DATABASE_URL` and `REDIS_URL` automatically.

### 3. Set environment variables

In Railway dashboard → Variables, add all keys from `.env.local` (except `DATABASE_URL` and `REDIS_URL` — Railway sets those).

Set `NODE_ENV=production` to disable the Swagger UI endpoint on prod.

### 4. Deploy

```bash
railway up
```

### 5. Run migrations on prod

```bash
railway run npx prisma migrate deploy
```

### 6. Register the Stripe webhook

In your Stripe dashboard → Webhooks → Add endpoint:
- URL: `https://your-app.up.railway.app/api/webhooks/stripe`
- Events: `checkout.session.completed`, `checkout.session.expired`

Copy the signing secret and add it as `STRIPE_WEBHOOK_SECRET` in Railway variables.

---

## Screenshots

### Storefront
![Storefront](docs/screenshots/storefront.png)

### Seller dashboard
![Seller dashboard](docs/screenshots/seller-dashboard.png)

### Stripe Connect payout
![Stripe payout](docs/screenshots/stripe-payout.png)

### Swagger UI
![Swagger UI](docs/screenshots/swagger-ui.png)

---

## Scope and known limitations

This is an MVP scoped for a solo 4-week build. Things intentionally left out:

- No real digital file delivery — "Download" button is a placeholder
- No admin dashboard UI (data is accessible via Prisma Studio: `npx prisma studio`)
- No search ranking or recommendation engine
- No refund flow (can be triggered manually from the Stripe dashboard)

---

## License

MIT
