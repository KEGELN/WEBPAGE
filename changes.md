# Changelog

## [Unreleased] - 2025-12-24

### Added
- API documentation file (`api.org`) with detailed endpoints for SportWinner API
- API route handler (`app/api/sportwinner/route.ts`) to intercept and handle API requests
- Player page with detailed statistics and list view (`app/player/page.tsx`)
- Search page with functionality to search clubs, players, leagues and districts (`app/search/page.tsx`)
- API service layer (`lib/api-service.ts`) to handle SportWinner API communications
- Player service layer (`lib/player-service.ts`) for player-specific operations
- MagicBento component with animated cards (`components/MagicBento.jsx`, `components/MagicBento.css`)
- PlayerStatsBento and ResultBentoCard components for consistent UI
- Theme context and toggle functionality (`lib/theme-context.tsx`, `components/ThemeToggle.tsx`)
- Menubar component with navigation and search functionality (`components/menubar.tsx`)
- Server-side API handler (`server/api-handler.ts`) with example data
- Player handler (`server/player-handler.ts`) for player operations
- Documentation for search feature (`docs/search-feature.md`)
- Server directory with API handlers and utilities

### Changed
- Updated project metadata in `package.json` (name, description)
- Modified `app/layout.tsx` to include ThemeProvider and dark mode
- Updated `app/page.tsx` to import Menubar from correct path
- Enhanced `app/globals.css` with improved dark theme colors
- Updated MagicBento component with kegel sport related content
- Modified player page to include season and league filters
- Updated API service to use server-side API route

### Fixed
- CSS media queries in MagicBento component
- Theme color values to avoid pure black in dark mode
- Import paths to use absolute imports (@/ syntax)

### Removed
- Old router files and temporary files with # in names
- Deprecated MagicBento.jsx backup files
- Old component files that were replaced