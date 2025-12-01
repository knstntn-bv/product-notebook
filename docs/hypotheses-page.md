# Hypotheses Page

## Overview

The Hypotheses Page provides a comprehensive table for tracking and managing product hypotheses. It allows users to document insights, problem and solution hypotheses, validation results, and impact metrics in a structured format.

## Location

- **Component**: `src/pages/HypothesesPage.tsx`
- **Access**: Via "Hypotheses" tab in the main application

## Table Structure

### Columns

The hypotheses table contains the following columns:

1. **Status**: Current status of the hypothesis (sortable)
2. **Insight**: The initial insight or observation
3. **Problem Hypothesis**: The hypothesis about the problem
4. **Problem Validation**: Evidence validating the problem hypothesis
5. **Solution Hypothesis**: The hypothesis about the solution
6. **Solution Validation**: Evidence validating the solution hypothesis
7. **Impact Metrics**: Metrics that would be impacted by this hypothesis
8. **Actions**: Buttons for saving, creating features, and deleting

### Responsive Design

**Desktop:**
- Fixed table layout with percentage-based column widths
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
- Dropdown selector for each hypothesis
- Changes are tracked locally until saved
- Sortable column (click header to sort)
- Sorting cycles: None → Ascending → Descending → None

### Insight

**Purpose**: The initial observation or insight that led to the hypothesis.

**Behavior:**
- Auto-resizing textarea (starts at 2 rows)
- Grows with content
- Placeholder: "Enter insight..."
- Changes tracked locally
- Supports multi-line text

### Problem Hypothesis

**Purpose**: The hypothesis about what problem exists.

**Behavior:**
- Auto-resizing textarea (starts at 2 rows)
- Grows with content
- Placeholder: "Enter problem hypothesis..."
- Changes tracked locally
- Supports multi-line text

### Problem Validation

**Purpose**: Evidence or links validating the problem hypothesis.

**Behavior:**
- Auto-resizing textarea (starts at 2 rows)
- Grows with content
- Placeholder: "Enter validation (links supported)..."
- Changes tracked locally
- Supports links and multi-line text

### Solution Hypothesis

**Purpose**: The hypothesis about what solution would address the problem.

**Behavior:**
- Auto-resizing textarea (starts at 2 rows)
- Grows with content
- Placeholder: "Enter solution hypothesis..."
- Changes tracked locally
- Supports multi-line text

### Solution Validation

**Purpose**: Evidence or links validating the solution hypothesis.

**Behavior:**
- Auto-resizing textarea (starts at 2 rows)
- Grows with content
- Placeholder: "Enter validation (links supported)..."
- Changes tracked locally
- Supports links and multi-line text

### Impact Metrics

**Purpose**: Metrics that would be impacted if this hypothesis is validated.

**Behavior:**
- Tag input component (`MetricTagInput`)
- Type to add metrics
- Autocomplete suggestions from metrics defined in Strategy page
- Multiple metrics can be added
- Placeholder: "Type to add metrics..."
- Changes tracked locally

## Behavior

### Creating Hypotheses

1. Click the "Add Hypothesis" button at the top
2. A new row is added to the table with default values:
   - Status: "New"
   - All other fields: Empty
3. Start editing fields inline
4. Click "Save" button to persist changes

### Editing Hypotheses

**Inline Editing:**
- All fields (except Status and Impact Metrics) use auto-resizing textareas
- Click in any field to start editing
- Changes are tracked locally in component state
- No auto-save - must click "Save" button to persist

**Saving Changes:**
- "Save" button appears in Actions column when there are unsaved changes
- Click "Save" to persist all changes for that hypothesis
- Success toast notification on save
- Changes are cleared from local state after save

### Deleting Hypotheses

1. Click the trash icon in the Actions column
2. Hypothesis is immediately deleted (no confirmation dialog)
3. Success toast notification
4. Row is removed from the table

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

**Note**: A human readable ID is automatically generated when the feature is created. The ID format is `XXX-N` where `XXX` is derived from the initiative name (or "NNN" if no initiative) and `N` is a sequential number. See [Human Readable ID documentation](./features-human-readable-id.md) for more details.

**Use Case**: This allows users to quickly turn validated hypotheses into actionable features without manual data entry.

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

**Local State:**
- Each hypothesis row tracks its own editing state
- Changes are stored in `editedHypotheses` object
- Only changed fields are included in the update mutation
- Local state is cleared after successful save

**Data Fetching:**
- Uses React Query for data fetching
- Automatically refetches after mutations
- Sorted locally based on status sort preference

### Validation

- No required fields (all fields are optional)
- Status always has a default value ("new")
- Impact metrics are stored as an array of metric names
- All text fields support multi-line content

### Relationships

- Impact metrics reference metrics from the Strategy page
- Features created from hypotheses can be linked to goals and initiatives
- No direct database relationships (metrics stored as names, not IDs)

## User Experience

### Inline Editing

- All fields are editable directly in the table
- Auto-resizing textareas prevent layout shifts
- Changes are clearly indicated by the "Save" button
- No need to open separate dialogs for editing

### Visual Feedback

- "Save" button only appears when there are unsaved changes
- Toast notifications for save and delete operations
- Loading states during mutations
- Status dropdown provides clear visual states

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
  - All fields are disabled (display-only)
  - Action buttons (Save, Create Feature, Delete) are hidden
  - Status dropdown is disabled
  - Content is view-only

## Use Cases

1. **Discovery**: Document insights and observations
2. **Problem Validation**: Track evidence for problem hypotheses
3. **Solution Validation**: Track evidence for solution hypotheses
4. **Metric Alignment**: Link hypotheses to impact metrics
5. **Feature Planning**: Convert validated hypotheses into features
6. **Portfolio Management**: Track multiple hypotheses and their statuses
7. **Learning Documentation**: Record what was learned from validation

## Technical Details

### Auto-Resizing Textareas

- Uses `AutoResizeTextarea` component
- Automatically adjusts height based on content
- Minimum 2 rows, grows as needed
- Prevents layout shifts during editing

### Metric Tag Input

- Uses `MetricTagInput` component
- Provides autocomplete from existing metrics
- Supports multiple tags
- Stores as array of metric name strings

### Sorting Implementation

- Client-side sorting
- Maintains original order when sort is cleared
- Status order is predefined (New < In Progress < Accepted < Rejected)
- Visual indicators show sort direction

