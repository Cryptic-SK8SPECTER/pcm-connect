-- Adicionar coluna responsavel_id na tabela subatividades
ALTER TABLE public.subatividades 
ADD COLUMN responsavel_id uuid REFERENCES auth.users(id);

-- Criar índice para melhor performance
CREATE INDEX idx_subatividades_responsavel ON public.subatividades(responsavel_id);