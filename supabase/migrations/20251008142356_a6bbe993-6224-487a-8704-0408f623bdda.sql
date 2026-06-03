-- Add color field to projetos table
ALTER TABLE public.projetos 
ADD COLUMN cor text DEFAULT '#3B82F6';

-- Add color field to atividades table
ALTER TABLE public.atividades 
ADD COLUMN cor text DEFAULT '#10B981';