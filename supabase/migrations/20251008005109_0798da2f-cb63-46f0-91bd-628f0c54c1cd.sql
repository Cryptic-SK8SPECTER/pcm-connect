-- Restrict profiles SELECT
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile or privileged"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR 
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Tighten faturas RLS
DROP POLICY IF EXISTS "Authenticated users can view faturas" ON public.faturas;
CREATE POLICY "Project members and privileged can view faturas"
ON public.faturas
FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.projeto_equipas pe
    JOIN public.equipa_membros em ON em.equipa_id = pe.equipa_id
    WHERE pe.projeto_id = faturas.projeto_id
      AND em.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Ensure inserts are by the user with role
DROP POLICY IF EXISTS "Colaboradores can insert faturas" ON public.faturas;
CREATE POLICY "Members with role can insert own faturas"
ON public.faturas
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'colaborador'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND created_by = auth.uid()
);

-- Tighten recibos RLS
DROP POLICY IF EXISTS "Authenticated users can view recibos" ON public.recibos;
CREATE POLICY "Project members and privileged can view recibos"
ON public.recibos
FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.faturas f
    JOIN public.projeto_equipas pe ON pe.projeto_id = f.projeto_id
    JOIN public.equipa_membros em ON em.equipa_id = pe.equipa_id
    WHERE f.id = recibos.fatura_id
      AND em.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

NOTIFY pgrst, 'reload schema';