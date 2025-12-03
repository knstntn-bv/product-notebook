-- Add show_archived column to project_settings table
ALTER TABLE public.project_settings 
ADD COLUMN show_archived boolean NOT NULL DEFAULT false;

