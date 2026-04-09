# Managed Hosting Setup

Deploy KegelnWebpage to **Vercel** with **Supabase** PostgreSQL for production.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Vercel (Next.js App)                                   │
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │ Training Routes │  │ Mirror Routes (Search/      │   │
│  │ /api/training/* │  │ Player/Club/Game)          │   │
│  └────────┬────────┘  └─────────────┬─────────────┘   │
└────────────┼───────────────────────────┼────────────────┘
             │                           │
             ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase PostgreSQL                                    │
│  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ Training Data    │  │ Sportwinner Mirror           │ │
│  │ - players        │  │ - player_search_index        │ │
│  │ - sessions       │  │ - club_search_index          │ │
│  │ - trainers       │  │ - games                      │ │
│  │ - messages       │  │ - game_player_rows           │ │
│  └─────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Save the **Database Password** (shown once)
3. Get the **Connection String** from Settings → Database → Connection string

### 2. Set Environment Variables

**Local (.env.local):**
```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

**Vercel:**
- `DATABASE_URL` = your connection string
- `NEXT_PUBLIC_SUPABASE_URL` = `https://[PROJECT-REF].supabase.co`

### 3. Apply Schema

Tables are auto-created by the app, or apply manually:

```bash
psql "$DATABASE_URL" -f supabase/migrations/001_training_tables.sql
psql "$DATABASE_URL" -f supabase/migrations/002_mirror_tables.sql
```

### 4. Sync Local Data to Supabase

```bash
pip install psycopg2-binary
cd mirror-db
python3 ../scripts/sync-to-supabase.py --init
```

This syncs:
- Training data (players, sessions, trainers, messages)
- Sportwinner mirror (games, players, clubs, standings)

### 5. Deploy to Vercel

```bash
git push
```

Vercel automatically builds and deploys. The app reads from Supabase when `DATABASE_URL` is set.

## Keeping Data Fresh

### Option A: Manual Sync

```bash
cd mirror-db
python3 build_db.py --source sportwinner  # Update local mirror
python3 ../scripts/sync-to-supabase.py --mirror  # Push to Supabase
```

### Option B: GitHub Actions (Automated)

The workflow at `.github/workflows/sync-managed-hosting.yml` can sync daily.

**Required GitHub Secrets:**
- `DATABASE_URL`
- `SPORTWINNER_API_URL`

## Project Structure

```
├── lib/
│   ├── postgres.ts           # Database connection pool
│   ├── training-store.ts     # Training data abstraction
│   └── mirror-store.ts      # Sportwinner data abstraction
├── supabase/
│   └── migrations/          # PostgreSQL schemas
│       ├── 001_training_tables.sql
│       └── 002_mirror_tables.sql
├── scripts/
│   └── sync-to-supabase.py  # Data sync script
└── mirror-db/              # Sportwinner data fetcher
    ├── build_db.py         # Build local SQLite mirror
    ├── sources/sportwinner.py
    └── sql/                # SQLite schemas (reference)
```

## Fallback Behavior

When `DATABASE_URL` is **not set**:
- Training routes use local JSON (`lib/server-db.ts`)
- Mirror routes use local SQLite (`lib/mirror-db-server.ts`)

This enables local development without Supabase.

## Troubleshooting

### Connection Errors
- Verify `DATABASE_URL` is correct
- Check Supabase project is not paused
- Ensure SSL is enabled (default)

### RLS Policy Issues
All tables have public read policies for the app. If you need stricter access:
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### Empty Data After Deploy
Run sync script locally first:
```bash
DATABASE_URL="..." python3 scripts/sync-to-supabase.py --init
```
