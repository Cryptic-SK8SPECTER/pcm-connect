import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { descricao, locale = 'pt' } = await req.json();

    if (!descricao || descricao.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Descrição do projeto é obrigatória' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Determinar idioma da resposta
    const languageMap: Record<string, string> = {
      'pt': 'português',
      'en': 'English',
      'es': 'español'
    };
    const language = languageMap[locale] || 'português';

    const systemPrompt = `Você é um especialista em gestão de projetos e análise de viabilidade. 
Sua tarefa é analisar a descrição de um projeto e fornecer sugestões práticas e estruturadas.

Forneça a análise em formato JSON com a seguinte estrutura:
{
  "resumo": "resumo executivo do projeto em 2-3 frases",
  "fases": [
    {
      "nome": "Nome da fase",
      "descricao": "descrição breve",
      "duracao_estimada": "tempo estimado"
    }
  ],
  "equipe": {
    "tamanho_recomendado": "número de pessoas",
    "perfis": ["perfil 1", "perfil 2", ...]
  },
  "atividades": [
    {
      "titulo": "Nome da atividade",
      "descricao": "descrição",
      "prioridade": "alta/media/baixa"
    }
  ],
  "cronograma": {
    "duracao_total": "tempo total estimado",
    "marcos": ["marco 1", "marco 2", ...]
  },
  "recursos": {
    "humanos": "descrição de recursos humanos",
    "tecnologicos": "descrição de recursos tecnológicos",
    "financeiros": "estimativa de investimento"
  },
  "riscos": [
    {
      "descricao": "descrição do risco",
      "impacto": "alto/medio/baixo",
      "mitigacao": "como mitigar"
    }
  ],
  "recomendacoes": ["recomendação 1", "recomendação 2", ...]
}

Seja específico, prático e objetivo. IMPORTANTE: Responda sempre em ${language}.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise este projeto:\n\n${descricao}` }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API de IA:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos de IA esgotados. Adicione créditos para continuar.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }
      
      throw new Error('Falha ao processar análise');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    let analise: any = null;
    try {
      // Tenta extrair JSON do conteúdo
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        analise = JSON.parse(jsonMatch[1]);
      } else {
        analise = JSON.parse(content);
      }
    } catch (e) {
      console.error('Erro ao parsear JSON:', e);
      // Se falhar, retorna o texto bruto
      return new Response(
        JSON.stringify({ 
          success: true, 
          analise: {
            resumo: content,
            fases: [],
            equipe: { tamanho_recomendado: "N/A", perfis: [] },
            atividades: [],
            cronograma: { duracao_total: "N/A", marcos: [] },
            recursos: { humanos: "", tecnologicos: "", financeiros: "" },
            riscos: [],
            recomendacoes: []
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, analise }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Erro ao analisar projeto:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno ao processar análise' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
