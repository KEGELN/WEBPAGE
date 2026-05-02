# Data Flow

## End-to-End Request Path

1. User opens a page like `"/scores"` or `"/tournaments"`.
2. Client component calls methods in `lib/api-service.ts`.
3. `ApiService` sends a POST to local route `"/api/sportwinner"` with `command` and params.
4. `app/api/sportwinner/route.ts` reads command and dispatches to `server/api-handler.ts`.
5. `server/api-handler.ts` calls the external SportWinner service (`service.php`) via `handleCommand`.
6. Results are cached with `unstable_cache` (revalidate: 3600 seconds).
7. Route returns normalized JSON back to the client.
8. UI transforms array rows into typed objects and renders tables/cards.

## Command Usage by Page

- `"/search"`:
- `GetKlub`, `GetBezirkArray`, `GetLigaArray`, plus local `SearchPlayers` placeholder branch

- `"/scores"`:
- filters: `GetSaisonArray`, `GetLigaArray`, `GetSpieltagArray`
- standings: `GetTabelle`
- player averages: `GetSchnitt`

- `"/tournaments"`:
- schedule: `GetSpielplan`
- matchday map: `GetSpieltagArray`
- expanded match rows: `GetSpielerInfo`
- match notes fallback: `GetSpiel` (by spieltag)

- `"/berlin"` (temporary scraper bridge):
- `GET /api/berlin?league=berlinliga|vereinsliga`
- source HTML pages on kleeblatt-berlin.de
- parser extracts standings, matchday games, and PDF links

- `"/player"`:
- currently uses `PlayerService.getPlayerStats` placeholder implementation

## State and Rendering Patterns

- Route files (`app/.../page.tsx`) are mostly wrappers with `Suspense` or container layout.
- Heavy UI/data logic lives in client components:
- `app/search/SearchClient.tsx`
- `app/player/PlayerClient.tsx`
- `app/scores/page.tsx`
- `app/tournaments/page.tsx`
- Loading and error states are handled per page with `components/LoadingSpinner.tsx`.

## Theme and Language

- Theme:
- bootstrapped in `app/layout.tsx` inline script to reduce theme flash
- persisted by `lib/theme-context.tsx`
- toggled via `components/ThemeToggle.tsx`

- Language:
- translation files exist in `translations/*.json`
- i18n provider exists in `lib/i18n.ts`
- not currently wired in `app/layout.tsx`

## Known Gaps

- `searchPlayers()` in `lib/api-service.ts` returns static sample data after a request.
- Player detail stats (`getPlayerStats`) are placeholders, not real API-derived stats.
- Repo includes editor backup files with `#...#` names; they are not runtime code.
