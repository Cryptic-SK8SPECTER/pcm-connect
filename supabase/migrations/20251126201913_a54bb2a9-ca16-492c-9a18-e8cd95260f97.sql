-- Criar função para verificar role pela tabela roles
CREATE OR REPLACE FUNCTION public.has_role_by_name(_user_id uuid, _role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = _user_id
      AND r.nome = _role_name
  )
$$;

-- Atualizar política de visualização de confirmações
DROP POLICY IF EXISTS "Gestores e admins podem ver todas confirmações" ON subatividade_confirmacoes;
CREATE POLICY "Gestores e admins podem ver todas confirmações"
ON subatividade_confirmacoes
FOR SELECT
USING (
  has_role_by_name(auth.uid(), 'Gestor') OR 
  has_role_by_name(auth.uid(), 'Administrador')
);

-- Atualizar política de atualização de confirmações
DROP POLICY IF EXISTS "Gestores e admins podem atualizar confirmações" ON subatividade_confirmacoes;
CREATE POLICY "Gestores e admins podem atualizar confirmações"
ON subatividade_confirmacoes
FOR UPDATE
USING (
  has_role_by_name(auth.uid(), 'Gestor') OR 
  has_role_by_name(auth.uid(), 'Administrador')
);

-- Atualizar função is_admin_or_gestor para usar a tabela roles
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
      AND r.nome IN ('Administrador', 'Gestor')
  )
$$;