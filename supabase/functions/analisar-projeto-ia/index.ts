import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projeto_id, pergunta, locale = 'pt' } = await req.json();
    
    if (!projeto_id || !pergunta) {
      return new Response(
        JSON.stringify({ error: 'projeto_id e pergunta são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do projeto
    const { data: projeto, error: projetoError } = await supabase
      .from('projetos')
      .select('*')
      .eq('id', projeto_id)
      .single();

    if (projetoError) throw projetoError;

    // Buscar atividades
    const { data: atividades } = await supabase
      .from('atividades')
      .select('*')
      .eq('projeto_id', projeto_id);

    // Buscar subatividades
    const { data: subatividades } = await supabase
      .from('subatividades')
      .select('*, atividade:atividades(nome)')
      .in('atividade_id', (atividades || []).map(a => a.id));

    // Buscar faturas
    const { data: faturas } = await supabase
      .from('faturas')
      .select('*, recibos(*)')
      .eq('projeto_id', projeto_id);

    // Buscar equipas do projeto
    const { data: projetoEquipas } = await supabase
      .from('projeto_equipas')
      .select('equipa:equipas(*, membros:equipa_membros(user:profiles(*)))')
      .eq('projeto_id', projeto_id);

    // Construir contexto do projeto
    const contexto = {
      projeto: {
        nome: projeto.nome,
        descricao: projeto.descricao,
        status: projeto.status,
        data_inicio: projeto.data_inicio,
        data_fim: projeto.data_fim,
        orcamento: projeto.orcamento,
        localizacao: projeto.localizacao
      },
      atividades: (atividades || []).map(a => ({
        nome: a.nome,
        descricao: a.descricao,
        status: a.status,
        prioridade: a.prioridade,
        progresso: a.progresso_manual,
        data_inicio: a.data_inicio,
        data_fim: a.data_fim
      })),
      subatividades: (subatividades || []).map(s => ({
        nome: s.nome,
        descricao: s.descricao,
        atividade: s.atividade?.nome,
        concluida: s.concluida,
        data_prevista: s.data_prevista,
        data_conclusao: s.data_conclusao
      })),
      financeiro: {
        total_faturas: faturas?.reduce((acc, f) => acc + Number(f.valor), 0) || 0,
        total_recibos: faturas?.reduce((acc, f) => 
          acc + (f.recibos?.reduce((sum: number, r: any) => sum + Number(r.valor), 0) || 0), 0) || 0,
        faturas_pendentes: faturas?.filter(f => f.status === 'pendente').length || 0,
        faturas_aprovadas: faturas?.filter(f => f.status === 'aprovado').length || 0,
        faturas_rejeitadas: faturas?.filter(f => f.status === 'rejeitado').length || 0
      },
      equipas: (projetoEquipas || []).map(pe => {
        const equipa = Array.isArray(pe.equipa) ? pe.equipa[0] : pe.equipa;
        return {
          nome: equipa?.nome || '',
          descricao: equipa?.descricao || '',
          membros: equipa?.membros?.map((m: any) => m.user?.nome || '') || []
        };
      })
    };

    // Determinar idioma da resposta
    const languageMap: Record<string, string> = {
      'pt': 'português',
      'en': 'English',
      'es': 'español'
    };
    const language = languageMap[locale] || 'português';

    // Mapear perguntas para prompts específicos
    const promptsMap: Record<string, string> = {
      'visao_geral': `Forneça uma visão geral completa e detalhada do projeto "${projeto.nome}". Analise todos os aspectos: objetivos, estado atual, progresso das atividades, situação financeira, equipas envolvidas, riscos identificados e recomendações. Seja específico e use dados concretos do projeto.`,
      'progresso': `Analise o progresso do projeto "${projeto.nome}". Detalhe o estado de cada atividade, calcule percentagens de conclusão, identifique atividades atrasadas ou em risco, e forneça insights sobre o cronograma.`,
      'atividades_atrasadas': `Identifique e analise as atividades atrasadas no projeto "${projeto.nome}". Liste cada atividade atrasada, explique o impacto no projeto, e sugira ações corretivas.`,
      'atividade_mais_gastos': `Identifique qual atividade tem mais gastos no projeto "${projeto.nome}". Analise as faturas por atividade, compare valores, e forneça insights sobre a distribuição de custos.`,
      'resumo_financeiro': `Forneça um resumo financeiro completo do projeto "${projeto.nome}". Analise o orçamento total, gastos realizados, faturas pendentes/aprovadas/rejeitadas, percentagem do orçamento utilizado, e projeções.`
    };

    const prompt = promptsMap[pergunta] || pergunta;

    const systemPrompt = `Você é um assistente de análise de projetos especializado em gestão de projetos usando a metodologia PCM (Project Cycle Management).
Analise os dados fornecidos e responda de forma clara, objetiva e profissional.
Use dados concretos e específicos do projeto para fundamentar suas análises.
Organize sua resposta em seções com títulos claros.
Forneça insights acionáveis e recomendações práticas.

IMPORTANTE: Responda sempre em ${language}.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `${prompt}\n\nDados do Projeto:\n${JSON.stringify(contexto, null, 2)}` 
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API de IA:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos à sua conta Lovable AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Erro ao chamar a API de IA');
    }

    const aiData = await aiResponse.json();
    const resposta = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        success: true, 
        resposta,
        projeto_nome: projeto.nome
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro ao analisar projeto:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao analisar projeto' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
