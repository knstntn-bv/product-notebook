# Board Page

## Overview

The Board Page provides a Kanban-style board for managing features throughout their lifecycle. Features can be organized into columns representing different stages of development and moved between columns via drag and drop.

## Location

- **Component**: `src/pages/BoardPage.tsx`
- **Access**: Via "Board" tab in the main application

## Board Structure

### Columns

The board consists of 8 columns representing different stages:

1. **Inbox**: New features that haven't been categorized yet
2. **Discovery**: Features being researched and explored
3. **Backlog**: Features planned but not yet started
4. **Design & Analysis**: Features in design and analysis phase
5. **Development & Testing**: Features being built and tested
6. **On Hold / Blocked**: Features that are temporarily paused
7. **Done**: Completed features
8. **Cancelled**: Features that were cancelled

### Column Layout

**Desktop:**
- Columns are displayed horizontally
- Each column has a fixed width (320px)
- Horizontal scrolling available if needed
- Columns are scrollable vertically for long lists

**Mobile:**
- Columns use snap scrolling (snap-x)
- Each column takes 85% of viewport width
- Smooth horizontal scrolling between columns
- Touch-optimized interactions

## Feature Cards

### Display

Each feature card shows:
- **Title**: The feature name (bold, primary text)
- **Goal Name**: If linked to a goal, shows the goal text (smaller, muted text)
- **Color Indicator**: Left edge colored bar matching the linked initiative's color (if linked)

### Visual States

- **Normal**: Standard card appearance
- **Dragging**: Card becomes semi-transparent (50% opacity)
- **Long Press** (mobile): Card shows ring border and slight scale
- **Hover**: Shadow effect on desktop

## Behavior

### Creating Features

1. Click the "Add" button at the top of any column
2. A dialog opens with feature editing form
3. Fill in the required fields:
   - **Title**: Feature name (required)
   - **Description**: Detailed description (optional)
   - **Linked Goal**: Select a goal from the roadmap (optional)
   - **Linked Initiative**: Select an initiative (optional)
   - **Column**: Select which column the feature starts in (required)
4. Click "Save Feature" to create

