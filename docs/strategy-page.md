# Strategy Page

## Overview

The Strategy Page is where users define the foundational elements of their product strategy: the product formula, core values, metrics hierarchy, and strategic initiatives.

## Location

- **Component**: `src/pages/StrategyPage.tsx`
- **Access**: Via "Strategy" tab in the main application

## Sections

### 1. Product Formula

**Purpose**: Define the core product formula that describes what the product does.

**Behavior:**
- Displays the current product formula or "No product formula" if empty
- Click the edit icon (pencil) to enter edit mode
- In edit mode:
  - Shows an input field with max length of 500 characters
  - Displays a "Save" button
  - Clicking "Save" persists the formula to the database
- In read-only mode, the edit button is hidden
- Changes are saved immediately on button click
- Success/error notifications are shown via toast messages

### 2. Values

**Purpose**: Define the core values that guide product decisions.

**Behavior:**
- Lists all product values in order
- Each value displays its text content or "No value" if empty
- **Add Value**: Button at the top allows adding new values
- **Edit Value**: Click the pencil icon to edit a value
  - Switches to textarea input mode
  - Max length: 1000 characters
  - Click "Save" to persist changes
- **Delete Value**: Click the trash icon to delete a value
- Values are ordered by their position in the database
- In read-only mode, all edit/delete actions are hidden

### 3. Metrics

**Purpose**: Define a hierarchical structure of product metrics.

**Behavior:**
- Displays metrics in a table format with columns:
  - **Metric**: The metric name (editable inline)
  - **Parent Metric**: Dropdown to select a parent metric (for hierarchy)
  - **Actions**: Save and delete buttons

**Adding Metrics:**
- Click "Add Metric" button to create a new metric
- New metrics start with an empty name
- Metrics can be edited inline using the `InlineEditInput` component

**Editing Metrics:**
- Click on the metric name to edit it
- Select a parent metric from the dropdown (or "None" to remove parent)
- Changes are tracked locally until "Save" is clicked
- "Save" button only appears when there are unsaved changes
- Metrics can be deleted using the trash icon

**Hierarchy:**
- Metrics can have parent metrics to create a tree structure
- Parent selection prevents circular references (a metric cannot be its own parent)
- The hierarchy is used throughout the application for metric organization

**Read-Only Mode:**
- In read-only mode, metrics are displayed as plain text
- No edit or delete functionality is available

### 4. Initiatives

**Purpose**: Define strategic initiatives that organize product work.

**Behavior:**
- Displays initiatives in a table format with columns:
  - **Initiative**: The initiative name (editable inline)
  - **Description**: Multi-line description (auto-resizing textarea)
  - **Color**: Color picker for visual identification
  - **Actions**: Save and delete buttons

**Adding Initiatives:**
- Click "Add Initiative" button to create a new initiative
- New initiatives start with empty name and description
- Default color is purple (#8B5CF6)

**Editing Initiatives:**
- **Name**: Click to edit inline using `InlineEditInput`
- **Description**: Auto-resizing textarea that grows with content
- **Color**: Click color picker to select a color
  - Color is used throughout the app to visually identify initiative-related items
- Changes are tracked locally until "Save" is clicked
- "Save" button only appears when there are unsaved changes
- Initiatives can be archived using the archive icon (next to delete button)
- Initiatives can be deleted using the trash icon

**Archiving Initiatives:**
- Click the archive icon to archive an initiative
- Archived initiatives are displayed with muted colors (reduced opacity)
- Archived initiatives are automatically moved to the end of the list
- The archive date is saved when an initiative is archived
- Click the restore icon (ArchiveRestore) to unarchive an initiative
- Archived initiatives visibility is controlled by the global "Show Archived Items" setting in Settings menu
- When "Show Archived Items" is unchecked: Only active initiatives are displayed
- When "Show Archived Items" is checked: All initiatives are displayed, archived ones at the end with reduced opacity
- Archiving preserves the initiative data while removing it from active views (when filter is enabled)

**Color Usage:**
- Initiative colors appear as visual indicators on:
  - Feature cards in the Board
  - Initiative rows in the Roadmap
  - Goal cards linked to initiatives

**Read-Only Mode:**
- In read-only mode, initiatives are displayed as plain text
- Color is shown as a small colored square
- No edit, archive, or delete functionality is available
- Archived initiatives are still visible but displayed with muted colors

## Data Management

### Real-time Updates
- All changes are persisted to Supabase database immediately
- React Query handles caching and refetching
- Changes are reflected across all pages that use the same data

### Data Relationships
- Metrics can reference other metrics (parent-child relationships)
- Initiatives are referenced by:
  - Goals (in Roadmap)
  - Features (in Board)
- These relationships are maintained through foreign keys in the database

### Validation
- Product formula: Max 500 characters
- Values: Max 1000 characters
- Metric names: Max 100 characters
- Initiative names: Max 100 characters
- All required fields are validated before saving

## User Experience

- Clean, sectioned layout with visual dividers
- Inline editing for quick updates
- Visual feedback for unsaved changes
- Consistent save/delete patterns across sections
- Responsive design for mobile and desktop
- Loading states during data operations
- Error handling with user-friendly messages

