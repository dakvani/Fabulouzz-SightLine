-- Add description column to tasks table for detailed scope of work specifications
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Add comment explaining the column
COMMENT ON COLUMN public.tasks.description IS 'Detailed scope of work description, technical specifications, and deliverables';
