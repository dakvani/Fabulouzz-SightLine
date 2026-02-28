-- Enable realtime for tasks and projects tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- Allow admin to update/create/delete projects
CREATE POLICY "Admin updates projects"
ON public.projects FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin creates projects"
ON public.projects FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin deletes projects"
ON public.projects FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to manage tasks
CREATE POLICY "Admin creates tasks"
ON public.tasks FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin updates tasks"
ON public.tasks FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin deletes tasks"
ON public.tasks FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));