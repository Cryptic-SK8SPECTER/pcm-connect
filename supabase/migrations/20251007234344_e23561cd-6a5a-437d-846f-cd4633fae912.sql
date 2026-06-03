-- Criar tabela para anexos de atividades
CREATE TABLE public.atividade_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atividade_id UUID NOT NULL,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela para comentários de atividades
CREATE TABLE public.atividade_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atividade_id UUID NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para anexos de subatividades
CREATE TABLE public.subatividade_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subatividade_id UUID NOT NULL,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela para comentários de subatividades
CREATE TABLE public.subatividade_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subatividade_id UUID NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna de progresso manual nas atividades
ALTER TABLE public.atividades 
ADD COLUMN progresso_manual INTEGER DEFAULT NULL CHECK (progresso_manual >= 0 AND progresso_manual <= 100);

-- Enable RLS
ALTER TABLE public.atividade_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividade_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subatividade_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subatividade_comentarios ENABLE ROW LEVEL SECURITY;

-- Políticas para anexos de atividades
CREATE POLICY "Authenticated users can view atividade_anexos"
ON public.atividade_anexos FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert atividade_anexos"
ON public.atividade_anexos FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own atividade_anexos"
ON public.atividade_anexos FOR DELETE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Políticas para comentários de atividades
CREATE POLICY "Authenticated users can view atividade_comentarios"
ON public.atividade_comentarios FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert atividade_comentarios"
ON public.atividade_comentarios FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own atividade_comentarios"
ON public.atividade_comentarios FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own atividade_comentarios"
ON public.atividade_comentarios FOR DELETE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Políticas para anexos de subatividades
CREATE POLICY "Authenticated users can view subatividade_anexos"
ON public.subatividade_anexos FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert subatividade_anexos"
ON public.subatividade_anexos FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own subatividade_anexos"
ON public.subatividade_anexos FOR DELETE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Políticas para comentários de subatividades
CREATE POLICY "Authenticated users can view subatividade_comentarios"
ON public.subatividade_comentarios FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert subatividade_comentarios"
ON public.subatividade_comentarios FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own subatividade_comentarios"
ON public.subatividade_comentarios FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own subatividade_comentarios"
ON public.subatividade_comentarios FOR DELETE
USING (auth.uid() = created_by OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at em comentários
CREATE TRIGGER update_atividade_comentarios_updated_at
BEFORE UPDATE ON public.atividade_comentarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subatividade_comentarios_updated_at
BEFORE UPDATE ON public.subatividade_comentarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket de storage para anexos (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('atividade-anexos', 'atividade-anexos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Authenticated users can upload anexos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'atividade-anexos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view anexos"
ON storage.objects FOR SELECT
USING (bucket_id = 'atividade-anexos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own anexos"
ON storage.objects FOR DELETE
USING (bucket_id = 'atividade-anexos' AND auth.uid()::text = (storage.foldername(name))[1]);