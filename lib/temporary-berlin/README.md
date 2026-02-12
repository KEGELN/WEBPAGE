# Temporary Berlin Integration

This folder is a temporary scraper-based bridge for:

- `https://kleeblatt-berlin.de/berlinliga-skb/`
- `https://kleeblatt-berlin.de/vereinsliga-skb/`

It exists only until official API support is available.

## Current Scope

- Scrapes matchdays and standings from league pages.
- Scrapes PDF links from `auswertungen-*` pages.
- Reads player tables from prebuilt CSV files in `data/{league}/`.
- CSV files are generated offline by `scripts/build_berlin_csv.py` using Poppler (`pdftotext`).

## CSV Build

Run from project root:

```bash
python3 scripts/build_berlin_csv.py --league all
```

This writes:

- `data/berlinliga/*.csv`
- `data/vereinsliga/*.csv`
- `data/berlinliga/index.json`
- `data/vereinsliga/index.json`

## Safe Removal

When official API support is ready, you can delete:

- `lib/temporary-berlin/`
- `app/api/berlin/route.ts`
- `app/berlin/page.tsx`
- optional nav link to `/berlin` in `components/menubar.tsx`
