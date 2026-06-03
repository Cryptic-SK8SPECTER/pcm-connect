import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentUrls, question } = await req.json();

    console.log('Recebido:', { documentUrls, question });

    // Send to n8n webhook
    const response = await fetch('https://digiglow28.app.n8n.cloud/webhook/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentUrls,
        question
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro do n8n:', response.status, errorText);
      throw new Error(`Erro na requisição n8n: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta do n8n:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro na função:', errorMessage);
    return new Response(JSON.stringify({ 
      status: 'error',
      answer: 'Erro ao processar sua pergunta. Por favor, tente novamente.',
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
