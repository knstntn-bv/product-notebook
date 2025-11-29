# Main Application

## Overview

The Main Application is the central hub of the Product Notebook. It provides a tabbed interface to navigate between different views of the product management system: Strategy, Roadmap, Hypotheses, and Board.

## Location

- **Route**: `/`
- **Component**: `src/pages/Index.tsx`
- **Protected**: Yes (requires authentication)

## Layout Structure

### Header

The header contains:
- **Title**: "Product Notebook" (left side)
- **Action Buttons** (right side, only visible when not in read-only mode):
  - **Settings Button**: Opens project settings dialog
  - **Profile Button**: Dropdown menu with "Sign Out" option

### Navigation Tabs

The application uses a tabbed interface to switch between different views:

1. **Strategy** - Product strategy, values, metrics, and initiatives
2. **Roadmap** - Goals organized by initiatives and time periods
3. **Hypotheses** - Hypothesis tracking and validation
4. **Board** - Kanban-style feature board

### Responsive Design

**Desktop View:**
- Tabs are displayed in a horizontal list below the header
- Sticky positioning keeps tabs visible while scrolling
- Full-width tab content area

**Mobile View:**
- Tabs are displayed as a full-width grid below the header
- Each tab shows an icon and label
- Tabs are always visible at the top of the screen
- Optimized touch targets for mobile interaction

## Behavior

### Tab Navigation

- Users can switch between tabs by clicking on the tab buttons
- The active tab is visually highlighted
- Tab state is managed locally using React state
- Each tab renders its corresponding page component:
  - Strategy → `StrategyPage`
  - Roadmap → `RoadmapPage`
  - Hypotheses → `HypothesesPage`
  - Board → `BoardPage`

### Read-Only Mode

- When viewing a shared project (via share link), the application enters read-only mode
- In read-only mode:
  - Settings and profile buttons are hidden
  - Edit functionality is disabled across all pages
  - Users can view but not modify content

### Settings Dialog

- Accessible via the Settings button in the header
- Allows users to:
  - Toggle project sharing (make project publicly accessible)
  - Generate and copy share links
  - View current sharing status

### User Profile

- Accessible via the Profile button in the header
- Provides sign-out functionality
- Redirects to authentication page after sign-out

### Data Context

The main application wraps all pages in a `ProductProvider` context that:
- Manages metrics and initiatives data
- Handles shared project viewing via URL parameters
- Provides read-only mode detection
- Supplies data to all child components

### State Management

- Uses React Query for data fetching and caching
- Tab state is local to the Index component
- Settings dialog state is managed locally
- All data mutations are handled by individual page components

### Error Handling

- Protected routes redirect unauthenticated users to `/auth`
- Loading states are handled by individual page components
- Error states are displayed via toast notifications

