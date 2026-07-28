
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recreate all policies that referenced public.has_role to use private.has_role

-- asset_mutations
DROP POLICY IF EXISTS mut_manage ON public.asset_mutations;
CREATE POLICY mut_manage ON public.asset_mutations
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'petugas'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'petugas'));

-- categories
DROP POLICY IF EXISTS categories_manage ON public.categories;
CREATE POLICY categories_manage ON public.categories
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'petugas'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'petugas'));

-- items
DROP POLICY IF EXISTS items_manage ON public.items;
CREATE POLICY items_manage ON public.items
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'petugas'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'petugas'));

-- loans
DROP POLICY IF EXISTS loans_select_scoped ON public.loans;
CREATE POLICY loans_select_scoped ON public.loans
  FOR SELECT TO authenticated
  USING (
    auth.uid() = borrower_id
    OR private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'petugas')
    OR private.has_role(auth.uid(), 'kepala_sekolah')
  );
DROP POLICY IF EXISTS loans_delete_staff ON public.loans;
CREATE POLICY loans_delete_staff ON public.loans
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'petugas'));
DROP POLICY IF EXISTS loans_update_staff ON public.loans;
CREATE POLICY loans_update_staff ON public.loans
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'petugas'));

-- locations
DROP POLICY IF EXISTS locations_manage ON public.locations;
CREATE POLICY locations_manage ON public.locations
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'petugas'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'petugas'));

-- maintenance_records
DROP POLICY IF EXISTS maint_manage ON public.maintenance_records;
CREATE POLICY maint_manage ON public.maintenance_records
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'petugas'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'petugas'));

-- profiles
DROP POLICY IF EXISTS profiles_select_scoped ON public.profiles;
CREATE POLICY profiles_select_scoped ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'petugas')
  );

-- user_roles
DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;
CREATE POLICY user_roles_admin_all ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

-- Drop the public has_role function so it's not callable via the API
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
