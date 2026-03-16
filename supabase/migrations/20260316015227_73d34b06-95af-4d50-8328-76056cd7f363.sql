
ALTER TABLE public.email_subscribers 
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Update unique constraint to be per-project
ALTER TABLE public.email_subscribers DROP CONSTRAINT IF EXISTS email_subscribers_email_key;
ALTER TABLE public.email_subscribers ADD CONSTRAINT email_subscribers_email_project_unique UNIQUE (email, project_id);
