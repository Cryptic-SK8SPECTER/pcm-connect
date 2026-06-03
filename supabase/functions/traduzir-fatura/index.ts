import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { arquivoUrl, targetLanguage, targetLanguageName } = await req.json();
    
    console.log('Iniciando tradução de fatura:', { arquivoUrl, targetLanguage, targetLanguageName });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    if (!arquivoUrl) {
      throw new Error('URL do arquivo da fatura não fornecida');
    }

    console.log('Extraindo e traduzindo texto da fatura...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analise esta fatura e forneça uma tradução completa para ${targetLanguageName}.

REGRAS CRÍTICAS:
1. Traduza TODOS os textos para ${targetLanguageName}, incluindo: labels, termos genéricos, E TAMBÉM as descrições dos produtos/serviços na tabela
2. NÃO traduza dados específicos: nomes de pessoas, nomes de empresas, endereços, números, datas, valores monetários
3. TRADUZA as descrições dos itens/produtos/serviços (ex: "Carambola" → "Starfruit", "Misto quente" → "Grilled sandwich", "Bolinho de chuva" → "Rain cake/fritter")
4. A ORDEM DAS COLUNAS DA TABELA DEVE SER: Descrição (nome do produto/serviço), Quantidade (número), Preço Unitário (valor), Valor Total (montante)

FORMATO DE RESPOSTA (JSON estrito):
{
  "titulo": "Título da fatura traduzido (ex: INVOICE, FACTURA, RECHNUNG, FATURA)",
  "cabecalho": {
    "empresa": "Nome da empresa (NÃO TRADUZIR)",
    "numero_label": "Label traduzido (ex: Invoice #, Fatura #)",
    "numero_valor": "Número original",
    "data_label": "Label traduzido (ex: Date, Data)",
    "data_valor": "Data original",
    "vencimento_label": "Label traduzido se existir (ex: Due Date)",
    "vencimento_valor": "Data original se existir",
    "po_label": "Label se existir (ex: P.O. #)",
    "po_valor": "Valor original se existir"
  },
  "destinatario": {
    "label": "Label traduzido (ex: Bill To, Cobrar Para, Facturar A)",
    "conteudo": "Nome e endereço original (NÃO TRADUZIR)"
  },
  "envio": {
    "label": "Label traduzido se existir (ex: Ship To)",
    "conteudo": "Endereço original se existir (NÃO TRADUZIR)"
  },
  "tabela": {
    "colunas": ["Descrição traduzida", "Qtd traduzida", "Preço traduzido", "Valor traduzido"],
    "linhas": [
      {
        "descricao": "Descrição do item TRADUZIDA para ${targetLanguageName}",
        "quantidade": "Número",
        "preco_unitario": "Valor",
        "valor_total": "Valor"
      }
    ]
  },
  "totais": {
    "subtotal_label": "Label traduzido",
    "subtotal_valor": "Valor original",
    "imposto_label": "Label traduzido (ex: Tax, IVA, VAT)",
    "imposto_valor": "Valor original",
    "total_label": "Label traduzido",
    "total_valor": "Valor original"
  },
  "termos": {
    "label": "Label traduzido (ex: Terms and Conditions)",
    "conteudo": "Conteúdo TRADUZIDO para ${targetLanguageName}"
  },
  "pagamento": {
    "label": "Label traduzido se existir",
    "banco": "Info bancária original (NÃO TRADUZIR)"
  },
  "agradecimento": "Mensagem traduzida (ex: Thank you, Obrigado, Gracias)",
  "assinatura": "Nome da assinatura original (NÃO TRADUZIR)"
}

IMPORTANTE: Mantenha a estrutura exata. Se algum campo não existir na fatura, use null.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: arquivoUrl
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Por favor, adicione créditos.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Erro na API: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    console.log('Resposta recebida da IA');

    // Extrair JSON da resposta
    let translatedData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        translatedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError);
      console.error('Conteúdo recebido:', content);
      translatedData = { texto_raw: content };
    }

    console.log('Tradução concluída com sucesso');

    return new Response(JSON.stringify({ 
      success: true,
      translatedData,
      targetLanguage,
      targetLanguageName,
      originalUrl: arquivoUrl,
      message: 'Fatura traduzida com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao traduzir fatura:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