**Note**: 
- When a goal is selected, the linked initiative is automatically set to match the goal's initiative.
- A human readable ID is automatically generated when the feature is created. The ID format is `XXX-N` where `XXX` is derived from the initiative name (or "NNN" if no initiative) and `N` is a sequential number. See [Human Readable ID](#human-readable-id) section for details.

### Editing Features

1. Click on any feature card
2. The same dialog opens with pre-filled values
3. Modify any fields
4. Click "Save Feature" to update

### Deleting Features

1. Open the feature editing dialog
2. Click the "Delete" button
3. Confirm deletion in the alert dialog
4. Feature is permanently removed

### Exporting Features

Features can be exported to Markdown (.md) files for documentation, sharing, or backup purposes.

**Export Process:**
1. Open the feature editing dialog
2. Click the "Export to .md" button in the dialog footer
3. A Markdown file is automatically generated and downloaded

**Export Details:**
- **File Name**: Composed of two parts:
  - Human readable ID (e.g., `PRO-1`) or `NEW` for unsaved features
  - Feature title (sanitized for filesystem compatibility)
  - Example: `PRO-1 User Authentication.md`
- **File Content**: Contains the complete description text from the feature's Description field
- **File Format**: Standard Markdown (.md) file
- **Download**: File is automatically offered for download by the browser

**Use Cases:**
- Creating documentation for features
- Sharing feature specifications with team members
- Backing up feature descriptions
- Integrating feature data into external documentation systems

### Feature Dialog

The feature editing dialog provides a user-friendly interface for creating and editing features using a two-column layout on desktop and a single-column stacked layout on mobile.

**Dialog Layout:**
- **Width**: 
  - Desktop: Maximum width of 1152px (6xl) for two-column layout
  - Mobile: Maximum width of 768px (3xl) for single-column layout
- **Height**: 
  - Minimum height of 660px for comfortable viewing
  - Maximum height of 90% of viewport height
  - Automatically adjusts to content size
- **Background**: Light gray (`bg-muted`) for better visual separation
- **Scrolling**: 
  - Desktop: Only the left column (text fields) scrolls; right column (dropdowns and buttons) remains fixed
  - Mobile: Entire content area scrolls
- **Focus Rings**: Padding ensures that field focus highlights are fully visible without being cut off

**Dialog Structure (Desktop - Two-Column):**
- **Header**: Fixed at the top, contains the dialog title
- **Left Column (70%)**: Contains all text input fields:
  - Human Readable ID (read-only, displayed for existing features)
  - Title (Input)
  - Description (Textarea)
- **Right Column (30%)**: Contains:
  - Linked Goal (Popover dropdown)
  - Linked Initiative (Popover dropdown)
  - Board Column (Select dropdown)
  - Action buttons (fixed at bottom of right column):
    - **Export to .md** button (available for all features)
    - **Delete** button (when editing existing features)
- **Footer**: Fixed at the bottom, contains:
  - **Cancel** button
  - **Save Feature** button

**Dialog Structure (Mobile - Single-Column):**
- **Header**: Fixed at the top, contains the dialog title
- **Content Area**: Scrollable section containing all fields in order:
  - Text input fields (Human Readable ID, Title, Description)
  - Dropdown menus (Linked Goal, Linked Initiative, Board Column)
  - Action buttons (Export, Delete)
- **Footer**: Fixed at the bottom, contains Cancel and Save buttons

**User Experience:**
- Logical separation between text input and selection fields on desktop
- All fields remain accessible through scrolling when needed
- Focus rings on active fields are never clipped
- Custom thin scrollbar (6px width) appears only when content exceeds available space
- Content is properly padded to prevent overlap with the scrollbar

### Drag and Drop

**Moving Features:**
- Features can be dragged between columns
- Features can be reordered within the same column
- Visual feedback shows where the feature will be dropped

**Drag Behavior:**
- **Desktop**: Click and drag with mouse (8px activation distance)
- **Mobile**: Long press (500ms) then drag
- Drag overlay shows a preview of the card being dragged
- Optimistic updates provide immediate visual feedback

**Drop Targets:**
- Can drop on another feature card (inserts at that position)
- Can drop on an empty column (adds to the end)
- Can drop within the same column (reorders)

**Position Management:**
- Each feature has a position number within its column
- Positions are automatically recalculated when features are moved
- Positions ensure consistent ordering

### Feature Details

**Feature Fields:**

**Left Column (Text Input Fields):**
- **Human Readable ID**: Unique identifier for the feature (read-only, displayed as text)
  - Format: `XXX-N` where:
    - `XXX` is the first 3 characters of the linked initiative name (uppercase), or "NNN" if no initiative is linked
    - `N` is a sequential number across all features for the user
  - Automatically generated when a feature is created
  - Displayed at the top of the feature editing dialog (for existing features only)
  - Cannot be edited or changed
  - See [Human Readable ID](#human-readable-id) section for complete details
- **Title**: Feature name (required, text input)
- **Description**: Detailed description (optional, textarea with 15 rows)

**Right Column (Selection Fields and Actions):**
- **Linked Goal**: Goal from roadmap (optional, searchable Popover dropdown)
  - Selecting a goal automatically sets the linked initiative
  - Goals are sorted alphabetically
- **Linked Initiative**: Strategic initiative (optional, searchable Popover dropdown)
  - Initiatives are sorted alphabetically
  - Color is used for visual identification
  - Used to generate the human readable ID prefix
- **Board Column**: Current board column (required, Select dropdown)

### Goal and Initiative Linking

**Goal Selection:**
- Searchable dropdown with all goals
- Shows goal text for each option
- Selecting a goal automatically links the feature to that goal's initiative
- Provides context about why the feature exists

**Initiative Selection:**
- Searchable dropdown with all initiatives
- Shows initiative name for each option
- Visual color indicator matches the initiative color
- Helps organize features by strategic theme

## Data Management

### Feature Organization

- Features are organized by:
  - **Column**: Current stage in the workflow
  - **Position**: Order within the column
- Features can be linked to:
  - **Goal**: From the roadmap
  - **Initiative**: From the strategy page
- Each feature has a unique **Human Readable ID**:
  - Automatically generated on creation
  - Format: `XXX-N` (prefix from initiative + sequential number)
  - Used for easy reference and identification
  - Immutable (cannot be changed after creation)

### Human Readable ID

Each feature has a unique human-readable identifier that is automatically generated when the feature is created.

**Identifier Format:**
- Format: `XXX-N` where:
  - `XXX` is a prefix consisting of the first 3 characters of the initiative name (uppercase) that the feature belongs to
  - `N` is a sequential number across all features for the user

**Prefix Generation Rules:**
1. If the feature has a linked initiative:
   - Take the first 3 characters of the initiative name
   - Convert characters to uppercase
   - If the name contains fewer than 3 characters, use all available characters (no padding)
2. If the feature does not have a linked initiative:
   - Use the prefix "NNN"

**Examples:**
- Initiative "Productivity" → `PRO-1`, `PRO-2`, `PRO-3`...
- Initiative "AB" → `AB-1`, `AB-2`...
- Initiative "A" → `A-1`, `A-2`...
- No initiative → `NNN-1`, `NNN-2`...

**Behavior:**
- The identifier is generated only when creating a feature
- The identifier does not change when editing a feature (immutable)
- Changing the initiative does not affect the existing identifier
- Sequential numbers are not renumbered when features are deleted (history is preserved)
- The identifier is displayed in the feature editing dialog as read-only text (for existing features only)

**Usage:**
- Helps quickly reference a specific feature
- Simplifies team communication (can use short ID instead of long name)
- Allows easy identification of features by their relationship to initiatives
- Used in exported Markdown filenames (e.g., `PRO-1 User Authentication.md`)

### Relationships

- Features can reference goals (optional)
- Features can reference initiatives (optional)
- When a goal is selected, the initiative is automatically set
- Initiative colors provide visual grouping

### State Management

- Uses React Query for data fetching
- Optimistic updates for drag and drop operations
- Automatic position recalculation
- Error handling with rollback on failure
- Refetching after mutations to ensure consistency

## User Experience

### Responsive Design

**Desktop:**
- Horizontal scrolling for many columns
- Fixed column widths for consistency
- Mouse-based drag and drop
- Hover effects for interactivity

**Mobile:**
- Snap scrolling between columns
- Touch-optimized drag and drop
- Long press to initiate drag
- Prevents accidental scrolling during drag
- Full-width columns for better visibility

### Visual Feedback

- Drag overlay shows card preview
- Drop targets highlight on hover
- Loading states during operations
- Toast notifications for success/error
- Smooth animations for drag operations

### Touch Interactions

- Long press (500ms) to start dragging
- Movement threshold prevents accidental drags
- Visual feedback during long press
- Prevents vertical scrolling during horizontal drag gestures

### Read-Only Mode

- In read-only mode:
  - "Add" buttons are hidden
  - Feature cards are not clickable
  - Drag and drop is disabled
  - All content is view-only

## Use Cases

1. **Feature Tracking**: Track features through development lifecycle
2. **Workflow Management**: Organize work by development stage
3. **Strategic Alignment**: Link features to goals and initiatives
4. **Team Coordination**: Visual board for team collaboration
5. **Progress Monitoring**: See what's in progress, done, or blocked

## Technical Details

### Drag and Drop Implementation

- Uses `@dnd-kit` library for drag and drop
- Supports both mouse and touch interactions
- Optimistic updates for immediate feedback
- Position recalculation on drop
- Handles edge cases (same position, empty columns, etc.)

### Performance

- Virtual scrolling not implemented (suitable for typical feature counts)
- Efficient position updates
- Query invalidation for data consistency
- Optimistic updates reduce perceived latency

