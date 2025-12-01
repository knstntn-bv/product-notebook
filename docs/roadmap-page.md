# Roadmap Page

## Overview

The Roadmap Page provides a matrix view for organizing goals by strategic initiatives and time periods (quarters). It allows users to plan, track, and manage goals across different initiatives and timeframes.

## Location

- **Component**: `src/pages/RoadmapPage.tsx`
- **Access**: Via "Roadmap" tab in the main application

## Layout

### Table Structure

The roadmap is displayed as a table with:
- **Rows**: One row per initiative
- **Columns**: 
  - First column: Initiative name (with color indicator)
  - Subsequent columns: Time periods (Current Quarter, Next Quarter, Next Half-Year)

### Initiative Column

- Displays the initiative name
- Shows a colored vertical bar on the left edge (matching the initiative's color)
- Color helps visually identify which initiative each row belongs to

### Time Period Columns

Three time periods are available:
1. **Current Quarter**: Goals for the current quarter
2. **Next Quarter**: Goals for the next quarter
3. **Next Half-Year**: Goals for the next half-year period

## Goal Cards

### Display

Each goal is displayed as a card within its cell showing:
- **Goal Title**: The main goal text (bold)
- **Expected Result**: Description of what is expected (if provided)
- **Achieved Result**: Description of what was actually achieved (if provided)
- **Done Badge**: Green "Done" badge if the goal is marked as complete

### Visual States

- **Normal**: Standard card appearance
- **Dragging**: Card becomes semi-transparent with a ring border
- **Done**: Green badge indicates completion

## Behavior

### Creating Goals

1. Click the "Add Goal" button in any cell
2. A dialog opens with goal editing form
3. Fill in the required fields:
   - **Goal**: The goal text (required)
   - **Quarter**: Select the time period (required)
   - **Expected Result**: Optional description
   - **Achieved Result**: Optional description
   - **Target Metrics**: Select metrics that this goal impacts
   - **Done**: Checkbox to mark as complete
4. Click "Save Goal" to create the goal

### Editing Goals

1. Click on any goal card (when not dragging)
2. The same dialog opens with pre-filled values
3. Modify any fields
4. Click "Save Goal" to update

### Deleting Goals

1. Open the goal editing dialog
2. Click the "Delete" button
3. Confirm deletion in the alert dialog
4. Goal is permanently removed

### Goal Dialog

The goal editing dialog provides a user-friendly interface for creating and editing goals.

**Dialog Layout:**
- **Width**: Maximum width of 768px (3xl) to accommodate focus rings and prevent clipping
- **Height**: 
  - Minimum height of 660px to fit all goal fields without scrolling
  - Maximum height of 90% of viewport height
  - Automatically adjusts to content size
- **Scrolling**: When content exceeds the dialog height, only the form fields area scrolls while the header and action buttons remain fixed
- **Focus Rings**: Dialog width ensures that field focus highlights are fully visible without being cut off

**Dialog Structure:**
- **Header**: Fixed at the top, contains the dialog title
- **Content Area**: Scrollable middle section containing all form fields
- **Footer**: Fixed at the bottom, contains Cancel and Save buttons (and Delete button when editing)

**User Experience:**
- All goal fields (Goal, Quarter, Expected Result, Achieved Result, Target Metrics, Done) fit comfortably without scrolling in most cases
- Focus rings on active fields are never clipped
- Scrollbar appears only when content exceeds available space
- Content is properly padded to prevent overlap with the scrollbar

### Drag and Drop

**Moving Goals Between Cells:**
- Goals can be dragged from one cell to another
- Dragging changes both the initiative and quarter
- Visual feedback shows where the goal will be dropped
- The goal's position updates immediately (optimistic update)
- Changes are persisted to the database

**Drag Behavior:**
- Click and hold on a goal card to start dragging
- Drag over another cell or goal card to move it
- Release to drop the goal in the new location
- In read-only mode, dragging is disabled

**Visual Feedback:**
- Dragging card shows as semi-transparent
- Drop target cells highlight when hovered
- Drag overlay shows a preview of the card being dragged

### Goal Details

**Goal Fields:**
- **Goal**: Main goal statement (required, text input)
- **Quarter**: Time period selection (required, dropdown)
- **Expected Result**: What outcome is expected (optional, textarea)
- **Achieved Result**: What was actually achieved (optional, textarea)
- **Target Metrics**: Metrics this goal impacts (optional, tag input)
  - Users can type to add metrics
  - Suggestions come from the metrics defined in Strategy page
  - Multiple metrics can be selected
- **Done**: Checkbox to mark goal as complete

### Target Metrics

- Uses the `MetricTagInput` component
- Allows adding multiple metrics as tags
- Provides autocomplete suggestions from existing metrics
- Metrics are stored as an array of metric names
- Used to track which metrics are impacted by each goal

## Data Management

### Goal Organization

- Goals are automatically organized by:
  - **Initiative**: Which strategic initiative they belong to
  - **Quarter**: Which time period they target
- Goals can be moved between cells via drag and drop
- Each goal must belong to exactly one initiative and one quarter

### Relationships

- Goals are linked to initiatives (required)
- Goals can reference metrics (via target_metrics array)
- Goals can be linked to features in the Board page

### State Management

- Uses React Query for data fetching
- Optimistic updates for drag and drop operations
- Automatic refetching after mutations
- Error handling with rollback on failure

## User Experience

### Responsive Design

- Table scrolls horizontally on smaller screens
- Cards are sized appropriately for their content
- Touch-friendly drag and drop on mobile devices

### Visual Hierarchy

- Initiative colors provide visual grouping
- Done badges clearly indicate completed goals
- Empty cells show "Add Goal" buttons for clarity

### Interaction Feedback

- Hover states on interactive elements
- Loading states during operations
- Toast notifications for success/error messages
- Smooth drag and drop animations

### Read-Only Mode

- In read-only mode:
  - "Add Goal" buttons are hidden
  - Goal cards are not clickable
  - Drag and drop is disabled
  - All content is view-only

## Use Cases

1. **Quarterly Planning**: Organize goals by initiative and quarter
2. **Progress Tracking**: Mark goals as done and record achieved results
3. **Metric Alignment**: Link goals to specific metrics being tracked
4. **Strategic Alignment**: Ensure goals align with strategic initiatives
5. **Timeline Management**: Visualize goals across different time periods

