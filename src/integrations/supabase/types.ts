export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analises_documentos: {
        Row: {
          created_at: string
          created_by: string | null
          dados_extraidos: Json | null
          divergencias: Json | null
          documento_id: string | null
          id: string
          insights: Json | null
          projeto_id: string
          severidade: string | null
          status: string
          tipo_analise: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dados_extraidos?: Json | null
          divergencias?: Json | null
          documento_id?: string | null
          id?: string
          insights?: Json | null
          projeto_id: string
          severidade?: string | null
          status?: string
          tipo_analise: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dados_extraidos?: Json | null
          divergencias?: Json | null
          documento_id?: string | null
          id?: string
          insights?: Json | null
          projeto_id?: string
          severidade?: string | null
          status?: string
          tipo_analise?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analises_documentos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "projeto_anexos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analises_documentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      atividade_anexos: {
        Row: {
          atividade_id: string
          created_at: string
          created_by: string | null
          id: string
          nome_arquivo: string
          tamanho: number | null
          tipo_arquivo: string | null
          url: string
        }
        Insert: {
          atividade_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome_arquivo: string
          tamanho?: number | null
          tipo_arquivo?: string | null
          url: string
        }
        Update: {
          atividade_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome_arquivo?: string
          tamanho?: number | null
          tipo_arquivo?: string | null
          url?: string
        }
        Relationships: []
      }
      atividade_comentarios: {
        Row: {
          atividade_id: string
          comentario: string
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
        }
        Insert: {
          atividade_id: string
          comentario: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          atividade_id?: string
          comentario?: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      atividade_confirmacoes: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          atividade_id: string
          confirmado_em: string | null
          created_at: string | null
          id: string
          motivo_rejeicao: string | null
          observacao: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          atividade_id: string
          confirmado_em?: string | null
          created_at?: string | null
          id?: string
          motivo_rejeicao?: string | null
          observacao?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          atividade_id?: string
          confirmado_em?: string | null
          created_at?: string | null
          id?: string
          motivo_rejeicao?: string | null
          observacao?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividade_confirmacoes_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          cor: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          fatura_url: string | null
          id: string
          nome: string
          orcamento: number | null
          prioridade: string
          progresso_manual: number | null
          projeto_id: string
          responsavel_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          fatura_url?: string | null
          id?: string
          nome: string
          orcamento?: number | null
          prioridade?: string
          progresso_manual?: number | null
          projeto_id: string
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          fatura_url?: string | null
          id?: string
          nome?: string
          orcamento?: number | null
          prioridade?: string
          progresso_manual?: number | null
          projeto_id?: string
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipa_membros: {
        Row: {
          created_at: string
          equipa_id: string
          funcao: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          equipa_id: string
          funcao?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          equipa_id?: string
          funcao?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipa_membros_equipa_id_fkey"
            columns: ["equipa_id"]
            isOneToOne: false
            referencedRelation: "equipas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipa_membros_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          ativo: boolean
          created_at: string
          currency_code: string
          currency_name: string
          id: string
          rate_to_mzn: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          currency_code: string
          currency_name: string
          id?: string
          rate_to_mzn: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          currency_code?: string
          currency_name?: string
          id?: string
          rate_to_mzn?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      faturas: {
        Row: {
          arquivo_nome: string
          arquivo_url: string
          atividade_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string
          descricao: string | null
          id: string
          motivo_rejeicao: string | null
          numero: string
          projeto_id: string
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          atividade_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao: string
          descricao?: string | null
          id?: string
          motivo_rejeicao?: string | null
          numero: string
          projeto_id: string
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          atividade_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          descricao?: string | null
          id?: string
          motivo_rejeicao?: string | null
          numero?: string
          projeto_id?: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturas_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      financiamento_atividades: {
        Row: {
          atividade_id: string
          created_at: string
          created_by: string | null
          financiamento_id: string
          id: string
          valor_alocado: number
        }
        Insert: {
          atividade_id: string
          created_at?: string
          created_by?: string | null
          financiamento_id: string
          id?: string
          valor_alocado?: number
        }
        Update: {
          atividade_id?: string
          created_at?: string
          created_by?: string | null
          financiamento_id?: string
          id?: string
          valor_alocado?: number
        }
        Relationships: [
          {
            foreignKeyName: "financiamento_atividades_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financiamento_atividades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financiamento_atividades_financiamento_id_fkey"
            columns: ["financiamento_id"]
            isOneToOne: false
            referencedRelation: "financiamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      financiamentos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          projeto_id: string | null
          updated_at: string
          valor_disponivel: number
          valor_total: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          projeto_id?: string | null
          updated_at?: string
          valor_disponivel?: number
          valor_total?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          projeto_id?: string | null
          updated_at?: string
          valor_disponivel?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "financiamentos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financiamentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_fatura: {
        Row: {
          created_at: string
          descricao: string
          fatura_id: string
          id: string
          quantidade: number
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          descricao: string
          fatura_id: string
          id?: string
          quantidade: number
          valor_total?: number | null
          valor_unitario: number
        }
        Update: {
          created_at?: string
          descricao?: string
          fatura_id?: string
          id?: string
          quantidade?: number
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_fatura_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string | null
          id: string
          lida: boolean | null
          link: string | null
          mensagem: string
          metadata: Json | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          link?: string | null
          mensagem: string
          metadata?: Json | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          link?: string | null
          mensagem?: string
          metadata?: Json | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          created_at: string
          desempenho: string | null
          email: string
          id: string
          nome: string
          role_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string
          desempenho?: string | null
          email: string
          id: string
          nome: string
          role_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string
          desempenho?: string | null
          email?: string
          id?: string
          nome?: string
          role_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_anexos: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome_arquivo: string
          projeto_id: string
          tamanho: number | null
          tipo_arquivo: string | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_arquivo: string
          projeto_id: string
          tamanho?: number | null
          tipo_arquivo?: string | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_arquivo?: string
          projeto_id?: string
          tamanho?: number | null
          tipo_arquivo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_anexos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_equipas: {
        Row: {
          created_at: string
          equipa_id: string
          id: string
          projeto_id: string
        }
        Insert: {
          created_at?: string
          equipa_id: string
          id?: string
          projeto_id: string
        }
        Update: {
          created_at?: string
          equipa_id?: string
          id?: string
          projeto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_equipas_equipa_id_fkey"
            columns: ["equipa_id"]
            isOneToOne: false
            referencedRelation: "equipas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_equipas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_membros: {
        Row: {
          created_at: string | null
          id: string
          projeto_id: string
          role_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          projeto_id: string
          role_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          projeto_id?: string
          role_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_membros_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_membros_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          latitude: number | null
          localizacao: string | null
          longitude: number | null
          moeda: string
          nome: string
          orcamento: number | null
          status: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          latitude?: number | null
          localizacao?: string | null
          longitude?: number | null
          moeda?: string
          nome: string
          orcamento?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          latitude?: number | null
          localizacao?: string | null
          longitude?: number | null
          moeda?: string
          nome?: string
          orcamento?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      recibos: {
        Row: {
          arquivo_nome: string
          arquivo_url: string
          comentario: string | null
          created_at: string
          created_by: string | null
          fatura_id: string
          id: string
          justificacao_diferenca: string | null
          valor: number
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          comentario?: string | null
          created_at?: string
          created_by?: string | null
          fatura_id: string
          id?: string
          justificacao_diferenca?: string | null
          valor: number
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          comentario?: string | null
          created_at?: string
          created_by?: string | null
          fatura_id?: string
          id?: string
          justificacao_diferenca?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recibos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recibos_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          permissoes: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          permissoes?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          permissoes?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subatividade_anexos: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          nome_arquivo: string
          subatividade_id: string
          tamanho: number | null
          tipo_arquivo: string | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome_arquivo: string
          subatividade_id: string
          tamanho?: number | null
          tipo_arquivo?: string | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nome_arquivo?: string
          subatividade_id?: string
          tamanho?: number | null
          tipo_arquivo?: string | null
          url?: string
        }
        Relationships: []
      }
      subatividade_comentarios: {
        Row: {
          comentario: string
          created_at: string
          created_by: string | null
          id: string
          subatividade_id: string
          updated_at: string
        }
        Insert: {
          comentario: string
          created_at?: string
          created_by?: string | null
          id?: string
          subatividade_id: string
          updated_at?: string
        }
        Update: {
          comentario?: string
          created_at?: string
          created_by?: string | null
          id?: string
          subatividade_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subatividade_confirmacoes: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          confirmado_em: string | null
          created_at: string | null
          id: string
          motivo_rejeicao: string | null
          observacao: string | null
          status: string | null
          subatividade_id: string
          user_id: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          confirmado_em?: string | null
          created_at?: string | null
          id?: string
          motivo_rejeicao?: string | null
          observacao?: string | null
          status?: string | null
          subatividade_id: string
          user_id: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          confirmado_em?: string | null
          created_at?: string | null
          id?: string
          motivo_rejeicao?: string | null
          observacao?: string | null
          status?: string | null
          subatividade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subatividade_confirmacoes_subatividade_id_fkey"
            columns: ["subatividade_id"]
            isOneToOne: false
            referencedRelation: "subatividades"
            referencedColumns: ["id"]
          },
        ]
      }
      subatividades: {
        Row: {
          atividade_id: string
          concluida: boolean
          created_at: string
          data_conclusao: string | null
          data_prevista: string | null
          descricao: string | null
          id: string
          nome: string
          progresso_manual: number | null
          responsavel_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          atividade_id: string
          concluida?: boolean
          created_at?: string
          data_conclusao?: string | null
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          nome: string
          progresso_manual?: number | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          atividade_id?: string
          concluida?: boolean
          created_at?: string
          data_conclusao?: string | null
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          progresso_manual?: number | null
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subatividades_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades"
            referencedColumns: ["id"]
          },
        ]
      }
      system_preferences: {
        Row: {
          created_at: string | null
          id: string
          idioma: string
          moeda: string
          notificacoes_email: boolean | null
          notificacoes_sistema: boolean | null
          notificacoes_sms: boolean | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          idioma?: string
          moeda?: string
          notificacoes_email?: boolean | null
          notificacoes_sistema?: boolean | null
          notificacoes_sms?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          idioma?: string
          moeda?: string
          notificacoes_email?: boolean | null
          notificacoes_sistema?: boolean | null
          notificacoes_sms?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_by_name: {
        Args: { _role_name: string; _user_id: string }
        Returns: boolean
      }
      is_admin_or_gestor: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gestor" | "colaborador" | "visualizador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestor", "colaborador", "visualizador"],
    },
  },
} as const
