-- Fix orphan created_by values before adding FKs
UPDATE public.atividade_comentarios c
SET created_by = NULL
WHERE created_by IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = c.created_by
);

UPDATE public.atividade_anexos a
SET created_by = NULL
WHERE created_by IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = a.created_by
);

-- Add missing foreign keys for created_by -> profiles.id with exact names used in code
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'atividade_comentarios_created_by_fkey'
  ) THEN
    ALTER TABLE public.atividade_comentarios
    ADD CONSTRAINT atividade_comentarios_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'atividade_anexos_created_by_fkey'
  ) THEN
    ALTER TABLE public.atividade_anexos
    ADD CONSTRAINT atividade_anexos_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- (Subactivities already working, but ensure consistency)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subatividade_comentarios_created_by_fkey'
  ) THEN
    ALTER TABLE public.subatividade_comentarios
    ADD CONSTRAINT subatividade_comentarios_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subatividade_anexos_created_by_fkey'
  ) THEN
    ALTER TABLE public.subatividade_anexos
    ADD CONSTRAINT subatividade_anexos_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';