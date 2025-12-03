# Settings

## Overview

The Settings system allows users to manage project sharing, generate shareable links, and control the visibility of archived items. Settings are accessible via the Settings dropdown menu in the main application header, with additional options available in the Settings dialog.

**Settings Menu**: Quick access to toggle archived items visibility
**Settings Dialog**: Manage project sharing and generate shareable links for collaboration

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
3. Dialog opens with project sharing settings
4. Settings button is only visible when not in read-only mode

### Availability

- Settings are only available to the project owner
- Not available in read-only mode (when viewing a shared project)
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

### Public Access Toggle

**Purpose**: Enable or disable public sharing of the project.

**Behavior:**
- Toggle switch labeled "Open Project"
- **Description**: "Allow registered users to view your project via a shareable link"
- When enabled:
  - Project becomes accessible via share link
  - Share link section appears below the toggle
  - Share token is generated (if not already exists)
- When disabled:
  - Project becomes private
  - Share link section is hidden
  - Existing share links become invalid

**State Management:**
- Toggle state is saved immediately to database
- Loading state prevents multiple rapid toggles
- Success/error notifications via toast messages

### Share Link

**Purpose**: Generate and copy a shareable link for the project.

**Display:**
- Only visible when "Open Project" is enabled
- Shows full URL with share token parameter
- Format: `{origin}/?share={token}`
- Read-only input field (cannot be edited)

**Copy Functionality:**
- Copy button next to the input field
- Clicking copies the full link to clipboard
- Visual feedback: Button icon changes to checkmark
- Toast notification confirms copy action
- Checkmark reverts to copy icon after 2 seconds

**Share Token:**
- Automatically generated when public access is first enabled
- Unique token per user/project
- Stored in `project_settings` table
- Used to identify which project to display in read-only mode

## Behavior

### Initial Load

When the dialog opens:
1. Fetches current project settings from database
2. Loads public access status
3. Loads share token (if exists)
4. Displays current state in the UI

### Enabling Public Access

1. User toggles "Open Project" switch to ON
2. System checks if settings record exists
3. If exists: Updates `is_public` field to `true`
4. If not exists: Creates new record with `is_public: true`
5. If new record: Share token is generated and returned
6. UI updates to show share link section
7. Success toast notification

### Disabling Public Access

1. User toggles "Open Project" switch to OFF
2. Updates `is_public` field to `false`
3. Share link section is hidden
4. Share token remains in database (for potential re-enabling)
5. Success toast notification

### Copying Share Link

1. User clicks copy button
2. Full URL is copied to clipboard
3. Button icon changes to checkmark
4. Toast notification: "Copied! Share link copied to clipboard"
5. After 2 seconds, icon reverts to copy icon

## Data Model

### Project Settings Table

**Fields:**
- `user_id`: Foreign key to the user who owns the project
- `is_public`: Boolean indicating if project is publicly shareable
- `share_token`: Unique token for the share link (generated automatically)
- `show_archived`: Boolean indicating if archived items should be displayed (default: `false`)

**Constraints:**
- One settings record per user
- Share token is unique
- Settings are user-specific (not project-specific in multi-project scenarios)

**Migrations:**
- `20251203192902_add_show_archived_to_project_settings.sql`: Adds `show_archived` column (boolean, default: `false`)

## Security

### Access Control

- Only the project owner can access settings
- Share links require authentication (registered users only)
- Viewing a shared project puts user in read-only mode
- Users cannot edit projects they don't own, even with share link

### Share Token

- Unique per user
- Generated server-side (via database function or default)
- Not easily guessable
- Used to identify which project to display

### Read-Only Mode

When accessing via share link:
- All edit functionality is disabled
- Settings button is hidden
- Profile button may be hidden
- User can view but not modify content

## User Experience

### Dialog Design

- Clean, focused interface
- Clear labels and descriptions
- Visual feedback for all actions
- Loading states during operations
- Error handling with user-friendly messages

### Workflow

1. **Enable Sharing**: Toggle switch to enable public access
2. **Copy Link**: Click copy button to get shareable link
3. **Share**: Send link to collaborators
4. **Disable** (optional): Toggle switch to disable sharing

### Feedback

- Toast notifications for all actions
- Visual state changes (toggle, button icons)
- Loading indicators during operations
- Error messages for failures

## Use Cases

1. **Team Collaboration**: Share project with team members for review
2. **Stakeholder Updates**: Provide read-only access to stakeholders
3. **Documentation**: Create shareable documentation of product strategy
4. **Review Process**: Allow others to review without edit access
5. **Presentation**: Share project for presentations or demos

## Technical Details

### Database Operations

- Uses Supabase for data persistence
- Upsert pattern for creating/updating settings
- Error handling for database operations
- Automatic token generation (handled by database)

### URL Generation

- Uses `window.location.origin` for base URL
- Appends `?share={token}` query parameter
- Works with both development and production environments
- Supports custom base paths (e.g., `/product-notebook`)

### State Management

- Local component state for UI
- React Query for data fetching (if used)
- Immediate UI updates with database sync
- Error rollback on failures

