# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build (uses --webpack flag)
npm run lint         # ESLint
npm run db:apply-schema   # Apply PostgreSQL schema (Supabase)
npm run db:import-mirror  # Import mirror SQLite data into Postgres
npm run db:import-training # Import training JSON into Postgres
```

The project uses `bun.lock` — prefer `bun` for installing packages, but `npm` works too.

## Architecture Overview

This is a **Next.js 16 App Router** project for a German bowling (Kegeln) league statistics website (SKVB).

### Data Sources

There are three distinct data domains:

1. **Sportwinner API** (`lib/api-service.ts`) — Live league data from `skvb.sportwinner.de`. The Next.js API route `/api/sportwinner` proxies requests to avoid CORS. Player/club keys from Sportwinner are base64url encoded for use in URLs.

2. **Mirror DB** (`lib/mirror-store.ts`, `lib/mirror-db-server.ts`) — A local SQLite snapshot of Sportwinner data (`data/mirror_sportwinner.db`) exposed via PostgreSQL (`MIRROR_DATABASE_URL`). API routes at `/api/mirror/*` serve search, player profiles, club profiles, and game details. The `lib/api-service.ts` wraps these with a unified interface, routing through the mirror instead of live Sportwinner when available.

3. **Training DB** (`lib/server-db.ts`) — A JSON flat-file database (`data/training_db.json`) for trainer-managed training sessions, players, and clubs. Persisted server-side via `/api/training/*` routes. Also mirrored to PostgreSQL (`DATABASE_URL`) when configured.

### Database Connectivity (`lib/postgres.ts`)

- `getTrainingPool()` — uses `DATABASE_URL` (Supabase/Neon)
- `getMirrorPool()` — uses `MIRROR_DATABASE_URL` or falls back to `DATABASE_URL`
- SSL is always enabled with `rejectUnauthorized: false` (required for Supabase pooler)
- Pool size is 2 on Vercel, 5 locally

### App Routes

| Route | Purpose |
|-------|---------|
| `/home` | Dashboard with search, ICS export, ranking changes |
| `/search` | Player/club search results |
| `/player` | Detailed player profile (via `?pid=` or `?pn=`) |
| `/club`, `/clubs` | Club profiles and directory |
| `/compare` | Side-by-side player comparison |
| `/scores` | Score tables |
| `/analyse` | Statistical analysis |
| `/berlin` | Berlin-specific league data (scraped CSV) |
| `/training` | Trainer portal — session recording, player management |
| `/trainer` | Trainer dashboard |
| `/admin` | Admin tools |
| `/login` | Auth (Supabase) |

### Key Libraries

- `lib/i18n.ts` — Translation system (DE/EN), context in `contexts/`
- `lib/theme-context.tsx` — Dark/light theme
- `lib/client-settings.ts` — User preference persistence
- `lib/training-store.ts` — Client-side training state
- `components/` — Shared UI components (shadcn/ui based, `components.json`)

### Scripts

- `scripts/build_berlin_csv.py` — Scrapes Berlin league data into CSV
- `scripts/sync_berlin_data.py` — Syncs scraped data
- `scripts/sync-to-supabase.py` — Pushes mirror DB to Supabase
- `scripts/db/` — Node.js scripts for schema and data import

### Environment Variables

See `.env.example`. Key vars:
- `DATABASE_URL` — Supabase/Neon PostgreSQL (training data)
- `MIRROR_DATABASE_URL` — Optional separate DB for mirror data
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase auth
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase admin
- `SPORTWINNER_API_URL` — Sportwinner proxy target

### Deployment

Deployed on Vercel. `vercel.json` is minimal. `next.config.ts` includes `data/**` files in serverless output for the Berlin scraping route.
