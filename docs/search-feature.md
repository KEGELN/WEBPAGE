# Search Feature Documentation

## Overview
This document details the implementation of the search functionality for the Kegel website. The search feature allows users to search for clubs, leagues, and districts from the SportWinner API.

## Features

### 1. API Integration
- Integrated with SportWinner API endpoints as defined in `api.org`
- Implemented search for clubs, districts, and leagues
- Created `ApiService` to handle all API communications

### 2. Search UI
- Search bar in the menubar allows quick access
- Results displayed in a bento grid layout matching the overall design
- Responsive design that works on all device sizes

### 3. Bento Grid Design
- Consistent styling with the menubar theme
- Interactive cards with hover effects
- MagicBento animations and effects

## Technical Implementation

### API Service (`lib/api-service.ts`)
The API service provides methods for interacting with the SportWinner API:

- `getCurrentSeason()`: Fetches the current season information
- `searchClubs(query, seasonId)`: Searches for clubs by name
- `getDistricts(seasonId)`: Gets all districts for a season
- `getLeagues(seasonId, districtId)`: Gets leagues for a season and district

### Search Page (`app/search/page.tsx`)
- Uses Next.js `useSearchParams` to read query parameters
- Makes API calls when search term changes
- Displays results in a responsive bento grid
- Shows loading states and error handling

### Components
- `MagicBento`: Custom animated bento grid component
- `SearchBentoCard`: Specialized card for search results
- Menubar integration with search functionality

## Endpoints Used
- `GetSaisonArray`: To get the current season
- `GetKlub`: To search for clubs
- `GetBezirkArray`: To get districts
- `GetLigaArray`: To get leagues

## Design Updates
- Updated MagicBento component to match menubar color scheme
- Changed color palette to blue/purple theme to match menubar
- Improved responsive design for all screen sizes
- Added proper typography and spacing

## Files Modified
- `app/search/page.tsx` - Updated search page with API integration
- `app/player/page.tsx` - Updated to match new design system
- `lib/api-service.ts` - New API service for SportWinner endpoints
- `components/MagicBento.jsx` - Updated styling and content
- `components/MagicBento.css` - Updated CSS variables for theme
- `components/ResultBentoCard.tsx` - New component for search results