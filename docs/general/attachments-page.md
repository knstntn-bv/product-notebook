# Attachments Page

## Overview

The Attachments page is the product file library: upload, list, download, and delete files. Linking files to hypotheses and features happens from those editors, not from this page.

## Location

- **Component**: `src/pages/AttachmentsPage.tsx`
- **Route**: `/attachments`
- **Access**: Attachments item in the sidebar

## Behavior

- **Upload** is a page-level action in the app header (`HeaderActions`; see [Page actions](./main-application.md#page-actions)). Linking files to a hypothesis or feature uses the editor dialog, not this button.
- Files belong to the current product (`product_id`).
- Upload is limited to 10 MB per file and 200 MB per product. Executables are rejected.
- Duplicate content (SHA-256) does not create a second Storage object; the user is told the file already exists.
- The list shows whether a file is linked to hypotheses and/or features (badges only, no entity names).
- Delete removes the Storage object and the library row. Junction rows are removed by `ON DELETE CASCADE` (including links to archived or closed entities).
- Detach-from-entity is not available here; use the Attachments dialog on a saved hypothesis or feature.

See [Data Model](./data-model.md) for tables and [Hypotheses Page](./hypotheses-page.md) / [Board Page](./board-page.md) for the editor dialog.
