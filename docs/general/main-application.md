# Main Application

## Overview

The Main Application is the central hub of the Product Notebook. It provides a sidebar navigation to switch between different views of the product management system: Strategy, Roadmap, Hypotheses, Board, and Attachments.

## Location

- **Routes**: `/`, `/strategy`, `/roadmap`, `/hypotheses`, `/board`, `/attachments`
- **Layout**: `src/components/AppLayout.tsx`
- **Sidebar**: `src/components/AppSidebar.tsx`
- **Protected**: Yes (requires authentication)

Visiting `/` redirects to `/strategy`.

## Layout Structure

### Sidebar

The left sidebar contains:
- **Header**: Product name with app icon
- **Navigation**: Four main sections with icons and labels
- **Collapse toggle**: Via trigger button, sidebar rail, or `Ctrl/Cmd+B`

The sidebar has two desktop states:
- **Expanded** (~256px): icon + label for each section
- **Collapsed** (~48px): icons only, labels shown in tooltips

The chosen state is persisted in a cookie (`sidebar:state`) between sessions.

On mobile (`< md`), the sidebar opens as a **Sheet drawer** overlay. Selecting a section closes the drawer.

### Header

The header in the main content area contains:
- **Sidebar trigger**: Opens/toggles sidebar (drawer on mobile)
- **Title**: Current product name (fallback: "Product Notebook")
- **Page actions slot** (`HeaderActionsSlot` in `AppLayout`): a page may portal one route-level action here via `HeaderActions` (see [Page actions](#page-actions))
- **Action Buttons** (right side):
  - **Settings Button**: Opens settings menu (archive toggle + project settings dialog)
  - **Profile Button**: Dropdown menu with "Sign Out" option

### Page actions

Where the primary **Add** / **Upload** control lives depends on what it creates. These are three intentional patterns, not one missing shared button component.

| Pattern | When | Where today |
|---------|------|-------------|
| `HeaderActions` (portal into the header slot) | One action for the whole route | Hypotheses: Add Hypothesis. Attachments: Upload |
| `SectionHeader` (`onAdd` / `addLabel`) | Add belongs to a block on a multi-section page | Strategy: Add Value / Metric / Initiative. Product Formula has a section header **without** Add |
| Local button on a column or cell | Create needs a column id or initiative×quarter cell | Board: Add on the column. Roadmap: Add Goal inside the cell |

Do not:

- Merge the three into one `AddButton` widget (different anchors and callbacks)
- Portal Strategy section Add buttons into the app header (four different mutations)
- Put Board/Roadmap Add into `HeaderActions` (no single column/cell)
- Treat dialog actions (Create Feature, Upload in the entity attachments popup) as page-level Add

Components: `src/components/HeaderActions.tsx`, `src/components/SectionHeader.tsx`.

### Navigation Sections

1. **Strategy** (`/strategy`) - Product strategy, values, metrics, and initiatives
2. **Roadmap** (`/roadmap`) - Goals organized by initiatives and time periods
3. **Hypotheses** (`/hypotheses`) - Hypothesis tracking and validation
4. **Board** (`/board`) - Kanban-style feature board
5. **Attachments** (`/attachments`) - Product file library

### Responsive Design

**Desktop View:**
- Fixed sidebar on the left (expanded or collapsed)
- Main content area fills remaining width
- Board view uses full viewport height minus header

**Mobile View:**
- Sidebar hidden by default
- Header includes sidebar trigger (hamburger)
- Sidebar opens as full-height Sheet drawer
- Drawer closes automatically after navigation

## Behavior

### Section Navigation

- Users switch sections via sidebar links
- Active section is highlighted in the sidebar
- Each section has its own URL route (browser back/forward works)
- Each route renders its corresponding page component:
  - `/strategy` → `StrategyPage`
  - `/roadmap` → `RoadmapPage`
  - `/hypotheses` → `HypothesesPage`
  - `/board` → `BoardPage`
  - `/attachments` → `AttachmentsPage`

Navigation items are defined in `src/lib/navigation.ts`.

### Settings Dialog

- Accessible via the Settings button in the header
- Opened from the "Open Project Settings" menu item
- Supports editing current product name

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
- Active section is determined by the current URL (React Router)
- Sidebar expanded/collapsed state is persisted in a cookie
- Settings dialog state is managed locally in `AppLayout`
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
- Header title and sidebar header use `ProductContext.currentProductName`
