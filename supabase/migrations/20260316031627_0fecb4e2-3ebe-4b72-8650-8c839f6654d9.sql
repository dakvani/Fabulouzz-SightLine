CREATE POLICY "Admin can delete notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));