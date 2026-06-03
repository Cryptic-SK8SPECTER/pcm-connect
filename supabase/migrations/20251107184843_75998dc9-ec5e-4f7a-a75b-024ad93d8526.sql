-- Adicionar campo moeda na tabela projetos
ALTER TABLE projetos 
ADD COLUMN moeda TEXT NOT NULL DEFAULT 'MZN';