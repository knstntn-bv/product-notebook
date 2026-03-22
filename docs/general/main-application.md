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
- **Action Buttons** (right side):
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

### Settings Dialog

- Accessible via the Settings button in the header
- Currently reserved for future settings

### User Profile

- Accessible via the Profile button in the header
- Provides sign-out functionality
- Redirects to authentication page after sign-out

### Data Context

The main application wraps all pages in a `ProductProvider` context that:
- Manages the current product selection (`currentProductId`)
- Automatically fetches the user's default product (first product by creation date)
- Manages metrics and initiatives data for the current product
- Supplies data to all child components
- Ensures all data operations are scoped to the selected product

### State Management

- Uses React Query for data fetching and caching
- Tab state is local to the Index component
- Settings dialog state is managed locally
- All data mutations are handled by individual page components
- Product selection is managed globally via `ProductContext`
- All data queries are scoped to the current product (`product_id`)

### Error Handling

- Protected routes redirect unauthenticated users to `/auth`
- Loading states are handled by individual page components
- Error states are displayed via toast notifications

## Data Model

### Products Entity

The application uses a **product-based data model** where:
- Each user can have multiple products (one-to-many relationship)
- All data (features, goals, metrics, initiatives, etc.) is scoped to a specific product
- The `ProductContext` manages the current product selection
- When a user first accesses the application, their default product is automatically selected
- All data operations (create, read, update, delete) are filtered by `product_id`

**Benefits:**
- Allows users to manage multiple products from a single account
- Provides clear data isolation between products
- Enables future features like product switching and multi-product dashboards

**Current Product Selection:**
- Automatically selects the user's first product (by creation date)
- All pages display data for the currently selected product
- Product selection is managed via `ProductContext.currentProductId`

