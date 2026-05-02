# SKVB Kegel Web — Developer README

Statistics and training portal for the **SKVB** (Sächsischer Kegelverband Berlin) bowling league.  
Built with **Next.js 16 App Router**, **TypeScript**, **Tailwind CSS v4**, and **Supabase/PostgreSQL**.

---

## Quick Start

```bash
cp .env.example .env.local   # fill in DB credentials
npm install                  # or: bun install
npm run dev                  # http://localhost:3000
```

---

## Architecture

```
Browser
  │
  ├─ Next.js App Router (app/)
  │    ├─ Server Components  ──► lib/api-service.ts  ──► /api/sportwinner  ──► skvb.sportwinner.de
  │    │                                              ──► /api/mirror/*    ──► PostgreSQL (mirror)
  │    ├─ Client Components
  │    └─ API Routes (app/api/)
  │
  └─ Data Layer
       ├─ Sportwinner API  — live league data (proxied, CORS-safe)
       ├─ Mirror DB        — PostgreSQL snapshot of Sportwinner data
       └─ Training DB      — JSON flat-file + PostgreSQL (trainer sessions)
```

### Three Data Domains

| Domain | Source | Lib entry point |
|--------|--------|-----------------|
| **Sportwinner** | `skvb.sportwinner.de` (live proxy) | `lib/api-service.ts` → `server/` |
| **Mirror DB** | PostgreSQL (`MIRROR_DATABASE_URL`) | `lib/mirror-store.ts` / `lib/mirror-db-server.ts` |
| **Training DB** | `data/training_db.json` + PostgreSQL | `lib/server-db.ts` / `lib/training-store.ts` |

`lib/api-service.ts` is the unified client — it routes through the Mirror DB first and falls back to the live Sportwinner proxy.  
Player and club keys are **base64url encoded** strings of the player/club name for stable URL IDs.

---

## API Reference

All routes are under `/api/`. All responses are JSON.

### Sportwinner Proxy

**`POST /api/sportwinner`** or **`GET /api/sportwinner?command=…`**

Proxies commands to the SportWinner backend. The body (POST) or query string (GET) is forwarded as-is.

| Command | Description |
|---------|-------------|
| `GetSaisonArray` | List all seasons |
| `GetKlub` | Club info by ID |
| `GetBezirkArray` | List districts |
| `GetLigaArray` | List leagues for a season/district |
| `GetSpiel` | Game details |
| `GetTabelle` | League standings table |
| `GetSchnitt` | Player averages |
| `GetSpieltagArray` | Matchdays for a league |

---

### Mirror DB

**`GET /api/mirror/search?q={query}`**  
Search players and clubs across the mirror DB + local Sportwinner data.

```json
{
  "players": [{ "key": "<base64url>", "name": "...", "clubName": "...", "gameCount": 42 }],
  "clubs":   [{ "id": "<base64url>", "name": "...", "gameCount": 10, "lastGameDate": "..." }]
}
```

**`GET /api/mirror/player?key={base64url}`**  
Full player profile including game history, averages, head-to-head stats.

**`GET /api/mirror/club?name={clubName}`**  
Club profile with roster and game results.

**`GET /api/mirror/game?id={gameId}`**  
Full game detail including lane-by-lane scores for all players.

---

### Training

**`POST /api/training/auth`** — Trainer login (email + password).  
**`GET /api/training/players`** — List players for authenticated trainer.  
**`GET/POST /api/training/sessions`** — Training session CRUD.  
**`GET/POST /api/training/messages`** — Trainer ↔ player messages.  
**`POST /api/training/share`** — Create shareable session link.  
**`GET/POST /api/training/magic-token`** — Passwordless player login tokens.

---

### Analysis & ELO

**`GET /api/elo?player={name}`**  
ELO rating history for a player. Reads from a pre-built dataset in `data/`.

```json
{
  "playerName": "...",
  "currentElo": 1523,
  "peakElo": 1601,
  "totalGames": 88,
  "winRate": 0.61,
  "avgKegel": 487,
  "history": [{ "date": "2024-09-14", "elo": 1480, "opponent": "...", "result": 1 }]
}
```

**`POST /api/analyse`** — Send analysis/feedback email via Resend.

**`GET/POST /api/admin/spielbericht`** — Game report management (admin only).  
**`GET/POST/DELETE /api/admin/todos`** — Internal todo list.

---

### Berlin Leagues

**`GET /api/berlin?league={berlinliga|vereinsliga}`**  
Serves scraped Berlin league data from `data/*.csv` files (included in Vercel serverless output via `next.config.ts`).

---

## Database Setup

```bash
# Apply schema to Supabase/Neon
npm run db:apply-schema

# Import mirror SQLite snapshot → PostgreSQL
npm run db:import-mirror

# Import training JSON → PostgreSQL
npm run db:import-training
```

### Connection pools (`lib/postgres.ts`)

- `getTrainingPool()` — uses `DATABASE_URL`
- `getMirrorPool()` — uses `MIRROR_DATABASE_URL`, falls back to `DATABASE_URL`
- SSL is always enabled (`rejectUnauthorized: false`) — required for Supabase pooler
- Pool size: **2** on Vercel, **5** locally

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Supabase/Neon) |
| `MIRROR_DATABASE_URL` | No | Separate DB for mirror data (defaults to `DATABASE_URL`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `SPORTWINNER_API_URL` | No | Sportwinner proxy target (default: `skvb.sportwinner.de`) |
| `SPORTWINNER_TIMEOUT_MS` | No | Proxy timeout in ms (default: 4500) |

---

## App Routes

| Path | Description |
|------|-------------|
| `/` | Redirects to `/home` |
| `/home` | Dashboard — search, ranking changes, ICS calendar export |
| `/search?q=` | Player and club search results |
| `/player?pid=` | Player profile (base64url encoded ID) |
| `/club?name=` | Club profile |
| `/clubs` | Club directory |
| `/compare?pid1=&pid2=` | Side-by-side player comparison |
| `/scores` | League standings |
| `/analyse` | Statistical analysis tools |
| `/berlin` | Berlin league data (scraped) |
| `/training` | Trainer portal — session recording |
| `/trainer` | Trainer dashboard |
| `/admin` | Admin tools |
| `/login` | Authentication (Supabase) |
| `/impressum` | Legal notice |
| `/privacy` / `/tos` | Privacy policy and terms |

---

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/build_berlin_csv.py` | Scrape Berlin league data → CSV |
| `scripts/sync_berlin_data.py` | Sync scraped Berlin data |
| `scripts/sync-to-supabase.py` | Push mirror SQLite → Supabase |
| `scripts/build_pvp_dataset.py` | Build player-vs-player dataset |
| `scripts/export_season_dataset.py` | Export season data for ELO calculation |
| `scripts/sync-todos.mjs` | Sync todo.org → admin DB |

---

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript 5
- **Styling**: Tailwind CSS v4, shadcn/ui, GSAP animations
- **Database**: PostgreSQL via `pg` (Supabase/Neon), SQLite mirror snapshot
- **Auth**: Supabase Auth
- **Email**: Resend
- **Analytics**: Vercel Analytics
- **Deployment**: Vercel

---

## Design Resources

- Components: [shadcn/ui](https://ui.shadcn.com/)
- Animation inspiration: [reactbits.dev](https://reactbits.dev/)
