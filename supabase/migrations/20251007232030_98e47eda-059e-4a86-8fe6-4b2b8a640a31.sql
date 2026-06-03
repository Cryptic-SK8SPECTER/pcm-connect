-- Allow colaboradores to insert projetos as well
DROP POLICY IF EXISTS "Gestores and admins can insert projetos" ON public.projetos;
CREATE POLICY "Authenticated users with role can insert projetos" 
ON public.projetos
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'colaborador') OR 
  public.has_role(auth.uid(), 'gestor') OR 
  public.has_role(auth.uid(), 'admin')
);
