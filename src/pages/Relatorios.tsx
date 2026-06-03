import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, PieChart, TrendingUp, FileText, Loader2, Sparkles, AlertCircle, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import { useTranslations } from "@/hooks/useTranslations";
import { useLocale } from "@/context/LocaleProvider";
import { Textarea } from "@/components/ui/textarea";
const Relatorios = () => {
  const t = useTranslations();
  const {
    locale
  } = useLocale();
  const [projetos, setProjetos] = useState<any[]>([]);
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analiseResposta, setAnaliseResposta] = useState<string>("");
  const [respostaN8n, setRespostaN8n] = useState<any>(null);
  const [questao, setQuestao] = useState<string>("");
  useEffect(() => {
    const fetchProjetos = async () => {
      const {
        data,
        error
      } = await supabase.from('projetos').select('id, nome, status').order('created_at', {
        ascending: false
      });
      if (error) {
        toast.error(t.reportsAI.errorLoadingProjects);
        return;
      }
      setProjetos(data || []);
    };
    fetchProjetos();
  }, []);
  const handleAnalisar = async () => {
    if (!projetoSelecionado) {
      toast.error("Selecione um projeto primeiro");
      return;
    }
    
    setIsAnalyzing(true);
    setAnaliseResposta("");
    
    try {
      // Buscar anexos do projeto com todos os campos
      const { data: anexos, error: anexosError } = await supabase
        .from('projeto_anexos')
        .select('id, url, nome_arquivo, tipo_arquivo')
        .eq('projeto_id', projetoSelecionado);

      if (anexosError) throw anexosError;

      if (!anexos || anexos.length === 0) {
        toast.error("Este projeto não tem anexos para analisar");
        setIsAnalyzing(false);
        return;
      }

      // Buscar dados completos do projeto
      const { data: projeto, error: projetoError } = await supabase
        .from('projetos')
        .select('id, nome, descricao, status, data_inicio, data_fim, moeda, orcamento')
        .eq('id', projetoSelecionado)
        .single();

      if (projetoError) throw projetoError;

      // Buscar exchange rates
      const { data: exchangeRates, error: ratesError } = await supabase
        .from('exchange_rates')
        .select('currency_code, rate_to_mzn')
        .eq('ativo', true);

      if (ratesError) throw ratesError;

      // Buscar faturas relacionadas
      const { data: faturas, error: faturasError } = await supabase
        .from('faturas')
        .select('*')
        .eq('projeto_id', projetoSelecionado);

      if (faturasError) throw faturasError;

      // Buscar atividades relacionadas
      const { data: atividades, error: atividadesError } = await supabase
        .from('atividades')
        .select('*')
        .eq('projeto_id', projetoSelecionado);

      if (atividadesError) throw atividadesError;

      // Formatar payload para n8n
      const payload = {
        body: {
          record: {
            tabela: "projeto_anexos",
            ref_id: projetoSelecionado,
            questao: questao || null,
            anexos: anexos.map(anexo => ({
              id: anexo.id,
              url: anexo.url,
              nome_arquivo: anexo.nome_arquivo,
              tipo_arquivo: anexo.tipo_arquivo
            })),
            contexto: {
              projeto: {
                id: projeto.id,
                nome: projeto.nome,
                descricao: projeto.descricao,
                status: projeto.status,
                data_inicio: projeto.data_inicio,
                data_fim: projeto.data_fim,
                moeda: projeto.moeda,
                orcamento: projeto.orcamento
              },
              exchange_rates: exchangeRates || [],
              faturas_relacionadas: faturas || [],
              atividades_relacionadas: atividades || [],
              regras_analise: {
                detectar_fraude: true,
                comparar_orcamento: true,
                validar_datas: true,
                validar_duplicacoes: true
              }
            }
          }
        }
      };

      // Enviar para edge function que chama o n8n
      const { data: resultado, error: functionError } = await supabase.functions.invoke(
        'analisar-anexos-n8n',
        { body: payload }
      );

      if (functionError) {
        throw new Error(functionError.message || 'Erro ao chamar edge function');
      }
      
      console.log('Resposta do n8n:', resultado);
      
      // Processar resposta do n8n conforme lógica condicional
      let respostaProcessada;
      
      // Se tem campo 'resposta', é uma resposta a questão
      if (resultado?.resposta && resultado.resposta.trim() !== '') {
        console.log('Mostrando resposta');
        respostaProcessada = {
          tipo: 'resposta',
          conteudo: resultado.resposta
        };
      } 
      // Se tem tipo_analise, dados_extraidos, etc., é uma análise completa
      else if (resultado?.tipo_analise || resultado?.dados_extraidos || resultado?.divergencias) {
        console.log('Mostrando análise completa direto do resultado');
        respostaProcessada = {
          tipo: 'analise',
          conteudo: resultado
        };
      }
      // Senão, tenta parsear output_limpo
      else if (resultado?.output_limpo) {
        console.log('Processando output_limpo');
        try {
          const dadosParsed = typeof resultado.output_limpo === 'string' 
            ? JSON.parse(resultado.output_limpo)
            : resultado.output_limpo;
          console.log('Dados parseados:', dadosParsed);
          respostaProcessada = {
            tipo: 'analise',
            conteudo: dadosParsed
          };
        } catch (parseError) {
          console.error('Erro ao parsear output_limpo:', parseError);
          throw new Error('Erro ao processar resposta da análise');
        }
      } else {
        console.error('Estrutura de resposta não reconhecida:', resultado);
        throw new Error('Formato de resposta não reconhecido');
      }
      
      console.log('Resposta processada:', respostaProcessada);
      setRespostaN8n(respostaProcessada);
      toast.success("Análise concluída com sucesso");
      
    } catch (error: any) {
      console.error('Erro ao analisar:', error);
      toast.error(error.message || "Erro ao processar anexos");
    } finally {
      setIsAnalyzing(false);
    }
  };
  const exportAnalysisAsPDF = () => {
    if (!analiseResposta) return;
    const doc = new jsPDF();
    const projetoNome = projetos.find(p => p.id === projetoSelecionado)?.nome || 'Projeto';

    // Configuração de estilo
    doc.setFont("helvetica");

    // Título
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text("Análise de Anexos - PCM", 20, 20);

    // Informações do projeto
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Projeto: ${projetoNome}`, 20, 35);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 20, 45);

    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 50, 190, 50);

    // Conteúdo da análise
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(analiseResposta, 170);
    let yPosition = 60;
    splitText.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 20, yPosition);
      yPosition += 7;
    });

    // Rodapé
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Página ${i} de ${totalPages}`, 105, 290, {
        align: 'center'
      });
    }
    doc.save(`analise-anexos-${projetoNome}-${Date.now()}.pdf`);
    toast.success(t.reportsAI.pdfExported);
  };
  const parseAnalysisContent = (text: string) => {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = {
      title: '',
      content: [] as Array<{ type: 'text' | 'list'; content: string }>,
      icon: null as any
    };
    
    lines.forEach(line => {
      const trimmedLine = line.trim();

      // Detectar títulos de seção
      if (trimmedLine.startsWith('##') || (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.length < 100)) {
        if (currentSection.title) {
          sections.push({ ...currentSection });
        }
        const title = trimmedLine.replace(/^##\s*/, '').replace(/\*\*/g, '').trim();
        let icon = FileText;
        if (title.toLowerCase().includes('progresso') || title.toLowerCase().includes('status')) {
          icon = TrendingUp;
        } else if (title.toLowerCase().includes('financeiro') || title.toLowerCase().includes('gasto') || title.toLowerCase().includes('orçamento') || title.toLowerCase().includes('custo')) {
          icon = DollarSign;
        } else if (title.toLowerCase().includes('atrasada') || title.toLowerCase().includes('risco') || title.toLowerCase().includes('alerta') || title.toLowerCase().includes('atenção')) {
          icon = AlertCircle;
        } else if (title.toLowerCase().includes('conclusão') || title.toLowerCase().includes('sucesso') || title.toLowerCase().includes('completa') || title.toLowerCase().includes('concluída')) {
          icon = CheckCircle2;
        } else if (title.toLowerCase().includes('prazo') || title.toLowerCase().includes('cronograma') || title.toLowerCase().includes('data')) {
          icon = Clock;
        }
        currentSection = { title, content: [], icon };
      } else if (trimmedLine) {
        // Remover ** do conteúdo
        const cleanedLine = trimmedLine.replace(/\*\*/g, '');
        
        // Detectar listas (começa com -, *, ou número seguido de ponto)
        if (cleanedLine.match(/^[-*•]\s/) || cleanedLine.match(/^\d+\.\s/)) {
          const listContent = cleanedLine.replace(/^[-*•]\s/, '').replace(/^\d+\.\s/, '');
          currentSection.content.push({ type: 'list', content: listContent });
        } 
        // Texto normal
        else {
          currentSection.content.push({ type: 'text', content: cleanedLine });
        }
      }
    });
    
    if (currentSection.title) {
      sections.push(currentSection);
    }
    
    return sections.length > 0 ? sections : [{
      title: 'Análise',
      content: [{ type: 'text', content: text.replace(/\*\*/g, '') }],
      icon: FileText
    }];
  };
  const relatorios = [{
    titulo: t.reportsAI.reports.projectProgress.title,
    descricao: t.reportsAI.reports.projectProgress.description,
    icone: BarChart3,
    tipo: t.reportsAI.reports.projectProgress.type
  }, {
    titulo: t.reportsAI.reports.financialAnalysis.title,
    descricao: t.reportsAI.reports.financialAnalysis.description,
    icone: PieChart,
    tipo: t.reportsAI.reports.financialAnalysis.type
  }, {
    titulo: t.reportsAI.reports.kpiCompliance.title,
    descricao: t.reportsAI.reports.kpiCompliance.description,
    icone: TrendingUp,
    tipo: t.reportsAI.reports.kpiCompliance.type
  }, {
    titulo: t.reportsAI.reports.teamReport.title,
    descricao: t.reportsAI.reports.teamReport.description,
    icone: FileText,
    tipo: t.reportsAI.reports.teamReport.type
  }];
  return <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{t.reportsAI.title}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">{t.reportsAI.subtitle}</p>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-accent/30 to-accent/10 border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t.reportsAI.intelligentAnalysis}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t.reportsAI.intelligentAnalysisDesc}
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">{t.reportsAI.selectProjectStep}</label>
              <Select value={projetoSelecionado} onValueChange={setProjetoSelecionado}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={t.reportsAI.chooseProject} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {projetos.map(projeto => <SelectItem key={projeto.id} value={projeto.id}>
                      <div className="flex items-center gap-2">
                        <span>{projeto.nome}</span>
                        <Badge variant="outline" className="text-xs">{projeto.status}</Badge>
                      </div>
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Questão (opcional)</label>
              <Textarea
                placeholder="Digite sua questão sobre o projeto..."
                value={questao}
                onChange={(e) => setQuestao(e.target.value)}
                rows={3}
                className="bg-background resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Faça perguntas específicas sobre o projeto que serão analisadas pela IA
              </p>
            </div>

            <Button onClick={handleAnalisar} disabled={!projetoSelecionado || isAnalyzing} className="w-full">
              {isAnalyzing ? <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.reportsAI.analyzing}
                </> : <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t.reportsAI.analyzeWithAI}
                </>}
            </Button>
          </div>


            {respostaN8n && (
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Resultado da Análise
                </h4>
                
                {respostaN8n.tipo === 'resposta' ? (
                  <Card className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Resposta à Questão
                        </CardTitle>
                        <Badge variant="default">IA</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date().toLocaleString('pt-PT')}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {respostaN8n.conteudo}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : respostaN8n.tipo === 'analise' ? (
                  <div className="grid gap-4">
                    {(() => {
                      // Se for um único objeto com tipo_analise, wrappear num array
                      const analises = respostaN8n.conteudo.tipo_analise 
                        ? [respostaN8n.conteudo]
                        : (Array.isArray(respostaN8n.conteudo) 
                          ? respostaN8n.conteudo 
                          : [respostaN8n.conteudo]);
                      
                      return analises.map((analise: any, idx: number) => (
                        <Card key={idx} className="border-l-4 border-l-accent">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-4 w-4 text-accent" />
                                {analise.tipo_analise || 'Análise'}
                              </CardTitle>
                              <Badge variant={analise.status === 'concluido' ? 'default' : 'secondary'}>
                                {analise.status || 'concluído'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date().toLocaleString('pt-PT')}
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {analise.dados_extraidos && Object.keys(analise.dados_extraidos).length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-primary" />
                                  Dados Extraídos
                                </p>
                                <div className="space-y-2">
                                  {Object.entries(analise.dados_extraidos).map(([key, value]: [string, any]) => (
                                    <div key={key} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                                      <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-wide">{key.replace(/_/g, ' ')}</p>
                                      <p className="text-sm text-foreground/90">
                                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {analise.divergencias && analise.divergencias.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-3 flex items-center gap-2 text-destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  Divergências Encontradas
                                </p>
                                <div className="space-y-3">
                                  {analise.divergencias.map((div: any, divIdx: number) => (
                                    <div key={divIdx} className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                                      {typeof div === 'object' && div !== null ? (
                                        <div className="space-y-2">
                                          {div.campo && (
                                            <div>
                                              <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Campo:</span>
                                              <p className="text-sm text-foreground/90 mt-0.5">{div.campo}</p>
                                            </div>
                                          )}
                                          {div.descricao && (
                                            <div>
                                              <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Descrição:</span>
                                              <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed">{div.descricao}</p>
                                            </div>
                                          )}
                                          {div.esperado && (
                                            <div>
                                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Esperado:</span>
                                              <p className="text-sm text-foreground/80 mt-0.5">{div.esperado}</p>
                                            </div>
                                          )}
                                          {div.encontrado && (
                                            <div>
                                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Encontrado:</span>
                                              <p className="text-sm text-foreground/80 mt-0.5">{div.encontrado}</p>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-foreground/90">{String(div)}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {analise.insights && analise.insights.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-3 flex items-center gap-2 text-primary">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Insights e Recomendações
                                </p>
                                <div className="space-y-2">
                                  {analise.insights.map((insight: any, insightIdx: number) => (
                                    <div key={insightIdx} className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                                      {typeof insight === 'object' && insight !== null ? (
                                        <div className="space-y-2">
                                          {Object.entries(insight).map(([key, value]: [string, any]) => (
                                            <div key={key}>
                                              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                                                {key.replace(/_/g, ' ')}:
                                              </span>
                                              <p className="text-sm text-foreground/90 mt-0.5">
                                                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-foreground/90 leading-relaxed">{String(insight)}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ));
                    })()}
                  </div>
                ) : null}
              </div>
            )}
        </CardContent>
      </Card>

      <div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relatorios.map((relatorio, idx) => {
          const Icon = relatorio.icone;
          return null;
        })}
        </div>
      </div>

      <Card>
        
        
      </Card>
    </div>;
};
export default Relatorios;