# Settings

## Overview

The Settings system allows users to control the visibility of archived items. Settings are accessible via the Settings dropdown menu in the main application header.

**Settings Menu**: Quick access to toggle archived items visibility

## Location

- **Component**: `src/components/SettingsDialog.tsx`
- **Access**: Via Settings button in the main application header

## Access

### Opening Settings

**Settings Menu:**
1. Click the "Settings" button in the main application header
2. Dropdown menu appears with quick settings
3. "Show Archived Items" checkbox is available directly in the menu

**Settings Dialog:**
1. Click the "Settings" button in the main application header
2. Select "Open Project" from the dropdown menu
3. Dialog opens (currently reserved for future settings)

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
- Setting is persisted per user and synced across all pages
- Changes take effect immediately without page refresh
- Setting is loaded from database on application start

**User Experience:**
- Quick access from Settings menu without opening dialog
- Consistent behavior across Strategy and Roadmap pages
- Visual indicators (reduced opacity, muted colors) for archived items when visible


## Behavior

### Initial Load

When the dialog opens:
1. Dialog is displayed (currently reserved for future settings)

## Data Model

### Project Settings Table

**Fields:**
- `user_id`: Foreign key to the user who owns the project
- `show_archived`: Boolean indicating if archived items should be displayed (default: `false`)

**Constraints:**
- One settings record per user
- Settings are user-specific (not project-specific in multi-project scenarios)

**Migrations:**
- `20251203192902_add_show_archived_to_project_settings.sql`: Adds `show_archived` column (boolean, default: `false`)

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

