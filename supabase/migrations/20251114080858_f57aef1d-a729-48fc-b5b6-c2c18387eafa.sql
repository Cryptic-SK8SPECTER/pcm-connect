-- Adicionar colunas de coordenadas à tabela projetos
ALTER TABLE public.projetos
ADD COLUMN latitude numeric,
ADD COLUMN longitude numeric;

-- Adicionar comentários nas colunas para documentação
COMMENT ON COLUMN public.projetos.latitude IS 'Latitude da localização do projeto';
COMMENT ON COLUMN public.projetos.longitude IS 'Longitude da localização do projeto';