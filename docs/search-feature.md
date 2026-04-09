# Search Feature Documentation

## Overview

The search feature allows users to find **players** and **clubs** from the Sportwinner database. Search results include game statistics and last match date.

## Architecture

### Data Flow

```
User Input → /api/mirror/search → mirror-store.ts → Supabase PostgreSQL
                                              ↓ (fallback)
                                          local SQLite
```

### Two Data Sources

1. **Supabase PostgreSQL** (production)
   - Pre-indexed search data synced from local mirror
   - Fast `ILIKE` queries on normalized names
   - ~1000+ player entries, 100+ clubs

2. **Local SQLite** (development fallback)
   - `mirror-db/data/sportwinner.db`
   - Same schema, updated via `python3 build_db.py`

## API Endpoints

### Search Players & Clubs

```
GET /api/mirror/search?q={query}
```

**Response:**
```json
{
  "players": [
    {
      "name": "Max Mustermann",
      "club": "KV Berlin",
      "gameCount": 15,
      "lastGameDate": "2024-03-15"
    }
  ],
  "clubs": [
    {
      "name": "KV Berlin",
      "gameCount": 42,
      "lastGameDate": "2024-03-20"
    }
  ]
}
```

### Player Profile

```
GET /api/mirror/player?name={name}
```

Returns game history, statistics, and win/loss/draw record.

### Club Profile

```
GET /api/mirror/club?name={name}
```

Returns club game history and statistics.

### Game Details

```
GET /api/mirror/game?id={gameId}
```

Returns detailed game results with player rows.

## Supabase Schema

### player_search_index

```sql
CREATE TABLE player_search_index (
  player_key TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,  -- lowercase, no special chars
  club_name TEXT,
  game_count INTEGER DEFAULT 0,
  last_game_date TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_player_search_normalized_name ON player_search_index(normalized_name varchar_pattern_ops);
```

### club_search_index

```sql
CREATE TABLE club_search_index (
  club_key TEXT PRIMARY KEY,
  club_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  game_count INTEGER DEFAULT 0,
  last_game_date TEXT
);
```

## Sync Process

### Build Local Mirror

```bash
cd mirror-db
python3 build_db.py --source sportwinner
```

This fetches from Sportwinner API and updates `data/sportwinner.db`.

### Push to Supabase

```bash
python3 ../scripts/sync-to-supabase.py --mirror
```

This replaces the search indexes in Supabase with fresh data.

## Development

### Local Development

1. Build mirror: `cd mirror-db && python3 build_db.py --source sportwinner`
2. Start app: `npm run dev`
3. Search uses local SQLite automatically

### Production

1. Sync runs via GitHub Actions (daily) or manually
2. Vercel reads from Supabase
3. No Python needed at runtime

## Search Algorithm

1. User enters query (e.g., "Müller")
2. Query normalized: `müller` → `%mller%` (removes umlauts, special chars)
3. SQL `ILIKE` search on `normalized_name`
4. Results grouped by player, sorted by `game_count` DESC
5. Limit 12 results per category

## Files

- `app/api/mirror/search/route.ts` - Search API
- `app/api/mirror/player/route.ts` - Player profile API
- `app/api/mirror/club/route.ts` - Club profile API
- `app/api/mirror/game/route.ts` - Game details API
- `lib/mirror-store.ts` - Database abstraction layer
- `lib/postgres.ts` - PostgreSQL connection pool
- `mirror-db/` - Local mirror builder
