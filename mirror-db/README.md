# mirror-db

Python mirror/build tooling for two local databases:

- `sportwinner.db`
- `training.db`

The goal is to keep a local mirror of Sportwinner data, replace the JSON training store with a real database, and make player/club search plus historical game/result queries possible without depending on live UI fetches.

## What it builds

### `sportwinner.db`
- seasons
- districts
- leagues
- matchdays
- games
- raw upstream payloads
- standings snapshots
- detailed result rows from `GetSpielerInfo`
- player search index
- club search index

### `training.db`
- players
- trainers
- training sessions
- training throws
- trainer messages

## Why two databases

The app owns training data, while Sportwinner is an external upstream system. Keeping them separate makes sync, backups, migrations, and production hosting simpler.

## Commands

Initialize both databases:

```bash
python3 mirror-db/initdb.py
```

Import training JSON and current Sportwinner season:

```bash
python3 mirror-db/build_db.py --source all
```

Full rebuild of all Sportwinner seasons plus training reimport:

```bash
python3 mirror-db/build_db.py --source all --full-refresh --all-seasons
```

Only rebuild Sportwinner and force completed-game detail refresh:

```bash
python3 mirror-db/build_db.py --source sportwinner --force-details
```

Search data locally:

```bash
python3 mirror-db/query_db.py search-players "Noack"
python3 mirror-db/query_db.py search-clubs "Tauer"
python3 mirror-db/query_db.py player-history "Noack, Matthias"
python3 mirror-db/query_db.py club-history "SV 1920 Tauer I"
python3 mirror-db/query_db.py game-detail 269214
python3 mirror-db/query_db.py training-summary P-HCEEV0
```

Create production snapshots for later upload/sync:

```bash
python3 mirror-db/sync_prod.py
```

## Update policy

Default incremental behavior:
- fetch seasons
- detect current season from `GetSaisonArray`
- only sync the current season
- old seasons are left untouched

Full rebuild behavior:
- use `--full-refresh --all-seasons`
- clears the local Sportwinner mirror and imports every season returned by the API

This matches the repo requirement that old seasons do not change in normal updates.

## Data sources used

The builder follows the local project docs and current app behavior:

- [api.org](../api.org)
- [sportwinner.js](../sportwinner.js)
- [lib/api-service.ts](../lib/api-service.ts)

Main Sportwinner commands mirrored:
- `GetSaisonArray`
- `GetBezirkArray`
- `GetLigaArray`
- `GetSpieltagArray`
- `GetSpielplan`
- `GetSpiel`
- `GetTabelle`
- `GetSpielerInfo`

## Production / Vercel notes

The intended managed-hosting setup is now:

- Vercel serves the Next.js app
- `DATABASE_URL` stores training data in hosted Postgres
- `MIRROR_DATABASE_URL` stores the Sportwinner mirror in hosted Postgres
- GitHub Actions runs the Python mirror build and then imports it into Postgres

That means:
- request-time app code no longer needs Python when the Postgres URLs are configured
- Vercel does not depend on local SQLite persistence
- only the offline sync/build worker uses Python and local SQLite as an intermediate build format

### Managed-hosting flow

1. Create Postgres databases on Neon or Supabase
2. Set `DATABASE_URL` and `MIRROR_DATABASE_URL` in Vercel
3. Set the same secrets in GitHub Actions
4. Apply schema:

```bash
npm run db:apply-schema
```

5. Import current app-owned training data:

```bash
npm run db:import-training
```

6. Build and import the Sportwinner mirror:

```bash
python3 mirror-db/initdb.py
python3 mirror-db/build_db.py --source sportwinner
npm run db:import-mirror
```

7. Let `.github/workflows/sync-managed-hosting.yml` keep the mirror current

`sync_prod.py` remains useful for snapshot artifacts, but the primary production target is now hosted Postgres.

## Environment variables

- `MIRROR_DB_SPORTWINNER_PATH`
- `MIRROR_DB_TRAINING_PATH`
- `MIRROR_DB_TRAINING_JSON`
- `SPORTWINNER_API_URL`
- `SPORTWINNER_REFERER`
- `SPORTWINNER_TIMEOUT_SECONDS`
- `SPORTWINNER_SLEEP_SECONDS`
- `MIRROR_DB_PROD_SNAPSHOT_DIR`
- `DATABASE_URL`
- `MIRROR_DATABASE_URL`
- `PGSSL`
