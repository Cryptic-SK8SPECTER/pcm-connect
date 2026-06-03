-- Create function to check if user is admin based on new role structure
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
      AND r.nome IN ('Administrador', 'Gestor')
  )
$$;

-- Drop old policies on roles table
DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
DROP POLICY IF EXISTS "Everyone can view roles" ON public.roles;

-- Create new policies using the new function
CREATE POLICY "Admins and gestores can manage roles"
  ON public.roles FOR ALL
  USING (is_admin_or_gestor());

CREATE POLICY "Everyone can view roles"
  ON public.roles FOR SELECT
  USING (true);

-- Update projeto_membros policies to use new function
DROP POLICY IF EXISTS "Gestores and admins can manage projeto_membros" ON public.projeto_membros;

CREATE POLICY "Gestores and admins can manage projeto_membros"
  ON public.projeto_membros FOR ALL
  USING (is_admin_or_gestor());