# Supabase Setup Guide

Specific steps for setting up Supabase as the PostgreSQL backend.

## Prerequisites

- Supabase account at [supabase.com](https://supabase.com)
- Node.js 18+ and Python 3.10+

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and click "New Project"
2. Name it "Kegeln" or similar
3. Set a strong database password (save this!)
4. Choose a region near your users
5. Wait for project creation (~2 minutes)

## Step 2: Get Connection String

1. Go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Copy the **URI** format:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

## Step 3: Set Local Environment

```bash
# Copy example env file
cp .env.example .env.local

# Edit with your values
nano .env.local
```

Required variables:
```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

## Step 4: Install Dependencies

```bash
npm install
pip install psycopg2-binary  # For sync script
```

## Step 5: Create Tables

Apply the migration files:

```bash
# Connect to Supabase and create tables
psql "$DATABASE_URL" -f supabase/migrations/001_training_tables.sql
psql "$DATABASE_URL" -f supabase/migrations/002_mirror_tables.sql
```

Or use the sync script which creates tables automatically:

```bash
cd mirror-db
python3 ../scripts/sync-to-supabase.py --init
```

## Step 6: Sync Existing Data

If you have local data in `mirror-db/data/`:

```bash
cd mirror-db
python3 ../scripts/sync-to-supabase.py --init
```

This uploads:
- Training players, sessions, trainers, messages
- 842 games, 1079 player entries, 114 clubs

## Step 7: Configure Vercel

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add:
   - `DATABASE_URL` = connection string from Supabase
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
3. Redeploy or push new commit

## Supabase Dashboard Overview

### Database
- **Tables** - View and manage your data
- **SQL Editor** - Run queries directly
- **Backups** - Automatic daily backups (Pro plan)

### Authentication
Not currently used, but available for future auth integration.

### API
- **REST** - `https://[REF].supabase.co/rest/v1/`
- **Auth** - `https://[REF].supabase.co/auth/v1/`
- **Storage** - For future file uploads

## Connection Pooling

Supabase uses PgBouncer for connection pooling. The free tier allows:
- 60 concurrent connections
- 500MB RAM

For Vercel (serverless), connections are pooled automatically by the `pg` library.

## Row Level Security (RLS)

All tables have RLS enabled with public read/write policies:

```sql
-- Example policy
CREATE POLICY "Public read" ON table_name FOR SELECT USING (true);
CREATE POLICY "Service write" ON table_name FOR INSERT WITH CHECK (true);
```

This is safe because:
- Training data is app-specific, not user-specific
- Sportwinner data is public competition info
- No sensitive user data stored

## Monitoring

In Supabase dashboard:
- **Database** → **Logs** - Query performance
- **Project Settings** → **Usage** - API request counts
- **Database** → **Extensions** - Enable `pg_stat_statements` for query analysis

## Troubleshooting

### "Connection refused" error
- Check DATABASE_URL format is correct
- Verify project is not paused (free tier sleeps after inactivity)

### "SSL required" error
- Add `?sslmode=require` to connection string
- Or set `PGSSLMODE=require` environment variable

### Slow queries
- Check indexes exist on frequently queried columns
- Use EXPLAIN ANALYZE in SQL Editor to debug
