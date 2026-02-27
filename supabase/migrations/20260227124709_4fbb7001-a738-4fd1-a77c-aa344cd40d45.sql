
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'status_update',
  media_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notifications"
  ON public.notifications FOR SELECT
  USING (true);

CREATE POLICY "PM or Engineer or Admin can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'pm') OR
    public.has_role(auth.uid(), 'engineer') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create storage bucket for task media
INSERT INTO storage.buckets (id, name, public) VALUES ('task-media', 'task-media', true);

CREATE POLICY "Authenticated users can upload task media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-media');

CREATE POLICY "Anyone can view task media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-media');

-- Admin policies for user_roles
CREATE POLICY "Admin can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can read all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
