-- Migration: Assign support@fabulouzz.com as permanent Super Admin (System Owner)
-- Date: 2026-10-18

-- 1. Ensure handle_new_user automatically assigns super_admin to support@fabulouzz.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_system_owner BOOLEAN;
BEGIN
  is_system_owner := LOWER(NEW.email) = 'support@fabulouzz.com';

  INSERT INTO public.profiles (id, email, full_name, status, subscription_tier)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN is_system_owner THEN 'Fabulouzz Support (System Owner)' ELSE COALESCE(NEW.raw_user_meta_data->>'full_name', '') END,
    'active',
    CASE WHEN is_system_owner THEN 'enterprise' ELSE 'free' END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    status = 'active',
    subscription_tier = CASE WHEN is_system_owner THEN 'enterprise' ELSE profiles.subscription_tier END;

  -- Default role assignment: super_admin for support@fabulouzz.com, client for general signups
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN is_system_owner THEN 'super_admin'::app_role ELSE 'client'::app_role END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Update is_super_admin security definer function to explicitly recognize support@fabulouzz.com
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_user_active(_user_id) AND (
    public.has_role(_user_id, 'super_admin') OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = _user_id AND LOWER(email) = 'support@fabulouzz.com'
    ) OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = _user_id AND LOWER(email) = 'support@fabulouzz.com'
    )
  );
$$;

-- 3. Execute elevation for support@fabulouzz.com if already present in auth.users
DO $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE LOWER(email) = 'support@fabulouzz.com' LIMIT 1;
  
  IF v_uid IS NOT NULL THEN
    -- Ensure profile
    INSERT INTO public.profiles (id, email, full_name, status, subscription_tier)
    VALUES (v_uid, 'support@fabulouzz.com', 'Fabulouzz Support (System Owner)', 'active', 'enterprise')
    ON CONFLICT (id) DO UPDATE SET 
      status = 'active', 
      subscription_tier = 'enterprise',
      full_name = 'Fabulouzz Support (System Owner)';

    -- Assign super_admin role
    DELETE FROM public.user_roles WHERE user_id = v_uid AND role::text != 'super_admin';
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'super_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Record in audit logs
    INSERT INTO public.audit_logs (actor_id, actor_email, actor_role, action, resource_type, resource_id, details)
    VALUES (
      v_uid, 
      'support@fabulouzz.com', 
      'super_admin', 
      'system.owner_elevated', 
      'user_roles', 
      v_uid::text, 
      '{"message": "support@fabulouzz.com designated as Tier 1 Super Admin (System Owner)"}'::jsonb
    );
  END IF;
END $$;
