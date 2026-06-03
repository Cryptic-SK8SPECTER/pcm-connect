-- Drop existing insert policy
DROP POLICY IF EXISTS "Members with role can insert own faturas" ON public.faturas;

-- Create new simplified insert policy
CREATE POLICY "Users can insert their own invoices" 
ON public.faturas
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);