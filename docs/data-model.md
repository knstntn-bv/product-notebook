# Data Model

## Overview

The Product Notebook uses a **product-based data model** where all data is organized around products. This allows users to manage multiple products from a single account while maintaining clear data isolation.

## Core Concepts

### Products

**Table**: `products`

**Purpose**: Represents a product that belongs to a user. A user can have multiple products.

**Fields:**
- `id`: Unique identifier (UUID, primary key)
- `user_id`: Foreign key to the user who owns the product (references `auth.users`)
- `name`: Product name (default: "My Product")
- `created_at`: Timestamp when product was created
- `updated_at`: Timestamp when product was last updated

**Relationships:**
- One user can have many products (one-to-many)
- All data tables reference products via `product_id`

**Default Product:**
- When a user first creates data, a default product is automatically created
- The default product name is "My Product"
- Users can have multiple products, but the application currently selects the first product by creation date

### Data Scoping

All data in the application is scoped to a specific product via the `product_id` foreign key:

- **Features**: Each feature belongs to a product
- **Goals**: Each goal belongs to a product
- **Hypotheses**: Each hypothesis belongs to a product
- **Metrics**: Each metric belongs to a product
- **Initiatives**: Each initiative belongs to a product
- **Values**: Each value belongs to a product
- **Product Formulas**: One formula per product (unique constraint on `product_id`)
- **Project Settings**: Settings are stored per product

### Product Context

The `ProductContext` (`src/contexts/ProductContext.tsx`) manages:

- **Current Product Selection**: Tracks which product is currently active (`currentProductId`)
- **Automatic Product Selection**: Automatically selects the user's first product (by creation date)
- **Data Fetching**: All queries are filtered by `product_id`
- **Settings Management**: Manages product-specific settings (e.g., `show_archived`)

## Data Tables

### Features

**Table**: `features`

**Key Fields:**
- `product_id`: Foreign key to products (NOT NULL)
- `goal_id`: Optional reference to goals
- `initiative_id`: Optional reference to initiatives
- `hypothesis_id`: Optional reference to hypotheses (many-to-one relationship)
- `board_column`: Current stage in workflow
- `position`: Order within column
- `human_readable_id`: Unique identifier per product (format: `XXX-N`)
- `closed_at`: Timestamp when feature was closed (moved to Done or Cancelled column) - nullable, updated on each move to these columns

**Relationships:**
- **Many-to-One with Hypotheses**: Multiple features can reference the same hypothesis
  - One hypothesis can be linked to many features
  - When a hypothesis is deleted, `hypothesis_id` in linked features is set to `NULL` (ON DELETE SET NULL)
  - Used to track which features originated from or are related to a specific hypothesis
  - Supports the Discovery workflow: features can be created from hypotheses, and hypotheses can be created from features

**Closed At Field:**
- `closed_at` is automatically set to the current timestamp when a feature is moved to "Done" or "Cancelled" columns
- The field is updated (not reset) each time a feature is moved to these columns
- When a feature is moved from "Done"/"Cancelled" to another column, `closed_at` remains unchanged
- This field is used for tracking when features were completed or cancelled (technical requirement for future functionality)

**Note**: Sequential numbering in `human_readable_id` is scoped to the product.

### Goals

**Table**: `goals`

**Key Fields:**
- `product_id`: Foreign key to products (NOT NULL)
- `initiative_id`: Required reference to initiatives
- `quarter`: Time period (current, next, halfYear)
- `archived`: Archive status
- `archived_at`: Archive timestamp

### Hypotheses

**Table**: `hypotheses`

**Key Fields:**
- `product_id`: Foreign key to products (NOT NULL)
- `status`: Hypothesis status (new, inProgress, accepted, done, rejected)
- `priority`: Priority number (integer, NOT NULL, DEFAULT 3) - lower number = higher priority
- `impact_metrics`: Array of metric names (not foreign keys)

**Status Order:**
- Statuses have a defined order for sorting: New → In work → Accepted → Done → Rejected
- This order is used in the status selection menu and when sorting by status

