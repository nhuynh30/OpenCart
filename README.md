# OpenCart

A multi-vendor marketplace built with Next.js, Prisma, Stripe Connect, and PostgreSQL.

**Live demo:** [open-cart-fawn.vercel.app](https://open-cart-fawn.vercel.app/)

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Docker](https://www.docker.com/)
- [Stripe CLI](https://docs.stripe.com/stripe-cli) (for testing webhooks locally)

## Getting Started

### 1. Clone the repo and install dependencies

```bash
git clone https://github.com/nhuynh30/opencart.git
cd opencart
npm install
```

### 2. Set up environment variables

Copy `.env.example` or create a `.env` file with the following:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/opencart"
NEXTAUTH_SECRET=changeme
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET_NAME=your_s3_bucket_name
```

### 3. Start Docker containers (Postgres + Redis)

```bash
docker compose up -d
```

### 4. Run database migrations and generate Prisma client

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### 6. (Optional) Start Stripe webhook listener

In a separate terminal:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_` secret it outputs into your `.env` as `STRIPE_WEBHOOK_SECRET`.

## Useful Commands

| Command | Description |
|---|---|
| `docker compose up -d` | Start Postgres and Redis |
| `docker compose down` | Stop containers |
| `npx prisma studio` | Open database GUI at http://localhost:5555 |
| `npx prisma migrate dev` | Run pending migrations |
| `npm run dev` | Start Next.js dev server |

## API Docs

Swagger UI is available in development at [http://localhost:3000/api/docs/ui](http://localhost:3000/api/docs/ui).
