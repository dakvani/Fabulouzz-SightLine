
-- 1. Company branding table
CREATE TABLE public.company_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT '',
  logo_url text DEFAULT NULL,
  accent_color text DEFAULT '#4f46e5',
  tagline text DEFAULT '',
  website_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own branding"
  ON public.company_branding FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can read all branding"
  ON public.company_branding FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own branding"
  ON public.company_branding FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own branding"
  ON public.company_branding FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own branding"
  ON public.company_branding FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_company_branding_updated_at
  BEFORE UPDATE ON public.company_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Add subscription tier to profiles
ALTER TABLE public.profiles ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free';

-- 3. Company logos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true);

CREATE POLICY "Public can view company logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can upload own logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can update own logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can delete own logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
