
-- Allow admins to update subscriber status
CREATE POLICY "Admin can update subscribers"
ON public.email_subscribers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete subscribers
CREATE POLICY "Admin can delete subscribers"
ON public.email_subscribers
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
