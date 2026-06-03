-- Adicionar campo ativo na tabela exchange_rates
ALTER TABLE public.exchange_rates
ADD COLUMN ativo boolean NOT NULL DEFAULT true;

-- Criar índice para melhorar performance de queries com filtro ativo
CREATE INDEX idx_exchange_rates_ativo ON public.exchange_rates(ativo);