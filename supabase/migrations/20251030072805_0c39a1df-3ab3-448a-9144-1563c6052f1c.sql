-- Create itens_fatura table
CREATE TABLE public.itens_fatura (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fatura_id uuid NOT NULL,
  descricao text NOT NULL,
  quantidade numeric NOT NULL,
  valor_unitario numeric NOT NULL,
  valor_total numeric GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT itens_fatura_pkey PRIMARY KEY (id),
  CONSTRAINT itens_fatura_fatura_id_fkey FOREIGN KEY (fatura_id) REFERENCES public.faturas(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.itens_fatura ENABLE ROW LEVEL SECURITY;

-- Create policies similar to faturas table
CREATE POLICY "Project members and privileged can view itens_fatura" 
ON public.itens_fatura 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM faturas f
    WHERE f.id = itens_fatura.fatura_id
      AND (
        f.created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM projeto_equipas pe
          JOIN equipa_membros em ON em.equipa_id = pe.equipa_id
          WHERE pe.projeto_id = f.projeto_id
            AND em.user_id = auth.uid()
        )
        OR has_role(auth.uid(), 'gestor'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE POLICY "Members with role can insert itens_fatura" 
ON public.itens_fatura 
FOR INSERT 
WITH CHECK (
  (has_role(auth.uid(), 'colaborador'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND EXISTS (
    SELECT 1
    FROM faturas f
    WHERE f.id = itens_fatura.fatura_id
      AND f.created_by = auth.uid()
  )
);

CREATE POLICY "Gestores and admins can update itens_fatura" 
ON public.itens_fatura 
FOR UPDATE 
USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestores and admins can delete itens_fatura" 
ON public.itens_fatura 
FOR DELETE 
USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX idx_itens_fatura_fatura_id ON public.itens_fatura(fatura_id);