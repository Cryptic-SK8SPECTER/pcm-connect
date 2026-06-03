-- Criar tabela para confirmações de subatividades
CREATE TABLE IF NOT EXISTS public.subatividade_confirmacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subatividade_id UUID NOT NULL REFERENCES public.subatividades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  confirmado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  aprovado_por UUID,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  observacao TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  motivo_rejeicao TEXT
);

-- Habilitar RLS
ALTER TABLE public.subatividade_confirmacoes ENABLE ROW LEVEL SECURITY;

-- Política: Responsável da subatividade pode inserir confirmação (submeter)
CREATE POLICY "Responsável pode criar confirmação de subatividade"
ON public.subatividade_confirmacoes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.subatividades
    WHERE id = subatividade_confirmacoes.subatividade_id
    AND responsavel_id = auth.uid()
  )
);

-- Política: Responsável da subatividade pode ver suas próprias confirmações
CREATE POLICY "Responsável pode ver suas confirmações"
ON public.subatividade_confirmacoes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política: Responsável da atividade principal pode ver e gerenciar confirmações das subatividades
CREATE POLICY "Responsável da atividade pode ver confirmações"
ON public.subatividade_confirmacoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.subatividades s
    INNER JOIN public.atividades a ON s.atividade_id = a.id
    WHERE s.id = subatividade_confirmacoes.subatividade_id
    AND a.responsavel_id = auth.uid()
  )
);

-- Política: Responsável da atividade principal pode aprovar/rejeitar
CREATE POLICY "Responsável da atividade pode atualizar confirmações"
ON public.subatividade_confirmacoes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.subatividades s
    INNER JOIN public.atividades a ON s.atividade_id = a.id
    WHERE s.id = subatividade_confirmacoes.subatividade_id
    AND a.responsavel_id = auth.uid()
  )
);

-- Política: Gestores e admins podem ver todas as confirmações
CREATE POLICY "Gestores e admins podem ver todas confirmações"
ON public.subatividade_confirmacoes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Política: Gestores e admins podem atualizar todas as confirmações
CREATE POLICY "Gestores e admins podem atualizar confirmações"
ON public.subatividade_confirmacoes
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);