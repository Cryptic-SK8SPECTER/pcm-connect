-- Criar bucket de storage para documentos de projetos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('projeto-documentos', 'projeto-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Criar tabela de anexos de projetos
CREATE TABLE public.projeto_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho BIGINT,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.projeto_anexos ENABLE ROW LEVEL SECURITY;

-- Políticas: todos podem ver, apenas membros do projeto podem inserir
CREATE POLICY "Authenticated users can view projeto_anexos"
ON public.projeto_anexos
FOR SELECT
USING (true);

CREATE POLICY "Project members can insert projeto_anexos"
ON public.projeto_anexos
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  (
    has_role(auth.uid(), 'colaborador'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Project creators and privileged can delete projeto_anexos"
ON public.projeto_anexos
FOR DELETE
USING (
  auth.uid() = created_by OR 
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Políticas de storage para o bucket
CREATE POLICY "Authenticated users can view projeto documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'projeto-documentos');

CREATE POLICY "Authenticated users can upload projeto documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'projeto-documentos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own projeto documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'projeto-documentos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);