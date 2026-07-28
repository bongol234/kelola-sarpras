
-- Loans
DROP POLICY IF EXISTS loans_select_auth ON public.loans;
CREATE POLICY loans_select_scoped ON public.loans
  FOR SELECT TO authenticated
  USING (
    auth.uid() = borrower_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'petugas'::app_role)
    OR has_role(auth.uid(), 'kepala_sekolah'::app_role)
  );

-- Profiles
DROP POLICY IF EXISTS profiles_select_auth ON public.profiles;
CREATE POLICY profiles_select_scoped ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'petugas'::app_role)
  );

-- user_roles
DROP POLICY IF EXISTS user_roles_select_auth ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Revoke EXECUTE on has_role from anon/authenticated; keep it usable in RLS via postgres/service_role.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
