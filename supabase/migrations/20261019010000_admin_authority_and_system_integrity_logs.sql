-- Migration: Admin Project Authority & System Integrity Audit Logging
-- Date: 2026-10-19

-- 1. Ensure public.audit_logs table has all operational columns
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS target_resource text;

-- Allow authenticated users to insert audit events safely
DROP POLICY IF EXISTS "Authenticated users log actions" ON public.audit_logs;
CREATE POLICY "Authenticated users log actions"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Enhance is_user_active() to be resilient against null or pending profile statuses
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND status IN ('inactive', 'deactivated')
  )
$$;

-- 3. Infallible is_admin_or_super() check with multi-layer fallback
CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_user_active(_user_id) AND (
    -- 1. Direct role check in user_roles
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role::text IN ('super_admin', 'admin')
    ) OR
    -- 2. Permanent Designated System Owners & Enterprise Admins
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = _user_id AND LOWER(email) IN ('support@fabulouzz.com', 'muhammeddakvani@gmail.com')
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _user_id AND LOWER(email) IN ('support@fabulouzz.com', 'muhammeddakvani@gmail.com')
    ) OR
    -- 3. Fast-path authorization via raw JWT metadata
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = _user_id AND (
        COALESCE(raw_app_meta_data->>'role', raw_user_meta_data->>'role') IN ('super_admin', 'admin')
      )
    )
  )
$$;

-- 4. Re-assert strict & functional RLS on public.projects
DROP POLICY IF EXISTS "Admins create projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and PMs update projects" ON public.projects;
DROP POLICY IF EXISTS "Super Admin and Admin delete projects" ON public.projects;
DROP POLICY IF EXISTS "Authorized users view projects" ON public.projects;

CREATE POLICY "Authorized users view projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.has_project_access(auth.uid(), id));

CREATE POLICY "Admins create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins and PMs update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (public.can_manage_project(auth.uid(), id));

CREATE POLICY "Super Admin and Admin delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- 5. Re-assert strict & functional RLS on public.project_members
DROP POLICY IF EXISTS "Admins view all project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins insert project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins update project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins delete project members" ON public.project_members;

CREATE POLICY "Admins view all project members"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()) OR (user_id = auth.uid() AND assignment_status = 'active'));

CREATE POLICY "Admins insert project members"
  ON public.project_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins update project members"
  ON public.project_members FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins delete project members"
  ON public.project_members FOR DELETE
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- 6. Elevate muhammeddakvani@gmail.com and support@fabulouzz.com to guarantee Admin/Super Admin
DO $$
DECLARE
  v_sup_id UUID;
  v_dak_id UUID;
BEGIN
  -- Elevate support@fabulouzz.com to super_admin
  SELECT id INTO v_sup_id FROM auth.users WHERE LOWER(email) = 'support@fabulouzz.com' LIMIT 1;
  IF v_sup_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, status, subscription_tier)
    VALUES (v_sup_id, 'support@fabulouzz.com', 'Fabulouzz Support (System Owner)', 'active', 'enterprise')
    ON CONFLICT (id) DO UPDATE SET status = 'active', subscription_tier = 'enterprise';

    DELETE FROM public.user_roles WHERE user_id = v_sup_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_sup_id, 'super_admin'::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin'::app_role;
  END IF;

  -- Elevate muhammeddakvani@gmail.com to admin
  SELECT id INTO v_dak_id FROM auth.users WHERE LOWER(email) = 'muhammeddakvani@gmail.com' LIMIT 1;
  IF v_dak_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, status, subscription_tier)
    VALUES (v_dak_id, 'muhammeddakvani@gmail.com', 'Muhammed Dakvan', 'active', 'enterprise')
    ON CONFLICT (id) DO UPDATE SET status = 'active', subscription_tier = 'enterprise';

    DELETE FROM public.user_roles WHERE user_id = v_dak_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_dak_id, 'admin'::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::app_role;
  END IF;
END $$;

-- 7. System Integrity Audit Log Automation Triggers
-- Automatically captures project lifecycle events into public.audit_logs
CREATE OR REPLACE FUNCTION public.trg_audit_project_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_email text;
  v_action text;
  v_res_id text;
  v_details jsonb;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NOT NULL THEN
    SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor_id;
  END IF;
  v_actor_email := COALESCE(v_actor_email, 'system@sightline.io');

  IF TG_OP = 'INSERT' THEN
    v_action := 'PROJECT_CREATED';
    v_res_id := NEW.id::text;
    v_details := jsonb_build_object(
      'title', NEW.title,
      'client_name', NEW.client_name,
      'project_ref', NEW.project_ref,
      'project_manager', NEW.project_manager,
      'created_by', NEW.created_by
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'PROJECT_UPDATED';
    v_res_id := NEW.id::text;
    v_details := jsonb_build_object(
      'title', NEW.title,
      'old_title', OLD.title,
      'client_name', NEW.client_name,
      'project_manager', NEW.project_manager
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'PROJECT_DELETED';
    v_res_id := OLD.id::text;
    v_details := jsonb_build_object(
      'title', OLD.title,
      'client_name', OLD.client_name,
      'project_ref', OLD.project_ref
    );
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_email, action, resource_type, resource_id, target_resource, details)
  VALUES (v_actor_id, v_actor_email, v_action, 'project', v_res_id, 'project:' || v_res_id, v_details);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_projects ON public.projects;
CREATE TRIGGER trg_audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_project_integrity();

-- Automatically captures project membership changes into public.audit_logs
CREATE OR REPLACE FUNCTION public.trg_audit_membership_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_email text;
  v_target_email text;
  v_action text;
  v_details jsonb;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NOT NULL THEN
    SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor_id;
  END IF;
  v_actor_email := COALESCE(v_actor_email, 'system@sightline.io');

  IF TG_OP = 'INSERT' THEN
    SELECT email INTO v_target_email FROM auth.users WHERE id = NEW.user_id;
    v_action := 'MEMBER_ASSIGNED';
    v_details := jsonb_build_object(
      'project_id', NEW.project_id,
      'user_id', NEW.user_id,
      'user_email', v_target_email,
      'assigned_role', NEW.assigned_role
    );
  ELSIF TG_OP = 'DELETE' THEN
    SELECT email INTO v_target_email FROM auth.users WHERE id = OLD.user_id;
    v_action := 'MEMBER_REVOKED';
    v_details := jsonb_build_object(
      'project_id', OLD.project_id,
      'user_id', OLD.user_id,
      'user_email', v_target_email
    );
  END IF;

  IF v_action IS NOT NULL THEN
    INSERT INTO public.audit_logs (actor_id, actor_email, action, resource_type, resource_id, target_resource, details)
    VALUES (
      v_actor_id,
      v_actor_email,
      v_action,
      'project_members',
      COALESCE(NEW.id, OLD.id)::text,
      'project:' || COALESCE(NEW.project_id, OLD.project_id)::text,
      v_details
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_memberships ON public.project_members;
CREATE TRIGGER trg_audit_memberships
  AFTER INSERT OR DELETE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_membership_integrity();
