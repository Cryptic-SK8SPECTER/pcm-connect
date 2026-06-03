-- Criar tabela para preferências do sistema
CREATE TABLE IF NOT EXISTS public.system_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idioma TEXT NOT NULL DEFAULT 'pt',
  moeda TEXT NOT NULL DEFAULT 'MZN',
  notificacoes_email BOOLEAN DEFAULT true,
  notificacoes_sistema BOOLEAN DEFAULT true,
  notificacoes_sms BOOLEAN DEFAULT false,
  two_factor_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.system_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for system_preferences
CREATE POLICY "Users can view own preferences"
  ON public.system_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.system_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.system_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Criar tabela para roles (permissões detalhadas)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  permissoes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Policies for roles
CREATE POLICY "Everyone can view roles"
  ON public.roles FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage roles"
  ON public.roles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar campo role_id na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Inserir roles padrão
INSERT INTO public.roles (nome, descricao, permissoes) VALUES
  ('Administrador', 'Acesso total ao sistema', '["admin", "manage_users", "manage_projects", "manage_finances"]'::jsonb),
  ('Gestor', 'Gestão de projetos e equipes', '["manage_projects", "manage_team", "view_finances"]'::jsonb),
  ('Colaborador', 'Acesso básico', '["view_projects", "create_activities"]'::jsonb)
ON CONFLICT (nome) DO NOTHING;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_preferences()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_preferences_updated_at
  BEFORE UPDATE ON public.system_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_preferences();

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();