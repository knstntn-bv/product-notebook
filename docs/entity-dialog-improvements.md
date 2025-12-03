# Entity Dialog Improvements

## Overview

This document describes the improvements made to the `EntityDialog` component and related editing dialogs across the application. These changes were implemented to improve usability, visual design, and user experience when editing entities (Goals, Features, Hypotheses).

## Implementation Date

2025-01-15

## Changes Summary

### 1. Two-Column Dialog Layout (ESS-55)

**Problem**: Dialog editing forms had accumulated many options that no longer fit in the current single-column layout.

**Solution**: Implemented a two-column layout for entity editing dialogs with a 70/30 split.

#### Layout Structure

**Desktop (Two-Column)**:
- **Left Column (70%)**: Contains all free-form text input fields:
  - `Input` components
  - `Textarea` components
  - `MetricTagInput` components (autocomplete fields)
- **Right Column (30%)**: Contains:
  - Dropdown menus (`Select`, `Popover` for goals, initiatives, status, column, quarter)
  - Action buttons (Archive, Export if applicable)
  - Delete button
  - Cancel and Save buttons (at the bottom right)

**Mobile (Single-Column)**:
- All fields stack vertically
- Order: Text input fields → Dropdown menus → Action buttons → Cancel/Save

#### Field Distribution by Entity Type

**Goals (RoadmapPage)**:
- **Left**: `goal` (Input), `expected_result` (Textarea), `achieved_result` (Textarea), `target_metrics` (MetricTagInput)
- **Right**: `quarter` (Select), `done` (Checkbox), Archive, Delete, Cancel, Save buttons

**Features (BoardPage)**:
- **Left**: `title` (Input), `description` (Textarea)
- **Right**: `goal_id` (Popover), `initiative_id` (Popover), `board_column` (Select), Export, Delete, Cancel, Save buttons

**Hypotheses (HypothesesPage)**:
- **Left**: `insight` (Textarea), `problem_hypothesis` (Textarea), `problem_validation` (Textarea), `solution_hypothesis` (Textarea), `solution_validation` (Textarea), `impact_metrics` (MetricTagInput)
- **Right**: `status` (Select), Delete, Cancel, Save buttons

#### Technical Implementation

- Dialog width increased from `max-w-3xl` to `max-w-6xl` for two-column layout
- Grid layout with `grid-cols-[1fr_0.43fr]` (approximately 70/30 ratio)
- Backward compatibility maintained through `children` prop for legacy single-column layout
- Uses `useIsMobile` hook for responsive behavior

**Files Modified**:
- `src/components/EntityDialog.tsx`
- `src/pages/RoadmapPage.tsx`
- `src/pages/BoardPage.tsx`
- `src/pages/HypothesesPage.tsx`

### 2. Text Input Field Height Increase

**Change**: Increased default height of text input fields from 3 rows to 5 rows.

**Affected Fields**:
- All `Textarea` components in entity editing dialogs
- Fields with `rows={3}` changed to `rows={5}`
- Fields without explicit `rows` attribute now have `rows={5}` added

**Specific Changes**:
- **HypothesesPage**: 
  - `insight`, `problem_hypothesis`, `solution_hypothesis` fields: `rows={3}` → `rows={5}`
  - `problem_validation`, `solution_validation`: `rows={3}` (kept at 3 by user preference)
  - `description` in feature creation: `rows={4}` → `rows={5}`
- **RoadmapPage**: 
  - `expected_result`, `achieved_result`: Added `rows={6}` (user preference)
- **BoardPage**: 
  - `description`: Added `rows={15}` (user preference)
- **StrategyPage**: 
  - Values editing: Added `rows={5}`

**Rationale**: Larger text areas provide more visible space for content, reducing the need for scrolling within fields and improving readability.

### 3. Scrollbar Customization

**Problem**: The default browser scrollbar was too wide and visually prominent, distracting from the content.

**Solution**: Implemented custom thin, subtle scrollbar styling.

#### Scrollbar Behavior

- **Location**: Only the left column scrolls (where text input fields are located)
- **Right Column**: Fixed position, no scrolling (dropdowns and buttons remain visible)
- **Width**: 6px (reduced from default ~15px)
- **Color**: Subtle gray with 20% opacity, 30% on hover
- **Cross-browser Support**: 
  - Firefox: Uses `scrollbar-width: thin`
  - Chrome/Safari: Uses `-webkit-scrollbar` custom styling

#### Technical Implementation

Created utility class `scrollbar-thin` in `src/index.css`:
```css
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.2) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.2);
  border-radius: 9999px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.3);
}
```

