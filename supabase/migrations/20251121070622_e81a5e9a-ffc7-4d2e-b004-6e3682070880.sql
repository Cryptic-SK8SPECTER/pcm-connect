-- Remove a política de INSERT restritiva existente
DROP POLICY IF EXISTS "System can insert analises_documentos" ON public.analises_documentos;

-- Cria nova política que permite inserções sem restrições (para edge functions e sistema)
CREATE POLICY "Allow all inserts to analises_documentos"
ON public.analises_documentos
FOR INSERT
WITH CHECK (true);

-- Garante que a tabela tem RLS habilitado
ALTER TABLE public.analises_documentos ENABLE ROW LEVEL SECURITY;