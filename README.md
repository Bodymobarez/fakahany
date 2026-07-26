# Fruits & Vegs (Fresh Harvest UAE)

Monorepo for the Fresh Harvest e-commerce platform: API, admin dashboard, customer mobile app, and driver app.

## Apps & packages

| Path | Package | Description |
|------|---------|-------------|
| `apps/web` | `@fv/web` | Next.js 15 customer storefront (port 3000) |
| `apps/api` | `@fv/api` | Express + Prisma API (port 4000) |
| `apps/admin` | `@fv/admin` | Next.js 15 admin dashboard (port 3001) |
| `apps/mobile` | `@fv/mobile` | Expo customer app (iOS + Android, separate from web) |
| `apps/driver` | `@fv/driver` | Expo driver app (separate from customer mobile) |
| `packages/shared` | `@fv/shared` | Shared types, enums, money helpers |
| `packages/ui` | `@fv/ui` | Shared UI (`Price`, AED symbol) |
| `packages/config` | `@fv/config` | Shared TypeScript config |

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) 9.x
- Docker (recommended) **or** local PostgreSQL 16
- Redis optional (queues fall back in-process)

## Setup

### 1. Database

**Option A — Docker Compose**

```bash
docker compose up -d
```

Starts Postgres (`localhost:5432`, user/pass/db: `fv` / `fv_local` / `fruits_vegs`) and Redis (`6379`).

**Option B — Project-local Postgres (Windows, no Docker)**

Uses PostgreSQL binaries already installed on the machine, data dir `.data/postgres`, port **5433**:

```powershell
powershell -File scripts/db-start.ps1
```

`.env` default: `postgresql://fv@localhost:5433/fruits_vegs?schema=public` (trust auth).

**Option C — Your own Postgres**

Create a database matching `DATABASE_URL` in `.env.example`.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment

```bash
cp .env.example .env
```

Adjust secrets as needed. Admin uses `NEXT_PUBLIC_API_URL`; Expo apps read `API_URL` from `app.json` `extra` / `EXPO_PUBLIC_API_URL`.

### 4. Migrate & seed

```bash
pnpm db:generate
# first time / schema sync:
pnpm --filter @fv/api exec prisma db push
pnpm db:seed
```

Seed admin: `admin@freshharvest.ae` / `Admin123!`

### 5. Develop

```bash
pnpm dev
```

Turbo runs workspace `dev` scripts in parallel (API + admin, etc.).

Individual apps:

```bash
pnpm --filter @fv/api dev
pnpm --filter @fv/web dev
pnpm --filter @fv/admin dev
pnpm mobile          # Expo customer app (iOS/Android)
pnpm mobile:android
pnpm mobile:ios
pnpm driver          # Expo driver app (separate)
```

Customer mobile docs: [`apps/mobile/README.md`](apps/mobile/README.md). Web and mobile share the same API but keep **separate UI code**.

## Currency display

UI prices use the official UAE Dirham symbol (`AedSymbol` / `Price` from `@fv/ui`), not the text "AED". API currency code remains `AED`.

## Default ports

- API: `http://localhost:4000`
- Admin: `http://localhost:3001`
- Customer web (if added later): `3000`

## License

Private — all rights reserved.
