import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnexoData {
  id: string;
  url: string;
}

interface N8nPayload {
  body: {
    record: {
      tabela: string;
      ref_id: string;
      anexos: AnexoData[];
    };
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projeto_id } = await req.json();

    if (!projeto_id) {
      throw new Error('projeto_id é obrigatório');
    }

    console.log('Processando anexos do projeto:', projeto_id);

    // Buscar todos os anexos do projeto
    const { data: anexos, error: anexosError } = await supabase
      .from('projeto_anexos')
      .select('id, url')
      .eq('projeto_id', projeto_id);

    if (anexosError) {
      console.error('Erro ao buscar anexos:', anexosError);
      throw anexosError;
    }

    if (!anexos || anexos.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhum anexo encontrado para este projeto' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontrados ${anexos.length} anexos`);

    // Preparar payload para o n8n
    const n8nPayload: N8nPayload = {
      body: {
        record: {
          tabela: 'projeto_anexos',
          ref_id: projeto_id,
          anexos: anexos.map(anexo => ({
            id: anexo.id,
            url: anexo.url
          }))
        }
      }
    };

    console.log('Enviando para n8n:', JSON.stringify(n8nPayload, null, 2));

    // Enviar para o webhook do n8n
    const n8nResponse = await fetch('https://anamaria.app.n8n.cloud/webhook-test/auditor-anexos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('Erro do n8n:', errorText);
      throw new Error(`Erro do n8n: ${n8nResponse.status} - ${errorText}`);
    }

    const n8nResult = await n8nResponse.json();
    console.log('Resposta do n8n:', JSON.stringify(n8nResult, null, 2));

    // Salvar resultado na tabela analises_documentos
    const { error: insertError } = await supabase
      .from('analises_documentos')
      .insert({
        projeto_id: projeto_id,
        tipo_analise: 'processamento_automatico',
        status: 'concluida',
        dados_extraidos: n8nResult.dados_extraidos || null,
        divergencias: n8nResult.divergencias || null,
        insights: n8nResult.insights || null,
        severidade: n8nResult.severidade || null,
      });

    if (insertError) {
      console.error('Erro ao salvar análise:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${anexos.length} anexo(s) processado(s) com sucesso`,
        resultado: n8nResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao processar anexos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
