import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { pdfText } from "jsr:@pdf/pdftext@1.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL_PRIMARY = 'google/gemini-2.5-flash';
const MODEL_FALLBACK = 'google/gemini-2.5-pro';
const TIMEOUT_MS = 30000;

async function extractTextFromBuffer(buf: ArrayBuffer, contentType: string): Promise<string> {
  // PDF: use proper parser to get embedded text (handles most digital PDFs)
  if (contentType.includes('application/pdf')) {
    try {
      const pages = await pdfText(new Uint8Array(buf));
      const ordered = Object.keys(pages)
        .map((k) => Number(k))
        .sort((a, b) => a - b)
        .map((n) => pages[n] || '')
        .join('\n\n');
      const cleaned = ordered
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
        .replace(/\u0000/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      return cleaned;
    } catch (e) {
      console.warn('PDF text extraction failed, falling back to naive decode', e);
      // Fall-through to naive decode
    }
  }

  // Generic decode (TXT and some DOC variants). Tries UTF-8 then latin1.
  let text = '';
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(buf));
  } catch {
    text = new TextDecoder('latin1', { fatal: false }).decode(new Uint8Array(buf));
  }

  const cleaned = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
    .replace(/\u0000/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

async function analyzeWithAI(lovableApiKey: string, text: string, contentType: string, base64Data?: string) {
  const systemPrompt = `Você é um especialista em análise de documentos fiscais. Sua tarefa é:

1. CLASSIFICAÇÃO: Determinar se o documento é uma FATURA válida
2. EXTRAÇÃO: Se for fatura, extrair dados estruturados
3. OCR: Quando uma IMAGEM for fornecida, realizar OCR e retornar o TEXTO COMPLETO reconhecido (sem truncar)

ELEMENTOS ESSENCIAIS de uma fatura (PT ou EN):
- Título claro (Fatura/Factura/Invoice)
- Nome da empresa emissora
- NUIT/NIF/VAT/Tax ID
- Data de emissão
- Número único da fatura
- Descrição de itens/serviços
- Valores itemizados e total
- Nome/entidade do cliente

RESPONDA APENAS COM JSON válido:
{
  "is_invoice": true/false,
  "confidence": "high"/"medium"/"low",
  "language": "pt"/"en",
  "reason": "breve explicação da classificação",
  "numero": "string ou null",
  "descricao": "string ou null",
  "valor": number ou null,
  "data_emissao": "YYYY-MM-DD ou null",
  "empresa_emissora": "string ou null",
  "nuit": "string ou null",
  "cliente": "string ou null",
  "extracted_text": "texto OCR completo quando imagem, caso contrário null"
}`;

  const userContent: any[] = [
    { type: 'text', text: text ? `Analise este texto extraído do documento:\n\n${text.slice(0, 50000)}` : 'Analise esta imagem de documento.' }
  ];

  if (base64Data && contentType.startsWith('image/')) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:${contentType};base64,${base64Data}` }
    });
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent }
  ];

  let res = await callAI(lovableApiKey, messages, MODEL_PRIMARY);
  if (!res.ok && res.status === 400) {
    console.log('Trying fallback model...');
    res = await callAI(lovableApiKey, messages, MODEL_FALLBACK);
  }

  if (!res.ok) {
    const errMsg = res.status === 429 ? 'Limite de requisições excedido.' :
                   res.status === 402 ? 'Créditos de IA esgotados.' : 'Falha ao processar documento.';
    throw new Error(errMsg);
  }

  const content = res.json?.choices?.[0]?.message?.content ?? '';
  let parsed: any = null;
  
  try {
    parsed = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[1]); } catch {}
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Não foi possível interpretar a resposta da IA.');
  }

  return parsed;
}

async function callAI(lovableApiKey: string, payload: any, model: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('TIMEOUT'), TIMEOUT_MS);
  try {
    const response = await fetch(AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages: payload, temperature: 0.2, max_tokens: 900 }),
      signal: controller.signal,
    });
    const text = await response.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = null; }
    return { ok: response.ok, status: response.status, json, raw: text };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const fileUrl = body.fileUrl as string | undefined;
    const fileName = (body.fileName as string | undefined) || 'document';
    const mimeTypeBody = (body.mimeType as string | undefined) || '';

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum ficheiro enviado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    // Download file
    const dl = await fetch(fileUrl);
    if (!dl.ok) {
      return new Response(JSON.stringify({ success: false, error: 'Não foi possível aceder ao ficheiro' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }
    const buf = await dl.arrayBuffer();
    let contentType = dl.headers.get('content-type') || mimeTypeBody || '';
    if (!contentType) {
      const lower = fileName.toLowerCase();
      if (lower.endsWith('.pdf')) contentType = 'application/pdf';
      else if (lower.endsWith('.png')) contentType = 'image/png';
      else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (lower.endsWith('.webp')) contentType = 'image/webp';
      else if (lower.endsWith('.gif')) contentType = 'image/gif';
      else if (lower.endsWith('.docx')) contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (lower.endsWith('.doc')) contentType = 'application/msword';
    }

    // Extract text for all document types
    let extractedText = '';
    if (contentType.includes('application/pdf') || 
        contentType.includes('application/msword') || 
        contentType.includes('application/vnd.openxmlformats-officedocument') ||
        contentType.includes('text/')) {
      extractedText = await extractTextFromBuffer(buf, contentType);
      console.log(`Extracted ${extractedText.length} chars from ${contentType}`);
    }

    // Analyze with AI (all types)
    const base64 = contentType.startsWith('image/') ? 
      btoa(String.fromCharCode(...new Uint8Array(buf))) : undefined;

    const aiResult = await analyzeWithAI(LOVABLE_API_KEY, extractedText, contentType, base64);
    
    console.log('AI Analysis Result:', {
      is_invoice: aiResult.is_invoice,
      confidence: aiResult.confidence,
      language: aiResult.language,
      reason: aiResult.reason
    });

    if (aiResult.is_invoice === false) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Documento não reconhecido como fatura válida.\n\nMotivo: ${aiResult.reason}`,
        details: {
          confidence: aiResult.confidence,
          language: aiResult.language
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200,
      });
    }

    // Success - return extracted data
    return new Response(
      JSON.stringify({ 
        success: true, 
        extracted_text: extractedText && extractedText.length > 0 ? extractedText : (aiResult.extracted_text ?? null),
        data: {
          numero: aiResult.numero ?? null,
          descricao: aiResult.descricao ?? null,
          valor: aiResult.valor != null ? Number(aiResult.valor) : null,
          data_emissao: aiResult.data_emissao ?? null,
          empresa_emissora: aiResult.empresa_emissora ?? null,
          nuit: aiResult.nuit ?? null,
          cliente: aiResult.cliente ?? null,
        },
        metadata: {
          confidence: aiResult.confidence,
          language: aiResult.language,
          reason: aiResult.reason
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (e) {
    console.error('Erro ao extrair dados:', e);
    return new Response(JSON.stringify({ success: false, error: 'Erro interno ao processar documento.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
