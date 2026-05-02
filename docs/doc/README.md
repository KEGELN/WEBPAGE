# Project Documentation

This directory explains where code lives and how the Kegel website works.

## Quick Start

- Run `npm run dev`
- App URL: `http://localhost:3000`
- Main API bridge: `app/api/sportwinner/route.ts`

## What This App Is

- Framework: Next.js App Router (`app/`)
- Frontend: React 19 + Tailwind CSS 4
- Data source: External SportWinner API, proxied through local route handler
- Main user areas:
- `"/"` landing page with navigation
- `"/search"` search clubs/players/leagues/districts
- `"/scores"` player averages + league standings
- `"/tournaments"` match schedule + per-match detail rows
- `"/player"` placeholder player detail page by query id

## Documentation Index

- File map: `doc/FILE_MAP.md`
- Data and request flow: `doc/DATA_FLOW.md`

## Important Notes

- There is an older `docs/` folder (`docs/search-feature.md`). Keep it for history, but `doc/` is the current map.
- There are backup/temp files in the repo (for example `#README.md#`, `lib/#api-service.ts#`, `server/#player-handler.ts#`, `app/player/#page.tsx#`).
- `lib/i18n.ts` and translation JSON files exist, but `I18nProvider` is not currently mounted in `app/layout.tsx`.
- `server/player-handler.ts` is deprecated and intentionally unused.
