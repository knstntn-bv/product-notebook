-- Add color column to tracks table
ALTER TABLE public.tracks 
ADD COLUMN color text DEFAULT '#8B5CF6';