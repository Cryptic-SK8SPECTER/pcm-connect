-- Desabilita RLS completamente para a tabela analises_documentos
ALTER TABLE public.analises_documentos DISABLE ROW LEVEL SECURITY;

-- Remove todas as políticas existentes
DROP POLICY IF EXISTS "Allow all inserts to analises_documentos" ON public.analises_documentos;
DROP POLICY IF EXISTS "Authenticated users can view analises_documentos" ON public.analises_documentos;
DROP POLICY IF EXISTS "Gestores and admins can update analises_documentos" ON public.analises_documentos;