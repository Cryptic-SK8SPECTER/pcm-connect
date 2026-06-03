import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projetoId, mensagem, historico = [] } = await req.json();

    if (!projetoId || !mensagem) {
      throw new Error('Projeto ID e mensagem são obrigatórios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do projeto
    const { data: projeto, error: projetoError } = await supabase
      .from('projetos')
      .select('*')
      .eq('id', projetoId)
      .single();

    if (projetoError) throw projetoError;

    // Buscar atividades do projeto com relações completas
    const { data: atividades, error: atividadesError } = await supabase
      .from('atividades')
      .select(`
        *,
        profiles:responsavel_id (nome, email, desempenho),
        atividade_confirmacoes (
          status,
          confirmado_em,
          aprovado_em,
          motivo_rejeicao,
          observacao,
          user_id
        ),
        subatividades (
          nome,
          descricao,
          concluida,
          data_conclusao,
          data_prevista,
          progresso_manual
        )
      `)
      .eq('projeto_id', projetoId);

    if (atividadesError) throw atividadesError;

    // Buscar comentários e anexos separadamente pois não têm foreign keys definidas
    const atividadeIds = atividades?.map((a: any) => a.id) || [];
    
    const { data: comentarios } = await supabase
      .from('atividade_comentarios')
      .select('*')
      .in('atividade_id', atividadeIds);

    const { data: atividadeAnexos } = await supabase
      .from('atividade_anexos')
      .select('*')
      .in('atividade_id', atividadeIds);

    // Mapear comentários e anexos para cada atividade
    const atividadesComRelacoes = atividades?.map((atividade: any) => ({
      ...atividade,
      atividade_comentarios: comentarios?.filter((c: any) => c.atividade_id === atividade.id) || [],
      atividade_anexos: atividadeAnexos?.filter((a: any) => a.atividade_id === atividade.id) || []
    }));

    // Buscar anexos do projeto
    const { data: anexos, error: anexosError } = await supabase
      .from('projeto_anexos')
      .select('*')
      .eq('projeto_id', projetoId);

    if (anexosError) throw anexosError;

    // Buscar faturas do projeto
    const { data: faturas, error: faturasError } = await supabase
      .from('faturas')
      .select('*')
      .eq('projeto_id', projetoId);

    if (faturasError) throw faturasError;

    // Buscar dados relacionados às faturas
    const faturaIds = faturas?.map((f: any) => f.id) || [];
    const faturaCreatorIds = faturas?.map((f: any) => f.created_by).filter((id: any) => id) || [];
    const faturaAtividadeIds = faturas?.map((f: any) => f.atividade_id).filter((id: any) => id) || [];

    const { data: itensFatura } = await supabase
      .from('itens_fatura')
      .select('*')
      .in('fatura_id', faturaIds);

    const { data: recibosFaturas } = await supabase
      .from('recibos')
      .select('*')
      .in('fatura_id', faturaIds);

    const { data: faturaCreators } = await supabase
      .from('profiles')
      .select('id, nome')
      .in('id', faturaCreatorIds);

    const { data: faturaAtividades } = await supabase
      .from('atividades')
      .select('id, nome')
      .in('id', faturaAtividadeIds);

    // Mapear faturas com seus dados relacionados
    const faturasCompletas = faturas?.map((f: any) => ({
      ...f,
      itens_fatura: itensFatura?.filter((item: any) => item.fatura_id === f.id) || [],
      recibos: recibosFaturas?.filter((r: any) => r.fatura_id === f.id) || [],
      profiles: faturaCreators?.find((p: any) => p.id === f.created_by),
      atividades: faturaAtividades?.find((a: any) => a.id === f.atividade_id)
    }));

    // Buscar análises de documentos
    const { data: analises, error: analisesError } = await supabase
      .from('analises_documentos')
      .select('*')
      .eq('projeto_id', projetoId);

    if (analisesError) throw analisesError;

    // Buscar membros do projeto
    const { data: membros, error: membrosError } = await supabase
      .from('projeto_membros')
      .select('user_id, role_id')
      .eq('projeto_id', projetoId);

    if (membrosError) throw membrosError;

    // Buscar perfis e roles separadamente
    const userIds = membros?.map((m: any) => m.user_id) || [];
    const roleIds = membros?.map((m: any) => m.role_id).filter((id: any) => id) || [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome, email, desempenho, ativo')
      .in('id', userIds);

    const { data: roles } = await supabase
      .from('roles')
      .select('id, nome, descricao')
      .in('id', roleIds);

    // Mapear membros com seus perfis e roles
    const membrosComPerfis = membros?.map((membro: any) => ({
      profiles: profiles?.find((p: any) => p.id === membro.user_id),
      roles: roles?.find((r: any) => r.id === membro.role_id)
    }));

    // Buscar equipas associadas ao projeto
    const { data: projetoEquipas, error: equipasError } = await supabase
      .from('projeto_equipas')
      .select('equipa_id')
      .eq('projeto_id', projetoId);

    if (equipasError) throw equipasError;

    // Buscar dados das equipas
    const equipaIds = projetoEquipas?.map((pe: any) => pe.equipa_id) || [];
    
    const { data: equipas } = await supabase
      .from('equipas')
      .select('id, nome, descricao')
      .in('id', equipaIds);

    const { data: equipaMembros } = await supabase
      .from('equipa_membros')
      .select('equipa_id, user_id, funcao')
      .in('equipa_id', equipaIds);

    // Buscar perfis dos membros das equipas
    const equipaMembrosUserIds = equipaMembros?.map((em: any) => em.user_id) || [];
    
    const { data: equipaMembrosProfiles } = await supabase
      .from('profiles')
      .select('id, nome, email, desempenho')
      .in('id', equipaMembrosUserIds);

    // Mapear equipas com seus membros
    const equipasComMembros = projetoEquipas?.map((pe: any) => {
      const equipa = equipas?.find((e: any) => e.id === pe.equipa_id);
      const membros = equipaMembros?.filter((em: any) => em.equipa_id === pe.equipa_id).map((em: any) => ({
        ...em,
        profiles: equipaMembrosProfiles?.find((p: any) => p.id === em.user_id)
      }));
      
      return {
        equipas: {
          ...equipa,
          equipa_membros: membros
        }
      };
    });

    // Buscar financiamentos do projeto
    const { data: financiamentos, error: financError } = await supabase
      .from('financiamentos')
      .select('*')
      .eq('projeto_id', projetoId);

    if (financError) throw financError;

    // Buscar alocações de financiamentos
    const financiamentoIds = financiamentos?.map((f: any) => f.id) || [];
    
    const { data: financiamentoAtividades } = await supabase
      .from('financiamento_atividades')
      .select('financiamento_id, atividade_id, valor_alocado')
      .in('financiamento_id', financiamentoIds);

    // Buscar atividades relacionadas
    const finAtividadeIds = financiamentoAtividades?.map((fa: any) => fa.atividade_id) || [];
    
    const { data: finAtividades } = await supabase
      .from('atividades')
      .select('id, nome, status')
      .in('id', finAtividadeIds);

    // Mapear financiamentos com suas atividades
    const financiamentosComAtividades = financiamentos?.map((f: any) => ({
      ...f,
      financiamento_atividades: financiamentoAtividades
        ?.filter((fa: any) => fa.financiamento_id === f.id)
        .map((fa: any) => ({
          ...fa,
          atividades: finAtividades?.find((a: any) => a.id === fa.atividade_id)
        }))
    }));

    // Calcular estatísticas avançadas
    const totalAtividades = atividadesComRelacoes?.length || 0;
    const atividadesConcluidas = atividadesComRelacoes?.filter((a: any) => a.status === 'concluida').length || 0;
    const atividadesEmAndamento = atividadesComRelacoes?.filter((a: any) => a.status === 'em_andamento').length || 0;
    const atividadesPendentes = atividadesComRelacoes?.filter((a: any) => a.status === 'pendente').length || 0;
    const totalFaturas = faturasCompletas?.length || 0;
    const faturasAprovadas = faturasCompletas?.filter((f: any) => f.status === 'aprovada').length || 0;
    const faturasPendentes = faturasCompletas?.filter((f: any) => f.status === 'pendente').length || 0;
    const totalOrcamento = projeto.orcamento || 0;
    const gastoTotal = faturasCompletas?.reduce((acc: number, f: any) => acc + (f.valor || 0), 0) || 0;
    const totalSubatividades = atividadesComRelacoes?.reduce((acc: number, a: any) => acc + (a.subatividades?.length || 0), 0) || 0;
    const subatividadesConcluidas = atividadesComRelacoes?.reduce((acc: number, a: any) => 
      acc + (a.subatividades?.filter((s: any) => s.concluida).length || 0), 0) || 0;
    const totalMembros = membrosComPerfis?.length || 0;
    const totalEquipas = equipasComMembros?.length || 0;
    const totalFinanciamentos = financiamentosComAtividades?.length || 0;
    const valorTotalFinanciamentos = financiamentosComAtividades?.reduce((acc: number, f: any) => acc + (f.valor_total || 0), 0) || 0;
    const valorDisponivelFinanciamentos = financiamentosComAtividades?.reduce((acc: number, f: any) => acc + (f.valor_disponivel || 0), 0) || 0;

    // Construir contexto detalhado para a IA
    const contexto = `
INFORMAÇÕES DO PROJETO:
- Nome: ${projeto.nome}
- Descrição: ${projeto.descricao || 'Não especificada'}
- Status: ${projeto.status}
- Localização: ${projeto.localizacao || 'Não especificada'}
- Moeda: ${projeto.moeda}
- Orçamento Total: ${totalOrcamento} ${projeto.moeda}
- Data de Início: ${projeto.data_inicio || 'Não definida'}
- Data de Fim: ${projeto.data_fim || 'Não definida'}
- Cor/Categoria: ${projeto.cor || 'Não definida'}

ESTATÍSTICAS GERAIS:
- Total de Atividades: ${totalAtividades}
  - Concluídas: ${atividadesConcluidas}
  - Em Andamento: ${atividadesEmAndamento}
  - Pendentes: ${atividadesPendentes}
- Total de Subatividades: ${totalSubatividades}
  - Concluídas: ${subatividadesConcluidas}
- Total de Faturas: ${totalFaturas}
  - Aprovadas: ${faturasAprovadas}
  - Pendentes: ${faturasPendentes}
- Gasto Total: ${gastoTotal} ${projeto.moeda}
- Saldo Restante: ${totalOrcamento - gastoTotal} ${projeto.moeda}
- Percentual Gasto: ${totalOrcamento > 0 ? ((gastoTotal / totalOrcamento) * 100).toFixed(2) : 0}%

EQUIPE E COLABORADORES:
- Total de Membros no Projeto: ${totalMembros}
- Total de Equipas Associadas: ${totalEquipas}

${membrosComPerfis && membrosComPerfis.length > 0 ? `
MEMBROS DO PROJETO:
${membrosComPerfis.map((m: any) => {
  const profile = m.profiles;
  const role = m.roles;
  return `
- ${profile?.nome || 'Nome não disponível'}
  Email: ${profile?.email || 'N/A'}
  Cargo: ${role?.nome || 'N/A'}
  Desempenho: ${profile?.desempenho || 'N/A'}
  Status: ${profile?.ativo ? 'Ativo' : 'Inativo'}
`;
}).join('\n')}
` : 'Nenhum membro específico cadastrado no projeto'}

${equipasComMembros && equipasComMembros.length > 0 ? `
EQUIPAS DO PROJETO:
${equipasComMembros.map((pe: any) => {
  const equipa = pe.equipas;
  return `
- Equipa: ${equipa?.nome || 'N/A'}
  ${equipa?.descricao ? 'Descrição: ' + equipa.descricao : ''}
  Membros da Equipa:
  ${equipa?.equipa_membros?.map((em: any) => {
    const profile = em.profiles;
    return `
    - ${profile?.nome || 'N/A'}
      Função: ${em.funcao || 'N/A'}
      Desempenho: ${profile?.desempenho || 'N/A'}
  `;
  }).join('\n') || '  Nenhum membro na equipa'}
`;
}).join('\n')}
` : ''}

FINANCIAMENTOS:
${financiamentosComAtividades && financiamentosComAtividades.length > 0 ? `
- Total de Financiamentos: ${totalFinanciamentos}
- Valor Total: ${valorTotalFinanciamentos} ${projeto.moeda}
- Valor Disponível: ${valorDisponivelFinanciamentos} ${projeto.moeda}

Detalhes dos Financiamentos:
${financiamentosComAtividades.map((f: any) => `
- ${f.nome}
  ${f.descricao ? 'Descrição: ' + f.descricao : ''}
  Valor Total: ${f.valor_total} ${projeto.moeda}
  Valor Disponível: ${f.valor_disponivel} ${projeto.moeda}
  Status: ${f.ativo ? 'Ativo' : 'Inativo'}
  ${f.financiamento_atividades && f.financiamento_atividades.length > 0 ? `
  Atividades Financiadas:
  ${f.financiamento_atividades.map((fa: any) => `
    - ${fa.atividades?.nome || 'N/A'} (${fa.atividades?.status || 'N/A'})
      Valor Alocado: ${fa.valor_alocado} ${projeto.moeda}
  `).join('\n')}` : ''}
`).join('\n')}
` : 'Nenhum financiamento cadastrado'}

ATIVIDADES DETALHADAS:
${atividadesComRelacoes && atividadesComRelacoes.length > 0 ? atividadesComRelacoes.map((a: any) => `
- ${a.nome} (Status: ${a.status})
  Prioridade: ${a.prioridade}
  Orçamento: ${a.orcamento || 0} ${projeto.moeda}
  Progresso: ${a.progresso_manual || 0}%
  Data Início: ${a.data_inicio || 'N/A'}
  Data Fim: ${a.data_fim || 'N/A'}
  ${a.descricao ? 'Descrição: ' + a.descricao : ''}
  ${a.profiles ? 'Responsável: ' + a.profiles.nome + ' (Desempenho: ' + (a.profiles.desempenho || 'N/A') + ')' : ''}
  
  ${a.subatividades && a.subatividades.length > 0 ? `
  Subatividades (${a.subatividades.length}):
  ${a.subatividades.map((s: any) => `
    - ${s.nome} ${s.concluida ? '(Concluída)' : '(Pendente)'}
      ${s.descricao ? 'Descrição: ' + s.descricao : ''}
      ${s.data_prevista ? 'Data Prevista: ' + s.data_prevista : ''}
      ${s.data_conclusao ? 'Data Conclusão: ' + s.data_conclusao : ''}
      Progresso: ${s.progresso_manual || 0}%
  `).join('\n')}` : ''}
  
  ${a.atividade_confirmacoes && a.atividade_confirmacoes.length > 0 ? `
  Confirmações:
  ${a.atividade_confirmacoes.map((c: any) => `
    - Status: ${c.status}
      ${c.confirmado_em ? 'Confirmado em: ' + new Date(c.confirmado_em).toLocaleDateString() : ''}
      ${c.aprovado_em ? 'Aprovado em: ' + new Date(c.aprovado_em).toLocaleDateString() : ''}
      ${c.motivo_rejeicao ? 'Motivo de Rejeição: ' + c.motivo_rejeicao : ''}
      ${c.observacao ? 'Observação: ' + c.observacao : ''}
  `).join('\n')}` : ''}
  
  ${a.atividade_comentarios && a.atividade_comentarios.length > 0 ? `
  Comentários (${a.atividade_comentarios.length}):
  ${a.atividade_comentarios.map((c: any) => `
    - ${new Date(c.created_at).toLocaleDateString()}: ${c.comentario}
  `).join('\n')}` : ''}
  
  ${a.atividade_anexos && a.atividade_anexos.length > 0 ? `
  Anexos: ${a.atividade_anexos.map((an: any) => an.nome_arquivo).join(', ')}` : ''}
`).join('\n\n') : 'Nenhuma atividade cadastrada'}

DOCUMENTOS DO PROJETO:
${anexos && anexos.length > 0 ? anexos.map(a => `
- ${a.nome_arquivo} (${a.tipo_arquivo || 'tipo desconhecido'})
  ${a.descricao ? 'Descrição: ' + a.descricao : ''}
  Tamanho: ${a.tamanho ? (a.tamanho / 1024).toFixed(2) + ' KB' : 'N/A'}
  Data Upload: ${new Date(a.created_at).toLocaleDateString()}
`).join('\n') : 'Nenhum documento anexado'}

FATURAS DETALHADAS:
${faturasCompletas && faturasCompletas.length > 0 ? faturasCompletas.map((f: any) => `
- Fatura #${f.numero} - ${f.valor} ${projeto.moeda}
  Status: ${f.status}
  Data de Emissão: ${f.data_emissao}
  ${f.descricao ? 'Descrição: ' + f.descricao : ''}
  ${f.profiles ? 'Criado por: ' + f.profiles.nome : ''}
  ${f.atividades ? 'Atividade: ' + f.atividades.nome : ''}
  ${f.motivo_rejeicao ? 'Motivo de Rejeição: ' + f.motivo_rejeicao : ''}
  
  ${f.itens_fatura && f.itens_fatura.length > 0 ? `
  Itens (${f.itens_fatura.length}):
  ${f.itens_fatura.map((item: any) => `
    - ${item.descricao}
      Quantidade: ${item.quantidade}
      Valor Unitário: ${item.valor_unitario} ${projeto.moeda}
      Valor Total: ${item.valor_total || (item.quantidade * item.valor_unitario)} ${projeto.moeda}
  `).join('\n')}` : ''}
  
  ${f.recibos && f.recibos.length > 0 ? `
  Recibos:
  ${f.recibos.map((r: any) => `
    - Valor: ${r.valor} ${projeto.moeda}
      ${r.comentario ? 'Comentário: ' + r.comentario : ''}
      ${r.justificacao_diferenca ? 'Justificação: ' + r.justificacao_diferenca : ''}
  `).join('\n')}` : ''}
`).join('\n\n') : 'Nenhuma fatura cadastrada'}

${analises && analises.length > 0 ? `
ANÁLISES DE DOCUMENTOS REALIZADAS:
${analises.map(a => `
- Tipo: ${a.tipo_analise}
  Status: ${a.status}
  Severidade: ${a.severidade || 'N/A'}
  Data: ${new Date(a.created_at).toLocaleDateString()}
  ${a.insights ? 'Insights: ' + JSON.stringify(a.insights) : ''}
  ${a.divergencias ? 'Divergências Encontradas: ' + JSON.stringify(a.divergencias) : ''}
  ${a.dados_extraidos ? 'Dados Extraídos: ' + JSON.stringify(a.dados_extraidos) : ''}
`).join('\n')}
` : ''}
`;

    // Preparar mensagens para a IA
    const messages = [
      {
        role: "system",
        content: `Você é um assistente especializado em análise e gestão de projetos. Você tem acesso COMPLETO a todos os dados de um projeto, incluindo:
- Informações gerais do projeto (orçamento, datas, localização)
- Todos os membros e colaboradores com seus desempenhos
- Equipas associadas e seus membros
- Todas as atividades e suas subatividades detalhadas
- Confirmações, comentários e anexos de atividades
- Faturas com itens detalhados e recibos
- Documentos e análises realizadas
- Financiamentos e suas alocações

Regras importantes:
- Responda SEMPRE em português de Portugal
- Use TODOS os dados fornecidos no contexto detalhado abaixo
- Se não tiver informação específica sobre algo, seja claro sobre isso
- Forneça análises profundas e insights valiosos baseados nos dados
- Use formatação clara com listas simples usando hífen (-) ou números (1., 2., etc.)
- NUNCA use asteriscos (*) para formatação ou ênfase
- Seja completo mas direto ao ponto
- Quando mencionar valores monetários, SEMPRE inclua a moeda
- Destaque pontos críticos que exijam atenção da gestão
- Identifique padrões, tendências e possíveis problemas
- Sugira melhorias quando apropriado
- Considere o desempenho dos colaboradores nas suas análises
- Relacione informações de diferentes partes do projeto quando relevante

CONTEXTO COMPLETO DO PROJETO:
${contexto}`
      },
      ...historico,
      {
        role: "user",
        content: mensagem
      }
    ];

    console.log('Chamando Lovable AI...');

    // Chamar Lovable AI com retry logic
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: messages,
            temperature: 0.7,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Tentativa ${attempt}/${maxRetries} - Erro da API:`, response.status, errorText);
          
          if (response.status === 429) {
            throw new Error('Limite de requisições excedido. Por favor, tente novamente em alguns instantes.');
          }
          if (response.status === 402) {
            throw new Error('Créditos insuficientes. Por favor, adicione créditos ao seu workspace.');
          }
          if (response.status === 503) {
            // Serviço temporariamente indisponível - tentar novamente
            if (attempt < maxRetries) {
              const waitTime = attempt * 2000; // Esperar 2s, 4s, 6s entre tentativas
              console.log(`Serviço temporariamente indisponível. Aguardando ${waitTime}ms antes de tentar novamente...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            throw new Error('Serviço temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
          }
          
          throw new Error(`Erro ao chamar a API: ${response.status}`);
        }

        // Se chegou aqui, a requisição foi bem-sucedida
        const data = await response.json();
        const resposta = data.choices?.[0]?.message?.content;

        if (!resposta) {
          throw new Error('Resposta vazia da IA');
        }

        return new Response(
          JSON.stringify({
            success: true,
            resposta: resposta,
            contexto: {
              totalAtividades,
              atividadesConcluidas,
              totalFaturas,
              gastoTotal,
              saldoRestante: totalOrcamento - gastoTotal
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
        
      } catch (error: any) {
        lastError = error;
        if (attempt === maxRetries || error.message.includes('Limite de requisições') || error.message.includes('Créditos insuficientes')) {
          throw error;
        }
      }
    }
    
    throw lastError;

  } catch (error: any) {
    console.error('Erro no chat:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao processar pergunta'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
