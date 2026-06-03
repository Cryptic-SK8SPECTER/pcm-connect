-- Remove a constraint antiga se existir
ALTER TABLE atividade_confirmacoes DROP CONSTRAINT IF EXISTS atividade_confirmacoes_status_check;

-- Adiciona a nova constraint permitindo os 3 status
ALTER TABLE atividade_confirmacoes 
ADD CONSTRAINT atividade_confirmacoes_status_check 
CHECK (status IN ('pendente', 'aprovado', 'rejeitado'));