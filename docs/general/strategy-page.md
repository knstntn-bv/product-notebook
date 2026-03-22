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
  - **Initiative**: The initiative name (read-only, clickable)
  - **Description**: Initiative description (read-only, shows "—" if empty)
  - **Target Metric**: Target metric name (read-only, shows "—" if not set)
  - **Color**: Small colored square indicator
- Table rows are clickable - clicking a row opens the initiative editor dialog
- Rows have hover effect to indicate they are interactive

**Sorting:**
- Initiatives are sorted by priority (ascending) - lower priority number = higher priority
- Within the same priority, non-archived initiatives appear before archived ones
- Archived initiatives are displayed with reduced opacity (50%)

**Adding Initiatives:**
- Click "Add Initiative" button to open the initiative editor dialog
- Fill in the required fields:
  - **Name**: Initiative name (required)
  - **Description**: Optional multi-line description
  - **Priority**: Priority number (default: 3, lower = higher priority)
  - **Target Metric**: Optional reference to a metric (Select dropdown with "None" option)
  - **Color**: Color picker for visual identification (default: #8B5CF6)
- Click "Save Initiative" to create the initiative
- New initiatives are created with `priority = 3` by default

**Editing Initiatives:**
- Click on any initiative row in the table to open the editor dialog
- The dialog uses a two-column layout:
  - **Left Column**: Name (Input) and Description (Textarea)
  - **Right Column**: Priority (Input type="number"), Target Metric (Select), Color (ColorPicker)
- All fields can be edited in the dialog
- Click "Save Initiative" to save changes
- Click "Cancel" to close without saving

**Initiative Editor Dialog:**
- **Layout**: Two-column layout on desktop, single-column stacked on mobile
- **Left Column (70%)**: Text input fields (Name, Description)
- **Right Column (30%)**: Selection fields and actions:
  - Priority (number input without spinner arrows)
  - Target Metric (Select with "None" option and list of available metrics)
  - Color (ColorPicker taking full width of column)
  - Action buttons at bottom: Archive/Unarchive, Delete
- **Footer**: Cancel and Save buttons
- **Validation**: Name is required, shows error if empty

**Priority:**
- Priority is a number field (integer)
- Lower number = higher priority (e.g., priority 1 appears before priority 3)
- Default value: 3
- Used for sorting initiatives on Strategy and Roadmap pages
- Can be changed at any time when editing an initiative

**Target Metric:**
- Optional field linking an initiative to a metric
- Used to define the North Star metric for the initiative
- Can be set to "None" to remove the link
- Displayed in the table as the metric name or "—" if not set
- Helps track which metric the initiative is targeting

**Archiving Initiatives:**
- Open the initiative editor dialog
- Click the "Archive" button in the right column
- Archived initiatives are displayed with muted colors (reduced opacity)
- Archived initiatives are automatically moved to the end of the list (after sorting by priority)
- The archive date is saved when an initiative is archived
- Click "Unarchive" to restore an initiative
- Archived initiatives visibility is controlled by the global "Show Archived Items" setting in Settings menu
- When "Show Archived Items" is unchecked: Only active initiatives are displayed
- When "Show Archived Items" is checked: All initiatives are displayed, archived ones at the end with reduced opacity

**Deleting Initiatives:**
- Open the initiative editor dialog
- Click the "Delete" button in the right column
- Confirm deletion in the alert dialog
- Initiative is permanently removed from the database

**Color Usage:**
- Initiative colors appear as visual indicators on:
  - Feature cards in the Board
  - Initiative rows in the Roadmap
  - Goal cards linked to initiatives
  - Color square in the Strategy table

**Read-Only Mode:**
- In read-only mode, initiatives are displayed as plain text
- Color is shown as a small colored square
- Rows are not clickable
- No edit, archive, or delete functionality is available
- Archived initiatives are still visible but displayed with muted colors

## Data Management

### Real-time Updates
- All changes are persisted to Supabase database immediately
- React Query handles caching and refetching
- Changes are reflected across all pages that use the same data
- All data operations are scoped to the current product (`product_id`)

### Data Relationships
- All data is scoped to a specific product via `product_id`
- Metrics can reference other metrics (parent-child relationships)
- Initiatives are referenced by:
  - Goals (in Roadmap)
  - Features (in Board)
- These relationships are maintained through foreign keys in the database
- Product formula is unique per product (one formula per product)

### Validation
- Product formula: Max 500 characters
- Values: Max 1000 characters
- Metric names: Max 100 characters
- Initiative names: Required, validated before saving
- Initiative priority: Integer, minimum 1
- All required fields are validated before saving

## User Experience

- Clean, sectioned layout with visual dividers
- Inline editing for quick updates
- Visual feedback for unsaved changes
- Consistent save/delete patterns across sections
- Responsive design for mobile and desktop
- Loading states during data operations
- Error handling with user-friendly messages