Applied to left column container in `EntityDialog`.

**Files Modified**:
- `src/components/EntityDialog.tsx`
- `src/index.css`

### 4. Focus Ring Padding Fix

**Problem**: Focus ring (outline) on input fields was being clipped at the edges of the scrollable container.

**Solution**: Added padding to the left column container to provide space for the focus ring.

#### Padding Applied

- **Left padding**: `pl-2` (0.5rem / 8px) - prevents left edge clipping
- **Right padding**: `pr-4` (1rem / 16px) - prevents right edge clipping and provides space for scrollbar

The focus ring uses `ring-offset-2` (2px offset) plus the ring itself (2px), requiring approximately 4px of space, which is now provided by the padding.

**Files Modified**:
- `src/components/EntityDialog.tsx`

### 5. Dialog Background Color Change

**Change**: Changed dialog background from white to a subtle light gray.

**Implementation**: 
- Changed from `bg-background` (white) to `bg-muted` (light gray)
- Uses the design system's `muted` color variable
- Solid color (no transparency) to prevent page content from showing through

**Rationale**: The light gray background provides better visual separation between the dialog and the page content, and creates a softer, less harsh appearance when there are many input fields and buttons.

**Files Modified**:
- `src/components/EntityDialog.tsx`

## Component Structure

### EntityDialog Props

The `EntityDialog` component now supports both legacy and new layouts:

```typescript
interface EntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: ReactNode; // Legacy single-column layout
  leftContent?: ReactNode; // New two-column: left side
  rightContent?: ReactNode; // New two-column: right side
  onSave: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onArchive?: () => void;
  saveLabel?: string;
  deleteLabel?: string;
  exportLabel?: string;
  isEditing?: boolean;
  isArchived?: boolean;
  contentClassName?: string;
}
```

### Layout Detection

The component automatically detects which layout to use:
- **Two-column**: When `leftContent` or `rightContent` is provided AND not on mobile
- **Legacy**: When `children` is provided (backward compatibility)
- **Mobile**: Always uses single-column stacked layout

## User Experience Improvements

### Benefits

1. **Better Organization**: Logical separation between text input and selection fields
2. **More Space**: Wider dialog (max-w-6xl) accommodates more content
3. **Improved Readability**: Larger text areas reduce scrolling within fields
4. **Less Visual Clutter**: Subtle scrollbar doesn't distract from content
5. **Better Focus Visibility**: Focus rings are no longer clipped
6. **Softer Appearance**: Light gray background is easier on the eyes

### Responsive Behavior

- **Desktop**: Full two-column layout with optimized field distribution
- **Mobile**: Single-column stacked layout for narrow screens
- **Tablet**: Adapts based on screen width using `useIsMobile` hook (breakpoint: 768px)

## Migration Notes

### For Developers

When updating existing dialogs to use the new two-column layout:

1. Replace `children` prop with `leftContent` and `rightContent`
2. Move text input fields to `leftContent`
3. Move dropdowns and buttons to `rightContent`
4. Test on both desktop and mobile devices
5. Ensure focus rings are not clipped (check padding)

### Backward Compatibility

- Existing dialogs using `children` prop continue to work (legacy single-column layout)
- No breaking changes to existing functionality
- All existing EntityDialog usages remain functional

## Related Documentation

- [Hypotheses Page](./hypotheses-page.md) - Details on hypothesis editing
- [Roadmap Page](./roadmap-page.md) - Details on goal editing
- [Board Page](./board-page.md) - Details on feature editing
- [Feature Request: ESS-55](../feature_requests/ESS-55%20Двухколоночный%20диалог%20редактирования.md)

## Technical Details

### CSS Classes Used

- `grid grid-cols-[1fr_0.43fr]` - Two-column grid layout
- `overflow-y-auto` - Scrollable left column
- `scrollbar-thin` - Custom scrollbar styling
- `bg-muted` - Light gray background
- `pl-2 pr-4` - Padding for focus ring and scrollbar

### Dependencies

- `useIsMobile` hook from `@/hooks/use-mobile` for responsive detection
- Tailwind CSS for styling
- Radix UI Dialog primitives for dialog functionality

## Future Considerations

Potential improvements for future iterations:

1. **Configurable Column Ratios**: Allow customization of 70/30 split
2. **Sticky Right Column**: Keep action buttons always visible
3. **Keyboard Navigation**: Enhanced keyboard shortcuts for field navigation
4. **Field Grouping**: Visual grouping of related fields
5. **Auto-save**: Optional auto-save functionality for long forms

