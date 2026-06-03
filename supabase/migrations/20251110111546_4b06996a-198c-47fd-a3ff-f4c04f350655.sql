-- Criar tabela de taxas de câmbio
CREATE TABLE public.exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_code VARCHAR(3) NOT NULL UNIQUE,
  currency_name TEXT NOT NULL,
  rate_to_mzn DECIMAL(18, 6) NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Políticas: todos podem ver, apenas admins podem modificar
CREATE POLICY "Qualquer um pode ver taxas de câmbio"
ON public.exchange_rates
FOR SELECT
USING (true);

CREATE POLICY "Apenas administradores podem inserir taxas"
ON public.exchange_rates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.nome = 'Administrador'
  )
);

CREATE POLICY "Apenas administradores podem atualizar taxas"
ON public.exchange_rates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.nome = 'Administrador'
  )
);

CREATE POLICY "Apenas administradores podem deletar taxas"
ON public.exchange_rates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.nome = 'Administrador'
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_exchange_rates_updated_at
BEFORE UPDATE ON public.exchange_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir taxas padrão (1 moeda estrangeira = X MZN)
INSERT INTO public.exchange_rates (currency_code, currency_name, rate_to_mzn) VALUES
('USD', 'Dólar Americano', 63.50),
('EUR', 'Euro', 69.20),
('ZAR', 'Rand Sul-Africano', 3.45),
('GBP', 'Libra Esterlina', 80.50);