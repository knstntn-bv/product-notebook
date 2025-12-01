# Human Readable ID for Features

## Overview

Added `human_readable_id` field for Feature - a unique human-readable identifier that is automatically generated when a feature is created.

## Identifier Format

The identifier has the format `XXX-N`, where:
- **XXX** - prefix consisting of the first 3 characters of the initiative name (uppercase) that the feature belongs to
- **N** - sequential number of the feature (sequential numbering across all user's features)

### Prefix Generation Rules

1. If the feature has a linked initiative:
   - Take the first 3 characters of the initiative name
   - Convert characters to uppercase
   - If the name contains fewer than 3 characters, use all available characters (no padding)

2. If the feature does not have a linked initiative:
   - Use the prefix "NNN"

### Examples

- Initiative "Productivity" → `PRO-1`, `PRO-2`, `PRO-3`...
- Initiative "AB" → `AB-1`, `AB-2`...
- Initiative "A" → `A-1`, `A-2`...
- No initiative → `NNN-1`, `NNN-2`...

## Technical Details

### Database

**Migration**: `supabase/migrations/20250115000000_add_human_readable_id_to_features.sql`

- Added `human_readable_id` column of type `text` to the `features` table
- Created index `idx_features_human_readable_id` for search optimization

### Identifier Generation

The identifier is automatically generated when creating a new feature in the following places:

1. **BoardPage** (`src/pages/BoardPage.tsx`)
   - When creating a feature through the board dialog

2. **HypothesesPage** (`src/pages/HypothesesPage.tsx`)
   - When creating a feature from hypotheses

### Generation Logic

```typescript
// Get prefix from initiative
let prefix = "NNN";
if (feature.initiative_id) {
  const initiative = initiatives.find(i => i.id === feature.initiative_id);
  if (initiative?.name) {
    prefix = initiative.name
      .substring(0, 3)
      .toUpperCase();
  }
}

// Get sequential number
const { count } = await supabase
  .from("features")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id);

const featureNumber = (count || 0) + 1;
const human_readable_id = `${prefix}-${featureNumber}`;
```

### UI Display

**Feature Edit Dialog** (`src/pages/BoardPage.tsx`):
- The identifier is displayed at the top of the form (above all fields)
- Displayed only for existing features (new features don't have an identifier yet)
- Displayed as plain text (read-only, non-editable)
- Styled as muted text (`text-muted-foreground`)

### Type Updates

The following interfaces and types have been updated:

1. **Feature interface** in `BoardPage.tsx`:
   ```typescript
   interface Feature {
     // ... other fields
     human_readable_id?: string;
   }
   ```

2. **Feature interface** in `HypothesesPage.tsx`:
   ```typescript
   interface Feature {
     // ... other fields
     human_readable_id?: string;
   }
   ```

3. **Database types** in `src/integrations/supabase/types.ts`:
   - Added `human_readable_id: string | null` field to `Row`, `Insert`, and `Update` types for the `features` table

## Behavior

### When Creating a Feature

1. Determine prefix based on initiative (or "NNN")
2. Count total number of user's features
3. Generate identifier with the next sequential number
4. Save identifier to database along with other feature data

### When Editing a Feature

- The identifier **does not change** (immutable)
- The identifier is displayed in the edit dialog as read-only text
- Changing the initiative does not affect the existing identifier

### When Deleting a Feature

- The identifier is deleted along with the feature
- Sequential numbers are not renumbered (history is preserved)

## Usage

### For Users

- The identifier helps quickly reference a specific feature
- Simplifies team communication (can use short ID instead of long name)
- Allows easy identification of features by their relationship to initiatives

### For Developers

- The identifier can be used in API for feature lookup
- Useful for logging and debugging
- Can be used in data export

## Limitations

1. Identifier is generated only when creating a feature
2. Identifier does not change when editing a feature
3. Sequential numbers are not renumbered when features are deleted
4. Prefix is based on initiative name at the time of feature creation

## Future Improvements

Possible directions for development:

- Display identifier on feature cards on the board
- Search features by identifier
- Import with identifier preservation
- User-configurable identifier format

## Export Feature

Features can be exported to Markdown files using the human readable ID in the filename. See [Board Page documentation](./board-page.md#exporting-features) for details.
