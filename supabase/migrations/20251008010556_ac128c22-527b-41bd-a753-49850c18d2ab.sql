-- Tornar atividade opcional nas faturas
ALTER TABLE public.faturas
ALTER COLUMN atividade_id DROP NOT NULL;

-- Opcional: criar índice para filtragem por atividade (mesmo sendo opcional)
-- CREATE INDEX IF NOT EXISTS idx_faturas_atividade_id ON public.faturas(atividade_id);
