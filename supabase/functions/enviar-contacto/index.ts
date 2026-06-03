import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, message }: ContactRequest = await req.json();

    console.log("Recebida solicitação de contacto:", { name, email, phone });

    // Email para a empresa
    const emailToCompany = await resend.emails.send({
      from: "PCM-CONNECT <onboarding@resend.dev>",
      to: ["info@pcm-connect.com"], // Substitua pelo email real da empresa
      subject: `Nova Mensagem de Contacto - ${name}`,
      html: `
        <h2>Nova Mensagem de Contacto</h2>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefone:</strong> ${phone}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${message}</p>
      `,
    });

    // Email de confirmação para o cliente
    const emailToCustomer = await resend.emails.send({
      from: "PCM-CONNECT <onboarding@resend.dev>",
      to: [email],
      subject: "Recebemos a sua mensagem!",
      html: `
        <h1>Obrigado pelo seu contacto, ${name}!</h1>
        <p>Recebemos a sua mensagem e entraremos em contacto consigo em breve.</p>
        <p><strong>Resumo da sua mensagem:</strong></p>
        <p>${message}</p>
        <br>
        <p>Melhores cumprimentos,<br>Equipa PCM-CONNECT</p>
        <p>Telefone: 842 355 005</p>
      `,
    });

    console.log("Emails enviados com sucesso:", { emailToCompany, emailToCustomer });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Mensagem enviada com sucesso!" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
