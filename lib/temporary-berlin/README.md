# Temporary Berlin Integration

This folder is a temporary scraper-based bridge for:

- `https://kleeblatt-berlin.de/berlinliga-skb/`
- `https://kleeblatt-berlin.de/vereinsliga-skb/`

It exists only until official API support is available.

## Current Scope

- Scrapes matchdays and standings from league pages.
- Scrapes PDF links from `auswertungen-*` pages.
- Downloads and parses player "Schnittliste" tables from PDFs using `pdf-parse`.

## Safe Removal

When official API support is ready, you can delete:

- `lib/temporary-berlin/`
- `app/api/berlin/route.ts`
- `app/berlin/page.tsx`
- optional nav link to `/berlin` in `components/menubar.tsx`
