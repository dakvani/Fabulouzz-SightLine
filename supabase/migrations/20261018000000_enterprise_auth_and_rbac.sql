-- Migration: 20261018000000_enterprise_auth_and_rbac.sql
-- Description: Enterprise User Authentication, Role-Based Access Control & Project-Level Permissions

-- 1. Add 'super_admin' to app_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'app_role' AND e.enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END $$;

-- 2. Ensure profiles table has status column for deactivation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 3. Enhance project_members for multi-project role-based assignments
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS assigned_role text NOT NULL DEFAULT 'client';
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS assigned_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS revoked_at timestamptz DEFAULT NULL;
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS assignment_status text NOT NULL DEFAULT 'active';

-- Add check constraint if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_project_member_status'
  ) THEN
    ALTER TABLE public.project_members 
    ADD CONSTRAINT check_project_member_status 
    CHECK (assignment_status IN ('active', 'revoked'));
  END IF;
END $$;

-- 4. Create Audit Logs table for security and operational compliance
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Helper Functions (SECURITY DEFINER for secure access checks)

-- Check role function update to support super_admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$$;

-- Check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status = 'active' FROM public.profiles WHERE id = _user_id),
    true
  )
$$;

-- Check if user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_user_active(_user_id) AND public.has_role(_user_id, 'super_admin')
$$;

-- Check if user is Admin or Super Admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_user_active(_user_id) AND (
    public.has_role(_user_id, 'super_admin') OR 
    public.has_role(_user_id, 'admin')
  )
$$;

-- Check if user has access to a project
CREATE OR REPLACE FUNCTION public.has_project_access(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_user_active(_user_id) AND (
    -- Super Admin & Admin can access all projects
    public.is_admin_or_super(_user_id) OR
    -- Project Manager & Client have explicit active project membership
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = _project_id 
        AND user_id = _user_id 
        AND assignment_status = 'active'
        AND revoked_at IS NULL
    )
  )
$$;

-- Check if user can manage tasks/timeline in a project (Super Admin, Admin, or assigned Project Manager)
CREATE OR REPLACE FUNCTION public.can_manage_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_user_active(_user_id) AND (
    public.is_admin_or_super(_user_id) OR
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.user_roles ur ON ur.user_id = pm.user_id
      WHERE pm.project_id = _project_id 
        AND pm.user_id = _user_id 
        AND pm.assignment_status = 'active'
        AND pm.revoked_at IS NULL
        AND (pm.assigned_role = 'pm' OR ur.role::text = 'pm')
    )
  )
$$;

-- Prevent accidental deletion or demotion of the last Super Admin
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_super_admin ON public.user_roles;
CREATE TRIGGER trg_protect_last_super_admin
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_last_super_admin();

-- 6. Clean and re-apply strict RLS Policies

-- Drop all existing open policies on projects
DROP POLICY IF EXISTS "Public can read projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated read projects" ON public.projects;
DROP POLICY IF EXISTS "PM creates projects" ON public.projects;
DROP POLICY IF EXISTS "PM updates projects" ON public.projects;
DROP POLICY IF EXISTS "PM deletes projects" ON public.projects;
DROP POLICY IF EXISTS "Admin creates projects" ON public.projects;
DROP POLICY IF EXISTS "Admin updates projects" ON public.projects;
DROP POLICY IF EXISTS "Admin deletes projects" ON public.projects;
DROP POLICY IF EXISTS "Authorized users view projects" ON public.projects;
DROP POLICY IF EXISTS "Admins create projects" ON public.projects;
DROP POLICY IF EXISTS "Admins update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins delete projects" ON public.projects;

-- Strict Project RLS
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

-- Drop all existing open policies on tasks
DROP POLICY IF EXISTS "Public can read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated read tasks" ON public.tasks;
DROP POLICY IF EXISTS "PM creates tasks" ON public.tasks;
DROP POLICY IF EXISTS "PM or Engineer updates tasks" ON public.tasks;
DROP POLICY IF EXISTS "PM deletes tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin creates tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin updates tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin deletes tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authorized users view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authorized managers create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authorized managers update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authorized managers delete tasks" ON public.tasks;

-- Strict Task RLS (Client has strictly read-only access)
CREATE POLICY "Authorized users view tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Authorized managers create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "Authorized managers update tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "Authorized managers delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id));

-- Strict Project Members RLS
DROP POLICY IF EXISTS "Admin can manage project members" ON public.project_members;
DROP POLICY IF EXISTS "PM can manage project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can see own memberships" ON public.project_members;

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

-- Strict Audit Logs RLS
CREATE POLICY "Super Admin views all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admin views operational audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()) AND resource_type != 'security');

CREATE POLICY "Authenticated users log actions"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- 7. Add audit_logs to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  END IF;
END $$;
