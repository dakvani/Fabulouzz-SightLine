
-- Create project_members table for multi-project access control
CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is a member of a project
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id
  )
$$;

-- RLS policies for project_members
CREATE POLICY "Admin can manage project members" ON public.project_members
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "PM can manage project members" ON public.project_members
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'pm'))
WITH CHECK (public.has_role(auth.uid(), 'pm'));

CREATE POLICY "Users can see own memberships" ON public.project_members
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Enable realtime for project_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
