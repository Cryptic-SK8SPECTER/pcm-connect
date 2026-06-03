-- Update RLS policy on profiles to allow admins/gestores via either user_roles (has_role) or roles via profile.role_id
ALTER POLICY "Users can view own profile or privileged"
ON public.profiles
USING (
  (auth.uid() = id)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_or_gestor()
);
