-- Add optional fields to subatividades for prazo and progresso manual
ALTER TABLE public.subatividades 
  ADD COLUMN IF NOT EXISTS data_prevista date,
  ADD COLUMN IF NOT EXISTS progresso_manual integer;

-- Ensure progress is within bounds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subatividades_progresso_manual_check'
  ) THEN
    ALTER TABLE public.subatividades
      ADD CONSTRAINT subatividades_progresso_manual_check CHECK (progresso_manual IS NULL OR (progresso_manual >= 0 AND progresso_manual <= 100));
  END IF;
END$$;

-- Make buckets public for direct file access links
UPDATE storage.buckets SET public = true WHERE id IN ('atividade-anexos', 'subatividade-anexos');