**Sorting:**
- Hypotheses can be sorted by priority (ascending/descending)
- Hypotheses can be sorted by status (ascending/descending)
- When sorting by priority, secondary sort by status is applied if status sort is active
- When sorting by status, secondary sort by priority is always applied for equal statuses
- Both sorts can be active simultaneously, with the primary sort taking precedence

**Relationships:**
- **One-to-Many with Features**: One hypothesis can be referenced by multiple features
  - Features reference hypotheses via `hypothesis_id` foreign key
  - Supports bidirectional linking: features can be created from hypotheses, and hypotheses can be created from features
  - When a hypothesis is deleted, all feature references are automatically cleared (ON DELETE SET NULL)

### Metrics

**Table**: `metrics`

**Key Fields:**
- `product_id`: Foreign key to products (NOT NULL)
- `parent_metric_id`: Optional reference to parent metric (hierarchy)
- `name`: Metric name

### Initiatives

**Table**: `initiatives`

**Key Fields:**
- `product_id`: Foreign key to products (NOT NULL)
- `name`: Initiative name
- `description`: Initiative description (optional)
- `color`: Visual color identifier (default: #8B5CF6)
- `target_metric_id`: Optional reference to target metric (FK to metrics.id)
- `priority`: Priority number (integer, NOT NULL, DEFAULT 3) - lower number = higher priority
- `archived`: Archive status
- `archived_at`: Archive timestamp

**Sorting:**
- Initiatives are sorted by `priority ASC` (lower priority number = higher priority)
- Within the same priority, non-archived initiatives appear before archived ones

### Values

**Table**: `values`

**Key Fields:**
- `product_id`: Foreign key to products (NOT NULL)
- `value_text`: Value content
- `position`: Order in list

### Product Formulas

**Table**: `product_formulas`

**Key Fields:**
- `product_id`: Foreign key to products (NOT NULL, UNIQUE)
- `formula`: Product formula text

**Constraint**: One formula per product (unique constraint on `product_id`)

### Project Settings

**Table**: `project_settings`

**Key Fields:**
- `product_id`: Foreign key to products (NOT NULL)
- `show_archived`: Boolean flag for archive visibility

**Note**: Settings are now product-specific, not user-specific.

## Data Access Patterns

### Row Level Security (RLS)

All tables use Row Level Security policies that:

1. **Products Table**: Users can only access their own products (`user_id = auth.uid()`)

2. **Data Tables**: Access is controlled through the products table:
   - Users can only access data where `product_id` references a product they own
   - Policies check: `EXISTS (SELECT 1 FROM products WHERE products.id = table.product_id AND products.user_id = auth.uid())`

### Automatic Product Assignment

When inserting data without a `product_id`:

1. A trigger (`auto_populate_product_id`) fires before INSERT
2. The trigger function uses `auth.uid()` to get the current user
3. It calls `get_or_create_default_product()` to get or create a default product
4. The `product_id` is automatically assigned

**Note**: The application explicitly provides `product_id` in all insert operations, but triggers provide a safety net.

## Migration History

The product-based model was introduced in BIG-52:

1. **Stage 1**: Created `products` table, added `product_id` to all data tables
2. **Stage 2**: Migrated existing data to products (created default products for users)
3. **Stage 3**: Added triggers for automatic product creation
4. **Stage 4**: Updated RLS policies to use `product_id` for access control
5. **Stage 5-7**: Updated application code to use `product_id`
6. **Stage 8**: Removed `user_id` from all data tables (kept only in `products` table)

## Benefits

1. **Multi-Product Support**: Users can manage multiple products from one account
2. **Data Isolation**: Clear separation between products
3. **Scalability**: Foundation for future features like product switching
4. **Security**: RLS policies ensure users can only access their own products' data
5. **Flexibility**: Each product can have its own settings and preferences

## Future Enhancements

Potential future features enabled by this model:

- Product switching UI
- Multi-product dashboard
- Product sharing/collaboration
- Product templates
- Product export/import

