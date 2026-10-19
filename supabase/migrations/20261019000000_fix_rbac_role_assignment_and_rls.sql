-- Migration: Fix RBAC Role Assignment, RLS for Super Admin, and Instant Propagation
-- Date: 2026-10-19

-- 0. Fix protect_last_super_admin() so DELETE operations actually execute
-- In Postgres, a BEFORE DELETE trigger returning NEW (which is NULL on delete) silently cancels the DELETE!
CREATE OR REPLACE FUNCTION public.protect_last_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  super_admin_count INT;
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.role::text = 'super_admin') OR
     (TG_OP = 'UPDATE' AND OLD.role::text = 'super_admin' AND NEW.role::text != 'super_admin') THEN
    SELECT COUNT(*) INTO super_admin_count FROM public.user_roles WHERE role::text = 'super_admin';
    IF super_admin_count <= 1 THEN
      RAISE EXCEPTION 'Action rejected: Cannot delete or demote the last remaining Super Admin account.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 1. Deduplicate any existing duplicate roles in public.user_roles, keeping the highest privileged role
WITH ranked_roles AS (
  SELECT id, user_id, role,
         ROW_NUMBER() OVER (
           PARTITION BY user_id 
           ORDER BY CASE role::text 
             WHEN 'super_admin' THEN 1 
             WHEN 'admin' THEN 2 
             WHEN 'pm' THEN 3 
             ELSE 4 
           END
         ) as rn
  FROM public.user_roles
)
DELETE FROM public.user_roles
WHERE id IN (SELECT id FROM ranked_roles WHERE rn > 1);

-- 2. Drop legacy compound constraint and ensure each user has a unique active role in user_roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
DROP INDEX IF EXISTS public.user_roles_user_id_role_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique_user ON public.user_roles(user_id);

-- 3. Re-enable ROW LEVEL SECURITY with comprehensive Super Admin & Admin policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and Super Admins read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and Super Admins insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and Super Admins update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and Super Admins delete roles" ON public.user_roles;

-- Authenticated users can read their own role
CREATE POLICY "Users read own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Both Super Admin and Admin can read all user roles
CREATE POLICY "Admins and Super Admins read all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- Both Super Admin and Admin can insert roles
CREATE POLICY "Admins and Super Admins insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Both Super Admin and Admin can update roles
CREATE POLICY "Admins and Super Admins update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- Both Super Admin and Admin can delete roles
CREATE POLICY "Admins and Super Admins delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- 4. Overhaul handle_new_user() trigger to respect assigned roles from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_system_owner BOOLEAN;
  meta_role TEXT;
  assigned_role app_role;
  initial_tier TEXT;
  full_name_val TEXT;
BEGIN
  is_system_owner := LOWER(NEW.email) = 'support@fabulouzz.com';

  -- Read role passed in app_metadata or user_metadata
  meta_role := COALESCE(
    NULLIF(NEW.raw_app_meta_data->>'role', ''),
    NULLIF(NEW.raw_user_meta_data->>'role', '')
  );

  IF is_system_owner THEN
    assigned_role := 'super_admin'::app_role;
    initial_tier := 'enterprise';
    full_name_val := 'Fabulouzz Support (System Owner)';
  ELSIF meta_role IN ('super_admin', 'admin', 'pm', 'client') THEN
    assigned_role := meta_role::app_role;
    initial_tier := CASE 
      WHEN meta_role IN ('super_admin', 'admin') THEN 'enterprise'
      ELSE COALESCE(NULLIF(NEW.raw_user_meta_data->>'subscription_tier', ''), 'free')
    END;
    full_name_val := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), '');
  ELSE
    assigned_role := 'client'::app_role;
    initial_tier := COALESCE(NULLIF(NEW.raw_user_meta_data->>'subscription_tier', ''), 'free');
    full_name_val := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), '');
  END IF;

  -- 1. Create or update profile
  INSERT INTO public.profiles (id, email, full_name, status, subscription_tier)
  VALUES (
    NEW.id,
    NEW.email,
    full_name_val,
    'active',
    initial_tier
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    status = 'active',
    subscription_tier = CASE 
      WHEN is_system_owner OR EXCLUDED.subscription_tier = 'enterprise' THEN 'enterprise' 
      ELSE COALESCE(profiles.subscription_tier, EXCLUDED.subscription_tier) 
    END;

  -- 2. Clear any lingering roles and insert the assigned role
  DELETE FROM public.user_roles WHERE user_id = NEW.id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

  RETURN NEW;
END;
$$;

-- 5. Add user_roles to realtime publication for instant propagation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
  END IF;
END $$;
