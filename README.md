# Food POS — Restaurant Point of Sale

An earlier **Next.js + Prisma** implementation of a restaurant/café point-of-sale system. The repository covers admin workflows, order handling, tables, and QR-based ordering flows.

> **Version note:** This public `master` branch contains the Next.js implementation. It is **not** the newer Laravel + React / Inertia rewrite. The code and setup below describe only what is published in this repository.

**[View project showcase](https://portfolio-naja-andika.vercel.app/#projects)**

## Scope

- Admin dashboard and cashier interfaces.
- Menu, category, order, and payment workflows.
- Restaurant table management and QR table ordering route.
- Staff management, reporting, and settings.
- Role-aware authentication and server-side API routes.
- Automated tests for authentication, validation, and order helpers.

These are source-level features, not a claim that a hosted production environment is available.

## Tech stack

| Layer | Technology |
| --- | --- |
| Application | Next.js 15, React 19, TypeScript |
| Data | Prisma 7, MySQL / MariaDB adapter |
| Validation | Zod |
| Testing | Vitest |
| UI | CSS and Lucide React icons |

## Run locally

Requirements: Node.js compatible with the installed Prisma version, npm, and a local MySQL/MariaDB database.

```bash
git clone https://github.com/najaandika/food-pos.git
cd food-pos
npm ci
cp .env.example .env
```

Set the required environment values in `.env`: `DATABASE_URL`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `AUTH_SECRET`. Use separate, nonproduction credentials.

Then create the database and apply the existing migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

Optional **local-only** demo data:

```bash
npx prisma db seed
```

Start the application:

```bash
npm run dev
```

Run the available tests:

```bash
npm test
```

## Source map

```text
app/
  admin/       # Dashboard, cashier, orders, tables, staff, reporting
  api/         # Auth, orders, payments, menu, tables, and settings routes
  table/[code] # QR table experience
lib/           # Shared database, session, and business helpers
prisma/        # Schema, migrations, and demo seed data
tests/         # Vitest suites
```

**Development note:** The seed data contains example accounts intended for local testing only. Do not deploy demo credentials or example secrets to a production environment.

**Developer portfolio:** https://portfolio-naja-andika.vercel.app/
