-- Add position field to features table
ALTER TABLE public.features 
ADD COLUMN position integer NOT NULL DEFAULT 0;

-- Create index for better performance on position queries
CREATE INDEX idx_features_board_column_position ON public.features(board_column, position);