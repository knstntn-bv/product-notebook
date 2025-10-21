-- Update features table to use foreign keys instead of text
ALTER TABLE features
  DROP COLUMN linked_epic,
  DROP COLUMN linked_track;

ALTER TABLE features
  ADD COLUMN epic_id uuid REFERENCES epics(id) ON DELETE SET NULL,
  ADD COLUMN track_id uuid REFERENCES tracks(id) ON DELETE SET NULL;