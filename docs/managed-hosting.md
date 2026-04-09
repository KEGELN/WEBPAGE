# Managed Hosting Setup

This project can now run with:

- Vercel for the Next.js app
- Neon or Supabase Postgres for app-owned training data
- a second Neon or Supabase Postgres database for the Sportwinner mirror
- GitHub Actions for mirror refresh

## 1. Create databases

Create either:

- one Postgres database and use it for both `DATABASE_URL` and `MIRROR_DATABASE_URL`

or:

- one Postgres database for training data
- one Postgres database for the Sportwinner mirror

Recommended:

- `DATABASE_URL` for training/auth/session data
- `MIRROR_DATABASE_URL` for mirrored Sportwinner data

## 2. Configure Vercel

Add these environment variables in Vercel:

- `DATABASE_URL`
- `MIRROR_DATABASE_URL`
- `SPORTWINNER_API_URL`
- `SPORTWINNER_REFERER`
- `PGSSL`

Use `PGSSL=disable` only if your provider requires it. Neon and Supabase usually work with SSL enabled.

## 3. Apply schema

Run locally once:

```bash
npm install
npm run db:apply-schema
```

This applies:

- [db/training-postgres.sql](/home/lemon/projects/KegelnWebpage/WEBPAGE/db/training-postgres.sql)
- [db/mirror-postgres.sql](/home/lemon/projects/KegelnWebpage/WEBPAGE/db/mirror-postgres.sql)

## 4. Import training data

This moves the current JSON-backed training data into Postgres:

```bash
npm run db:import-training
```

If your JSON file is elsewhere:

```bash
TRAINING_JSON_PATH=/path/to/training_db.json npm run db:import-training
```

## 5. Build and import Sportwinner mirror

Build the local SQLite mirror first:

```bash
python3 mirror-db/initdb.py
python3 mirror-db/build_db.py --source sportwinner
```

Then import it into Postgres:

```bash
npm run db:import-mirror
```

## 6. Configure GitHub Actions

Add these repository secrets:

- `DATABASE_URL`
- `MIRROR_DATABASE_URL`
- `SPORTWINNER_API_URL`
- `SPORTWINNER_REFERER`

The sync workflow is:

- [sync-managed-hosting.yml](/home/lemon/projects/KegelnWebpage/WEBPAGE/.github/workflows/sync-managed-hosting.yml)

It:

1. builds the current Sportwinner season with Python
2. applies Postgres schema
3. imports training JSON
4. imports the mirror into Postgres

## 7. Deploy app

Deploy the app to Vercel normally. When `DATABASE_URL` and `MIRROR_DATABASE_URL` are set:

- training routes use Postgres through [lib/training-store.ts](/home/lemon/projects/KegelnWebpage/WEBPAGE/lib/training-store.ts)
- mirror search/player/club/game routes use Postgres through [lib/mirror-store.ts](/home/lemon/projects/KegelnWebpage/WEBPAGE/lib/mirror-store.ts)
- the app no longer depends on Python in the request path

## 8. Fallback behavior

If the Postgres env vars are missing:

- training falls back to [lib/server-db.ts](/home/lemon/projects/KegelnWebpage/WEBPAGE/lib/server-db.ts)
- mirror routes fall back to [lib/mirror-db-server.ts](/home/lemon/projects/KegelnWebpage/WEBPAGE/lib/mirror-db-server.ts)

That fallback is useful for local development, but not the intended production setup.
