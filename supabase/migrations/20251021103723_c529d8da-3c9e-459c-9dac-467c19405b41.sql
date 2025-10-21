-- Rename epics table to initiatives
ALTER TABLE epics RENAME TO initiatives;

-- Rename the epic_id column in features table to initiative_id
ALTER TABLE features RENAME COLUMN epic_id TO initiative_id;

-- Update the foreign key name (drop old, create new)
ALTER TABLE features DROP CONSTRAINT IF EXISTS features_epic_id_fkey;
ALTER TABLE features ADD CONSTRAINT features_initiative_id_fkey 
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id) ON DELETE SET NULL;