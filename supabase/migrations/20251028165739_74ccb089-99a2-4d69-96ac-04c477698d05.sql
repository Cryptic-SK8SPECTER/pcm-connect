-- Add orcamento column to atividades table
ALTER TABLE atividades ADD COLUMN IF NOT EXISTS orcamento numeric DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN atividades.orcamento IS 'Budget allocated for this activity. Sum of all activity budgets should not exceed project budget.';