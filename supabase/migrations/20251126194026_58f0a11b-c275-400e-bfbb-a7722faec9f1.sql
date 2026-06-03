-- Adicionar campo status à tabela subatividades
ALTER TABLE public.subatividades 
ADD COLUMN status text NOT NULL DEFAULT 'pendente';

-- Criar índice para melhor performance nas consultas por status
CREATE INDEX idx_subatividades_status ON public.subatividades(status);

-- Atualizar subatividades existentes que estão concluídas
UPDATE public.subatividades 
SET status = 'concluida' 
WHERE concluida = true;

-- Adicionar comentário descrevendo os status possíveis
COMMENT ON COLUMN public.subatividades.status IS 'Status da subatividade: pendente, em_andamento, aguardando_aprovacao, concluida, rejeitada';