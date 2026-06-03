-- Criar bucket para faturas
INSERT INTO storage.buckets (id, name, public)
VALUES ('faturas', 'faturas', true)
ON CONFLICT (id) DO NOTHING;

-- Adicionar coluna fatura_url na tabela atividades
ALTER TABLE public.atividades 
ADD COLUMN IF NOT EXISTS fatura_url TEXT;

-- Criar políticas de storage para o bucket faturas
CREATE POLICY "Usuários podem ver faturas"
ON storage.objects FOR SELECT
USING (bucket_id = 'faturas');

CREATE POLICY "Usuários autenticados podem fazer upload de faturas"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'faturas' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários autenticados podem atualizar suas faturas"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'faturas' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Usuários autenticados podem deletar suas faturas"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'faturas' 
  AND auth.role() = 'authenticated'
);