# File Map

## Root

- `app/`: Next.js routes, layouts, and API route handlers
- `components/`: UI components (navigation, loading, theme toggle, bento cards)
- `lib/`: client-side services, context providers, utilities
- `server/`: server-side SportWinner API wrapper and command handler
- `translations/`: language dictionaries (`en.json`, `de.json`)
- `public/`: static assets for Next.js public serving
- `images/` and `app/images/`: image assets used by components/pages
- `docs/`: older docs (legacy)
- `doc/`: current project map and behavior docs

## App Routes (`app/`)

- `app/layout.tsx`
- Root HTML wrapper, font setup, theme bootstrapping script, `ThemeProvider`

- `app/page.tsx`
- Main landing page with sections and quick links

- `app/home/page.tsx`
- Minimal test-like page (currently just an image)

- `app/search/page.tsx` and `app/search/SearchClient.tsx`
- Query-driven search page (`?q=...`) with filters and result rendering

- `app/scores/page.tsx`
- Main scores page:
- league/season/matchday filters
- standings table (`GetTabelle`)
- player averages table (`GetSchnitt`)

- `app/tournaments/page.tsx`
- Match schedule page:
- groups by Spieltag
- expandable match rows
- per-game player details and notes

- `app/player/page.tsx` and `app/player/PlayerClient.tsx`
- Player view route, currently placeholder-style details fetched from `PlayerService.getPlayerStats()`

- `app/berlin/page.tsx`
- Temporary scraper-backed page for Berlinliga/Vereinsliga (Kleeblatt source)

- `app/api/sportwinner/route.ts`
- Local API endpoint used by frontend service calls
- receives form/query params
- maps `command` to server methods
- returns JSON arrays in SportWinner-compatible shape

- `app/api/berlin/route.ts`
- Temporary endpoint for scraped Kleeblatt league data

## UI Components (`components/`)

- `components/menubar.tsx`
- Top nav with desktop/mobile links, search form, and theme toggle

- `components/ThemeToggle.tsx`
- Cycles `default -> dark -> light` via `ThemeContext`

- `components/LoadingSpinner.tsx`
- Shared loading UI for page-level and overlay loading states

- `components/MagicBento.jsx`, `components/MagicBento.css`, `components/ResultBentoCard.tsx`, `components/PlayerStatsBento.tsx`
- Bento-style UI blocks and effects (partially used)

- `components/LanguageSelector.tsx`
- Present in repo, but global i18n wiring is not active in layout

## Client Services and Context (`lib/`)

- `lib/api-service.ts`
- Core frontend service singleton
- calls local route `/api/sportwinner`
- provides methods like:
- `getCurrentSeason`, `getLeagues`, `getSpieltage`, `getSpielplan`, `getStandingsRaw`, `getFullPlayerStats`

- `lib/player-service.ts`
- Thin wrapper over `ApiService` for player-related page logic
- `getPlayerStats` currently returns placeholder values

- `lib/temporary-berlin/`
- Temporary integration module for `/berlin` route and parsing
- includes PDF player-table extraction via `pdf-parse` (`pdf-parser.ts`)

- `lib/theme-context.tsx`
- Theme state and localStorage persistence

- `lib/i18n.ts`
- Translation context and `t()` resolver (currently not mounted globally)

- `lib/utils.ts`
- Utility helpers (Tailwind class merging)

## Server Layer (`server/`)

- `server/api-handler.ts`
- Connects to external SportWinner endpoint
- uses `unstable_cache` (1 hour revalidate) for command responses
- command dispatch helper: `handleCommand(command, params)`

- `server/index.ts`
- Exports `apiHandler` singleton used by route handler

- `server/player-handler.ts`
- Deprecated placeholder file
