# Hypotheses Page

## Overview

The Hypotheses Page provides a comprehensive table for tracking and managing product hypotheses. It allows users to document insights, problem and solution hypotheses, validation results, and impact metrics in a structured format. The page uses a dialog-based editing approach for better user experience and data safety.

## Location

- **Component**: `src/pages/HypothesesPage.tsx`
- **Access**: Via "Hypotheses" tab in the main application

## Table Structure

### Columns

The hypotheses table contains the following columns:

1. **Status**: Current status of the hypothesis displayed as text (sortable)
2. **Insight**: The initial insight or observation (read-only in table)
3. **Problem Hypothesis**: Combined column showing:
   - Problem hypothesis (main text)
   - Problem validation (displayed below with separator)
4. **Solution Hypothesis**: Combined column showing:
   - Solution hypothesis (main text)
   - Solution validation (displayed below with separator)
5. **Impact Metrics**: Metrics that would be impacted by this hypothesis (displayed as tags)
6. **Actions**: Button for creating features from hypothesis

**Note**: All content in the table is read-only. To edit a hypothesis, click on the table row to open the editing dialog.

### Responsive Design

**Desktop:**
- Auto table layout with automatic column width distribution
- Status and Actions columns automatically adjust to content width
- Other columns use percentage-based widths
- All columns visible simultaneously

**Mobile:**
- Horizontal scrolling enabled
- Minimum width of 1200px to maintain readability
- Touch-friendly interaction areas

## Hypothesis Fields

### Status

**Options:**
- **New**: Hypothesis just created, not yet started
- **In Progress**: Currently being validated or worked on
- **Accepted**: Hypothesis has been validated and accepted
- **Rejected**: Hypothesis has been invalidated or rejected

**Behavior:**
- Displayed as text in the table (read-only)
- Can be edited in the hypothesis editing dialog
- Sortable column (click header to sort)
- Sorting cycles: None → Ascending → Descending → None
- Column width automatically adjusts to content

### Insight

**Purpose**: The initial observation or insight that led to the hypothesis.

**Behavior:**
- Displayed as read-only text in the table
- Editable in the hypothesis editing dialog
- Supports multi-line text
- Placeholder in dialog: "Enter insight..."

### Problem Hypothesis & Validation

**Purpose**: The hypothesis about what problem exists and evidence validating it.

**Table Display:**
- Combined in a single column
- Problem hypothesis shown as main text
- Problem validation displayed below with a visual separator (border)
- Validation text uses smaller font size and muted color
- Both fields are read-only in the table

**Dialog Editing:**
- Separate fields in the editing dialog
- Problem hypothesis: Textarea with placeholder "Enter problem hypothesis..."
- Problem validation: Textarea with placeholder "Enter validation (links supported)..."
- Supports multi-line text and links

### Solution Hypothesis & Validation

**Purpose**: The hypothesis about what solution would address the problem and evidence validating it.

**Table Display:**
- Combined in a single column
- Solution hypothesis shown as main text
- Solution validation displayed below with a visual separator (border)
- Validation text uses smaller font size and muted color
- Both fields are read-only in the table

**Dialog Editing:**
- Separate fields in the editing dialog
- Solution hypothesis: Textarea with placeholder "Enter solution hypothesis..."
- Solution validation: Textarea with placeholder "Enter validation (links supported)..."
- Supports multi-line text and links

### Impact Metrics

**Purpose**: Metrics that would be impacted if this hypothesis is validated.

**Table Display:**
- Displayed as read-only tags (badges)
- Shows all metrics associated with the hypothesis
- If no metrics, displays "No metrics" in italic muted text

**Dialog Editing:**
- Tag input component (`MetricTagInput`)
- Type to add metrics
- Autocomplete suggestions from metrics defined in Strategy page
- Multiple metrics can be added
- Placeholder: "Type to add metrics..."

## Behavior

### Creating Hypotheses

1. Click the "Add Hypothesis" button at the top
2. A dialog opens with empty fields:
   - Status: "New" (default)
   - All other fields: Empty
3. Fill in the fields in the dialog
4. Click "Save Hypothesis" to create the hypothesis
5. Dialog closes and the new hypothesis appears in the table

### Editing Hypotheses

**Dialog-Based Editing:**
- Click on any row in the table to open the editing dialog
- The dialog uses a two-column layout on desktop and single-column stacked layout on mobile
- All fields are editable in the dialog:
  - **Left Column (Desktop)**: Text input fields
    - Insight (Textarea, 5 rows)
    - Problem Hypothesis (Textarea, 5 rows)
    - Problem Validation (Textarea, 3 rows)
    - Solution Hypothesis (Textarea, 5 rows)
    - Solution Validation (Textarea, 3 rows)
    - Impact Metrics (Tag input)
  - **Right Column (Desktop)**: Selection fields and actions
    - Status (Select dropdown)
    - Delete button (at bottom)
- Changes are made in the dialog, not in the table
- No risk of losing changes - dialog must be explicitly closed

**Dialog Layout:**
- **Width**: 
  - Desktop: Maximum width of 1152px (6xl) for two-column layout
  - Mobile: Maximum width of 768px (3xl) for single-column layout
- **Height**: 
  - Minimum height of 660px for comfortable viewing
  - Maximum height of 90% of viewport height
- **Background**: Light gray (`bg-muted`) for better visual separation
- **Scrolling**: 
  - Desktop: Only the left column (text fields) scrolls; right column remains fixed
  - Mobile: Entire content area scrolls
- **Focus Rings**: Padding ensures that field focus highlights are fully visible

**Saving Changes:**
- Click "Save Hypothesis" button in the dialog footer
- All changes are saved at once
- Success toast notification on save
- Dialog closes and table updates
- If dialog is closed without saving, changes are discarded

