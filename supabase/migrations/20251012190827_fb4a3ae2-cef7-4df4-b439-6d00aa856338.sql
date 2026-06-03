-- Criar tabela para membros da equipe do projeto
CREATE TABLE IF NOT EXISTS public.projeto_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(projeto_id, user_id)
);

-- Enable RLS
ALTER TABLE public.projeto_membros ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view projeto_membros"
  ON public.projeto_membros FOR SELECT
  USING (true);

CREATE POLICY "Gestores and admins can manage projeto_membros"
  ON public.projeto_membros FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));