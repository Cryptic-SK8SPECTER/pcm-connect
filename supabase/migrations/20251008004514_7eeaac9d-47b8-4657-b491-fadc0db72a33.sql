-- Criar tabela de faturas
CREATE TABLE public.faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  projeto_id uuid REFERENCES public.projetos(id) ON DELETE CASCADE NOT NULL,
  atividade_id uuid REFERENCES public.atividades(id) ON DELETE CASCADE NOT NULL,
  descricao text,
  valor numeric NOT NULL,
  arquivo_url text NOT NULL,
  arquivo_nome text NOT NULL,
  data_emissao date NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'fora_orcamento')),
  motivo_rejeicao text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Criar tabela de recibos
CREATE TABLE public.recibos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id uuid REFERENCES public.faturas(id) ON DELETE CASCADE NOT NULL,
  arquivo_url text NOT NULL,
  arquivo_nome text NOT NULL,
  valor numeric NOT NULL,
  comentario text,
  justificacao_diferenca text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibos ENABLE ROW LEVEL SECURITY;

-- Políticas para faturas
CREATE POLICY "Authenticated users can view faturas"
  ON public.faturas FOR SELECT
  USING (true);

CREATE POLICY "Colaboradores can insert faturas"
  ON public.faturas FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'colaborador'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Gestores and admins can update faturas"
  ON public.faturas FOR UPDATE
  USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete faturas"
  ON public.faturas FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para recibos
CREATE POLICY "Authenticated users can view recibos"
  ON public.recibos FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert recibos"
  ON public.recibos FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own recibos"
  ON public.recibos FOR DELETE
  USING (
    auth.uid() = created_by OR 
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Criar bucket de storage para faturas e recibos
INSERT INTO storage.buckets (id, name, public)
VALUES ('faturas', 'faturas', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para faturas
CREATE POLICY "Authenticated users can upload faturas"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'faturas' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view faturas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'faturas');

-- Trigger para updated_at
CREATE TRIGGER update_faturas_updated_at
  BEFORE UPDATE ON public.faturas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();