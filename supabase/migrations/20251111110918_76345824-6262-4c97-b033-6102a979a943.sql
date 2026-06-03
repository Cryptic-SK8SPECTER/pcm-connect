-- Add ativo field to projetos table for soft delete
ALTER TABLE projetos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true NOT NULL;