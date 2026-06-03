-- Tabela de financiamentos
CREATE TABLE public.financiamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_disponivel NUMERIC NOT NULL DEFAULT 0,
  projeto_id UUID REFERENCES public.projetos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Tabela de alocações de financiamento para atividades
CREATE TABLE public.financiamento_atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  financiamento_id UUID NOT NULL REFERENCES public.financiamentos(id) ON DELETE CASCADE,
  atividade_id UUID NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  valor_alocado NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(financiamento_id, atividade_id)
);

-- RLS para financiamentos
ALTER TABLE public.financiamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view financiamentos"
ON public.financiamentos FOR SELECT
USING (true);

CREATE POLICY "Gestores and admins can insert financiamentos"
ON public.financiamentos FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Gestores and admins can update financiamentos"
ON public.financiamentos FOR UPDATE
USING (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete financiamentos"
ON public.financiamentos FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS para financiamento_atividades
ALTER TABLE public.financiamento_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view financiamento_atividades"
ON public.financiamento_atividades FOR SELECT
USING (true);

CREATE POLICY "Gestores and admins can manage financiamento_atividades"
ON public.financiamento_atividades FOR ALL
USING (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_financiamentos_updated_at
BEFORE UPDATE ON public.financiamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();