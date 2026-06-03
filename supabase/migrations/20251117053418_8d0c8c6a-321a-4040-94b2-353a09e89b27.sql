-- Adicionar campos de aprovação na tabela de confirmações
ALTER TABLE public.atividade_confirmacoes
ADD COLUMN status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
ADD COLUMN aprovado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN aprovado_em TIMESTAMP WITH TIME ZONE,
ADD COLUMN motivo_rejeicao TEXT;

-- Criar tabela de notificações
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('confirmacao_atividade', 'aprovacao', 'rejeicao', 'geral')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  link TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notificações
CREATE POLICY "Users can view their own notifications"
  ON public.notificacoes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notificacoes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notificacoes
  FOR INSERT
  WITH CHECK (true);

-- Atualizar políticas de confirmações para gestores
CREATE POLICY "Gestores and admins can update confirmations"
  ON public.atividade_confirmacoes
  FOR UPDATE
  USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

-- Índices para performance
CREATE INDEX idx_notificacoes_user_lida ON public.notificacoes(user_id, lida);
CREATE INDEX idx_atividade_confirmacoes_status ON public.atividade_confirmacoes(status);

COMMENT ON COLUMN public.atividade_confirmacoes.status IS 'Status da confirmação: pendente, aprovada ou rejeitada';
COMMENT ON TABLE public.notificacoes IS 'Notificações do sistema para os usuários';