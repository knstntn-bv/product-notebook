# Settings

## Overview

The Settings system allows users to control product-level preferences, including archived items visibility and the current product name. Settings are accessible via the Settings dropdown menu in the main application header.

**Settings Menu**: Quick access to toggle archived items visibility and open project settings dialog

## Location

- **Component**: `src/components/SettingsDialog.tsx`
- **Access**: Via Settings button in the main application header

## Access

### Opening Settings

**Settings Menu:**
1. Click the "Settings" button in the main application header
2. Dropdown menu appears with quick settings
3. "Show Archived Items" checkbox is available directly in the menu
4. "Open Project Settings" opens the settings dialog

**Settings Dialog:**
1. Click the "Settings" button in the main application header
2. Select "Open Project Settings" from the dropdown menu
3. Dialog opens with editable product name field

### Availability

- Settings are only available to authenticated users
- Requires authentication

## Features

### Show Archived Items Toggle

**Purpose**: Control the visibility of archived initiatives and goals across Strategy and Roadmap pages.

**Location**: Settings dropdown menu (not in the dialog)

**Behavior:**
- Checkbox item labeled "Show Archived Items" in the Settings dropdown menu
- When unchecked (default):
  - Strategy page: Only active (non-archived) initiatives are displayed
  - Roadmap page: Only active initiatives appear as rows, only active goals are shown in cells
- When checked:
  - Strategy page: All initiatives are displayed, archived ones at the end with reduced opacity
  - Roadmap page: All initiatives appear as rows (archived at the bottom), all goals are shown (archived with reduced opacity)

**State Management:**
- Setting is stored in `project_settings.show_archived` field in the database
- Setting is persisted per product and synced across all pages
- Changes take effect immediately without page refresh
- Setting is loaded from database on application start based on the current product
- Each product maintains its own archive visibility preference

**User Experience:**
- Quick access from Settings menu without opening dialog
- Consistent behavior across Strategy and Roadmap pages
- Visual indicators (reduced opacity, muted colors) for archived items when visible

### Product Name Editing

**Purpose**: Update the display name of the currently selected product.

**Location**: Settings dialog (`Open Project Settings` menu item).

**Behavior:**
- Input is pre-filled with the current product name.
- Save is enabled only when the value is changed and valid.
- Validation rules:
  - Name is required after trimming.
  - Maximum length is 100 characters.
- On successful save:
  - `products.name` is updated for the current product.
  - Header title updates to the new product name without page refresh.
- On error:
  - An error toast is shown.


## Behavior

### Initial Load

When the dialog opens:
1. Dialog is displayed (currently reserved for future settings)

## Data Model

### Project Settings Table

**Fields:**
- `product_id`: Foreign key to the product this setting belongs to (NOT NULL)
- `show_archived`: Boolean indicating if archived items should be displayed (default: `false`)

**Constraints:**
- One settings record per product
- Settings are product-specific (each product has its own archive visibility setting)
- `product_id` is required and references the `products` table

**Data Model:**
- Settings are now scoped to products, not users
- Each product can have its own archive visibility preference
- When a user switches between products, each product maintains its own settings

**Migrations:**
- `20251203192902_add_show_archived_to_project_settings.sql`: Adds `show_archived` column (boolean, default: `false`)
- `20251204000414_remove_user_id_from_data_tables.sql`: Removes `user_id` column, settings now use `product_id` only

## Security

### Access Control

- Only authenticated users can access settings
- Users can only modify their own project settings

## User Experience

### Dialog Design

- Clean, focused interface
- Clear labels and descriptions
- Visual feedback for all actions
- Loading states during operations
- Error handling with user-friendly messages

### Workflow

1. **Toggle Archived Items**: Use the checkbox in the Settings menu to show/hide archived items
2. **Rename Product**: Open project settings, edit name, and save changes

### Feedback

- Toast notifications for all actions
- Visual state changes (toggle, button icons)
- Loading indicators during operations
- Error messages for failures

## Use Cases

1. **Archive Management**: Control visibility of archived initiatives and goals
2. **Clean View**: Hide archived items for a cleaner interface when focusing on active work
3. **Historical Review**: Show archived items when reviewing past initiatives and goals

## Technical Details

### Database Operations

- Uses Supabase for data persistence
- Upsert pattern for creating/updating settings
- Error handling for database operations

### State Management

- Local component state for UI
- React Query for data fetching (if used)
- Immediate UI updates with database sync
- Error rollback on failures

