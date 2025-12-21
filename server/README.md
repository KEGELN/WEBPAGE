# Server Directory Documentation

This directory contains all server-side logic for the Kegeln application, including API handlers and business logic.

## Directory Structure

```
server/
├── index.ts          # Main export file - exports all handlers
├── api-handler.ts    # Core API handler for SportWinner API commands
├── player-handler.ts # Player-specific operations
├── utils.ts          # Utility functions for API operations
└── README.md         # This documentation file
```

## File Descriptions

### `index.ts`
- Main entry point for the server module
- Exports APIHandler and PlayerHandler classes and instances
- Provides a convenient way to import handlers throughout the application

### `api-handler.ts`
- Core API handler implementing SportWinner API commands
- Handles commands like GetSaisonArray, GetKlub, GetBezirkArray, GetLigaArray, GetSchnitt, etc.
- Contains methods for fetching seasons, clubs, districts, leagues, and player statistics
- Provides example data fallbacks for all API operations

### `player-handler.ts`
- Player-specific operations and data processing
- Extends API data with additional player properties
- Provides methods for getting player lists with season/league filters
- Handles player statistics retrieval

### `utils.ts`
- Utility functions for common API operations
- Includes logging, error formatting, and parameter validation functions

## API Commands Implemented

Based on api.org documentation:

1. **GetSaisonArray** - Fetch all available seasons
2. **GetKlub** - Search for clubs by name
3. **GetBezirkArray** - Get all districts for a season
4. **GetLigaArray** - Get all leagues for a season and district
5. **GetSchnitt** - Get player statistics (Schnitt list)
6. **GetSpiel** - Get games for a season, league, and district
7. **GetTabelle** - Get standings for a league
8. **GetSpieltagArray** - Get all available match days for a league

## Usage

```typescript
import { apiHandler, playerHandler } from '@/server';

// Get all seasons
const seasons = await apiHandler.getSeasons();

// Get players with season and league filters
const players = await playerHandler.getPlayerSchnitliste('11', '3870');
```

## Player Page Filters

The player page now includes dropdown filters for:
- Seasons (from GetSaisonArray)
- Leagues (from GetLigaArray)

These filters update the player list dynamically based on selected criteria.