**Table Display:**
- All content in the table is read-only
- Table rows are clickable (cursor changes to pointer on hover)
- Hover effect indicates rows are interactive

### Deleting Hypotheses

1. Click on a hypothesis row to open the editing dialog
2. Click the "Delete" button in the dialog
3. A confirmation dialog appears asking to confirm deletion
4. Click "Delete" in the confirmation dialog to proceed
5. Hypothesis is deleted and removed from the table
6. Success toast notification

### Creating Features from Hypotheses

**Purpose**: Convert validated hypotheses into features on the Board.

**Behavior:**
1. Click the "+" (Plus) button in the Actions column
2. A dialog opens with a pre-filled feature form:
   - **Title**: Pre-filled with the hypothesis "Insight"
   - **Description**: Pre-filled with the "Solution Hypothesis"
   - **Column**: Defaults to "Backlog"
   - **Linked Goal**: Optional, can be selected
   - **Linked Initiative**: Optional, can be selected
3. Modify any fields as needed
4. Click "Create Feature" to add the feature to the Board

**Note**: A human readable ID is automatically generated when the feature is created. The ID format is `XXX-N` where `XXX` is derived from the initiative name (or "NNN" if no initiative) and `N` is a sequential number. See [Board Page documentation](./board-page.md#human-readable-id) for more details.

**Use Case**: This allows users to quickly turn validated hypotheses into actionable features without manual data entry.

**Note**: The button click is isolated from row click - clicking the button does not open the hypothesis editing dialog.

### Status Sorting

**Behavior:**
- Click the "Status" column header to sort
- Sorting cycles through three states:
  1. **None**: Original order (by creation date)
  2. **Ascending**: New → In Progress → Accepted → Rejected
  3. **Descending**: Rejected → Accepted → In Progress → New
- Visual indicator (arrow up/down) shows current sort direction
- Sorting applies to all hypotheses in the table

## Data Management

### State Management

**Dialog State:**
- Single editing state for the currently open hypothesis
- Changes are stored in `editingHypothesis` state
- All fields are included in the save mutation
- State is cleared when dialog closes

**Data Fetching:**
- Uses React Query for data fetching
- Automatically refetches after mutations
- Sorted locally based on status sort preference
- Data is normalized on fetch to handle null values properly

### Validation

- No required fields (all fields are optional)
- Status always has a default value ("new")
- Impact metrics are stored as an array of metric names
- All text fields support multi-line content

### Relationships

- All hypotheses belong to a specific product (`product_id`)
- Impact metrics reference metrics from the Strategy page (same product)
- Features created from hypotheses can be linked to goals and initiatives (same product)
- No direct database relationships (metrics stored as names, not IDs)
- All data is scoped to the current product

## User Experience

### Dialog-Based Editing

- All fields are edited in a dedicated dialog
- Prevents accidental data loss (changes are only saved when explicitly saved)
- Better focus on editing task
- Consistent with Goals and Features editing patterns
- Dialog can be closed with Cancel button or by clicking outside

### Visual Feedback

- Toast notifications for save and delete operations
- Loading states during mutations
- Status displayed as text with clear labels
- Table rows show hover effect indicating they're clickable
- Confirmation dialog for destructive actions (delete)

### Workflow Support

**Hypothesis Lifecycle:**
1. **New**: Create hypothesis with insight
2. **In Progress**: Add problem and solution hypotheses, start validation
3. **Accepted/Rejected**: Mark status based on validation results
4. **Feature Creation**: Convert accepted hypotheses to features

**Validation Tracking:**
- Separate fields for problem and solution validation
- Supports links and evidence
- Clear separation between hypothesis and validation

### Read-Only Mode

- In read-only mode:
  - "Add Hypothesis" button is hidden
  - Table rows are not clickable (no hover effect)
  - Action buttons (Create Feature) are hidden
  - Content is view-only
  - Editing dialog cannot be opened

## Use Cases

1. **Discovery**: Document insights and observations
2. **Problem Validation**: Track evidence for problem hypotheses
3. **Solution Validation**: Track evidence for solution hypotheses
4. **Metric Alignment**: Link hypotheses to impact metrics
5. **Feature Planning**: Convert validated hypotheses into features
6. **Portfolio Management**: Track multiple hypotheses and their statuses
7. **Learning Documentation**: Record what was learned from validation

## Technical Details

### Dialog Component

- Uses `EntityDialog` component (shared with Goals and Features)
- Two-column layout on desktop (70/30 split)
- Single-column stacked layout on mobile
- Consistent UI/UX across the application
- Supports save, delete, and cancel actions
- Responsive design for all screen sizes
- Custom thin scrollbar for better visual appearance

### Table Layout

- Uses `table-auto` layout for automatic column width distribution
- Status and Actions columns use `w-auto` to fit content
- Other columns use percentage-based widths
- Combined columns (Problem/Solution Hypothesis with Validation) use visual separators

### Data Normalization

- Data from database is normalized on fetch
- Handles null values for all text fields (converts to empty strings)
- Handles null values for impact_metrics (converts to empty arrays)
- Ensures consistent data types throughout the component

### Metric Tag Input

- Uses `MetricTagInput` component in the editing dialog
- Provides autocomplete from existing metrics
- Supports multiple tags
- Stores as array of metric name strings

### Sorting Implementation

- Client-side sorting
- Maintains original order when sort is cleared
- Status order is predefined (New < In Progress < Accepted < Rejected)
- Visual indicators show sort direction

### Mutation Handling

- Separate mutations for create/update and delete
- Optimistic updates with error rollback
- Query invalidation after successful mutations
- Error handling with toast notifications

