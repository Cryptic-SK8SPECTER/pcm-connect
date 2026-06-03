import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificacaoRequest {
  confirmacao_id: string;
  atividade_id: string;
  usuario_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { confirmacao_id, atividade_id, usuario_id }: NotificacaoRequest = await req.json();

    console.log("Processando notificação para confirmação:", confirmacao_id);

    // Buscar informações da atividade e usuário
    const { data: atividade, error: atividadeError } = await supabase
      .from("atividades")
      .select(`
        id,
        nome,
        projeto_id,
        projetos!inner (
          id,
          nome
        )
      `)
      .eq("id", atividade_id)
      .single();

    if (atividadeError || !atividade) {
      console.error("Erro ao buscar atividade:", atividadeError);
      throw new Error("Atividade não encontrada");
    }

    // O Supabase retorna arrays nos relacionamentos, então pegamos o primeiro
    const projeto = Array.isArray(atividade.projetos) ? atividade.projetos[0] : atividade.projetos;

    // Buscar informações do usuário que confirmou
    const { data: usuario, error: usuarioError } = await supabase
      .from("profiles")
      .select("id, nome, email")
      .eq("id", usuario_id)
      .single();

    if (usuarioError || !usuario) {
      console.error("Erro ao buscar usuário:", usuarioError);
      throw new Error("Usuário não encontrado");
    }

    // Buscar gestores e admins do projeto
    const { data: membros, error: membrosError } = await supabase
      .from("projeto_membros")
      .select(`
        user_id,
        profiles!inner (
          id,
          nome,
          email,
          role_id,
          roles!inner (
            nome
          )
        )
      `)
      .eq("projeto_id", atividade.projeto_id);

    if (membrosError) {
      console.error("Erro ao buscar membros:", membrosError);
      throw membrosError;
    }

    // Filtrar apenas gestores e admins, tratando arrays
    const gestores = membros?.filter((m: any) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const role = profile?.roles ? (Array.isArray(profile.roles) ? profile.roles[0] : profile.roles) : null;
      return role?.nome === "Gestor" || role?.nome === "Administrador";
    }) || [];

    console.log(`Encontrados ${gestores.length} gestores para notificar`);

    // Criar notificações para cada gestor
    const notificacoes = gestores.map((gestor: any) => {
      const profile = Array.isArray(gestor.profiles) ? gestor.profiles[0] : gestor.profiles;
      return {
        user_id: profile.id,
        tipo: "confirmacao_atividade",
        titulo: "Nova Confirmação de Atividade",
        mensagem: `${usuario.nome} confirmou a conclusão da atividade "${atividade.nome}" no projeto "${projeto.nome}"`,
        link: `/atividades/${atividade_id}`,
        metadata: {
          confirmacao_id,
          atividade_id,
          usuario_id,
          projeto_id: atividade.projeto_id,
        },
      };
    });

    if (notificacoes.length > 0) {
      const { error: notifError } = await supabase
        .from("notificacoes")
        .insert(notificacoes);

      if (notifError) {
        console.error("Erro ao criar notificações:", notifError);
      } else {
        console.log("Notificações criadas com sucesso");
      }
    }

    // Enviar emails para gestores
    for (const gestor of gestores) {
      try {
        const profile = Array.isArray(gestor.profiles) ? gestor.profiles[0] : gestor.profiles;
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #0D9488; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; padding: 12px 24px; background-color: #0D9488; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                .info-box { background-color: white; padding: 15px; border-left: 4px solid #0D9488; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎯 Nova Confirmação de Atividade</h1>
                </div>
                <div class="content">
                  <p>Olá <strong>${profile.nome}</strong>,</p>
                  
                  <p>Uma nova atividade foi confirmada e aguarda sua análise:</p>
                  
                  <div class="info-box">
                    <p><strong>Projeto:</strong> ${projeto.nome}</p>
                    <p><strong>Atividade:</strong> ${atividade.nome}</p>
                    <p><strong>Confirmado por:</strong> ${usuario.nome}</p>
                  </div>
                  
                  <p>Por favor, acesse o sistema para analisar e aprovar ou rejeitar esta confirmação.</p>
                  
                  <center>
                    <a href="${Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "")}/aprovar-confirmacoes" class="button">
                      Analisar Confirmação
                    </a>
                  </center>
                  
                  <p class="footer">
                    Este é um email automático do sistema PCM-CONNECT.<br>
                    Por favor, não responda a este email.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `;

        await resend.emails.send({
          from: "PCM-CONNECT <onboarding@resend.dev>",
          to: [profile.email],
          subject: `Nova Confirmação: ${atividade.nome}`,
          html: emailHtml,
        });

        console.log(`Email enviado para ${profile.email}`);
      } catch (emailError) {
        const profile = Array.isArray(gestor.profiles) ? gestor.profiles[0] : gestor.profiles;
        console.error(`Erro ao enviar email para ${profile.email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificacoes_criadas: notificacoes.length,
        emails_enviados: gestores.length 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro na função notificar-confirmacao:", error);
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
