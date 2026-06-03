-- Allow privileged users to update any profile
CREATE POLICY "Privileged can update profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_or_gestor()
)
WITH CHECK (
  has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_admin_or_gestor()
);
