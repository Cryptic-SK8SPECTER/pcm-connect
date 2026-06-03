-- Adicionar campo de desempenho na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN desempenho TEXT DEFAULT 'bom' CHECK (desempenho IN ('muito_bom', 'bom', 'regular', 'mau'));

-- Criar tabela para confirmações de atividades
CREATE TABLE public.atividade_confirmacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(atividade_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.atividade_confirmacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para atividade_confirmacoes
CREATE POLICY "Users can view their own confirmations"
  ON public.atividade_confirmacoes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own confirmations"
  ON public.atividade_confirmacoes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gestores and admins can view all confirmations"
  ON public.atividade_confirmacoes
  FOR SELECT
  USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

COMMENT ON COLUMN public.profiles.desempenho IS 'Avaliação de desempenho do usuário';
COMMENT ON TABLE public.atividade_confirmacoes IS 'Tabela para registrar confirmações de atividades pelos usuários';