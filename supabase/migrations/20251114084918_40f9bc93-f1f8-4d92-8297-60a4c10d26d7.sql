-- Adicionar coluna de função/cargo aos membros da equipa
ALTER TABLE public.equipa_membros
ADD COLUMN funcao TEXT;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.equipa_membros.funcao IS 'Função ou cargo do membro na equipa (ex: Coordenador, Técnico, etc.)';