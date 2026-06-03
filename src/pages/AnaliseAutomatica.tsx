import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Brain, Sparkles, CheckCircle2, Clock, Users, Download, Loader2, MessageSquare, Send } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from "jspdf";
import { useTranslations } from "@/hooks/useTranslations";
import { useLocale } from "@/context/LocaleProvider";
interface Analise {
  resumo: string;
  fases: Array<{
    nome: string;
    descricao: string;
    duracao_estimada: string;
  }>;
  equipe: {
    tamanho_recomendado: string;
    perfis: string[];
  };
  atividades: Array<{
    titulo: string;
    descricao: string;
    prioridade: string;
  }>;
  cronograma: {
    duracao_total: string;
    marcos: string[];
  };
  recursos: {
    humanos: string;
    tecnologicos: string;
    financeiros: string;
  };
  riscos: Array<{
    descricao: string;
    impacto: string;
    mitigacao: string;
  }>;
  recomendacoes: string[];
}
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
interface Projeto {
  id: string;
  nome: string;
  descricao: string | null;
}
const AnaliseAutomatica = () => {
  const t = useTranslations();
  const {
    locale
  } = useLocale();
  const [descricao, setDescricao] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);

  // Chat states
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMensagem, setInputMensagem] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetchProjetos();
  }, []);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [chatMessages]);
  const fetchProjetos = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('projetos').select('id, nome, descricao').eq('ativo', true).order('nome');
      if (error) throw error;
      setProjetos(data || []);
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      toast.error('Erro ao carregar projetos');
    }
  };
  const handleAnalyze = async () => {
    if (!descricao.trim()) {
      toast.error(t.analysis.addDescriptionError);
      return;
    }
    setIsAnalyzing(true);
    setAnalise(null);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('analisar-projeto', {
        body: {
          descricao,
          locale: locale
        }
      });
      if (error) throw error;
      if (!data.success) {
        toast.error(data.error || t.analysis.analysisError);
        return;
      }
      setAnalise(data.analise);
      setShowCongrats(true);
    } catch (error: any) {
      console.error('Erro ao analisar projeto:', error);
      toast.error(error.message || t.analysis.analysisError);
    } finally {
      setIsAnalyzing(false);
    }
  };
  const handleEnviarPergunta = async () => {
    if (!inputMensagem.trim()) {
      toast.error('Digite uma pergunta');
      return;
    }
    if (!projetoSelecionado) {
      toast.error('Selecione um projeto primeiro');
      return;
    }
    const novaMensagemUser: ChatMessage = {
      role: 'user',
      content: inputMensagem,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, novaMensagemUser]);
    setInputMensagem("");
    setIsLoadingChat(true);
    try {
      // Fetch document URLs from projeto_anexos table
      const { data: anexos, error: anexosError } = await supabase
        .from('projeto_anexos')
        .select('url')
        .eq('projeto_id', projetoSelecionado);

      if (anexosError) {
        console.error('Erro ao buscar anexos:', anexosError);
        throw new Error('Erro ao buscar documentos do projeto');
      }

      const documentUrls = anexos?.map(anexo => anexo.url) || [];
      
      console.log('Enviando para n8n via edge function:', { documentUrls, question: inputMensagem });

      // Send to n8n via edge function proxy
      const { data, error } = await supabase.functions.invoke('n8n-chat-proxy', {
        body: {
          documentUrls,
          question: inputMensagem
        }
      });

      if (error) {
        console.error('Erro da edge function:', error);
        throw new Error('Erro ao comunicar com o servidor');
      }
      
      if (data.status === 'error') {
        throw new Error(data.error || 'Erro ao processar pergunta');
      }

      const novaMensagemAssistant: ChatMessage = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, novaMensagemAssistant]);
    } catch (error: any) {
      console.error('Erro ao enviar pergunta:', error);
      toast.error(error.message || 'Erro ao processar pergunta');
      const mensagemErro: ChatMessage = {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, mensagemErro]);
    } finally {
      setIsLoadingChat(false);
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviarPergunta();
    }
  };
  const exportToPDF = () => {
    if (!analise) return;
    const doc = new jsPDF();
    let yPos = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    const addText = (text: string, fontSize = 12, isBold = false) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, 180);
      doc.text(lines, 15, yPos);
      yPos += lines.length * lineHeight;
    };
    addText(t.analysis.pdfTitle, 18, true);
    yPos += 5;
    addText(t.analysis.executiveSummary, 14, true);
    addText(analise.resumo);
    yPos += 5;
    if (analise.fases?.length) {
      addText(t.analysis.projectPhases, 14, true);
      analise.fases.forEach((fase, idx) => {
        addText(`${idx + 1}. ${fase.nome}`, 12, true);
        addText(fase.descricao);
        addText(`${t.analysis.duration}: ${fase.duracao_estimada}`, 10);
        yPos += 3;
      });
    }
    if (analise.equipe) {
      addText(t.analysis.recommendedTeam, 14, true);
      addText(`${t.analysis.teamSize}: ${analise.equipe.tamanho_recomendado}`);
      if (analise.equipe.perfis?.length) {
        addText(`${t.analysis.profiles}: ${analise.equipe.perfis.join(", ")}`);
      }
      yPos += 5;
    }
    if (analise.atividades?.length) {
      addText(t.analysis.recommendedActivities, 14, true);
      analise.atividades.forEach((ativ, idx) => {
        addText(`${idx + 1}. ${ativ.titulo} [${ativ.prioridade}]`, 12, true);
        addText(ativ.descricao);
        yPos += 3;
      });
    }
    if (analise.cronograma) {
      addText(t.analysis.schedule, 14, true);
      addText(`${t.analysis.totalDuration}: ${analise.cronograma.duracao_total}`);
      if (analise.cronograma.marcos?.length) {
        addText(t.analysis.mainMilestones);
        analise.cronograma.marcos.forEach(marco => addText(`• ${marco}`, 10));
      }
      yPos += 5;
    }
    if (analise.recursos) {
      addText(t.analysis.requiredResources, 14, true);
      if (analise.recursos.humanos) addText(`${t.analysis.humanResources}: ${analise.recursos.humanos}`);
      if (analise.recursos.tecnologicos) addText(`${t.analysis.technologicalResources}: ${analise.recursos.tecnologicos}`);
      if (analise.recursos.financeiros) addText(`${t.analysis.financialResources}: ${analise.recursos.financeiros}`);
      yPos += 5;
    }
    if (analise.riscos?.length) {
      addText(t.analysis.risksAndMitigations, 14, true);
      analise.riscos.forEach((risco, idx) => {
        addText(`${idx + 1}. ${risco.descricao} [${t.analysis.impact}: ${risco.impacto}]`, 12, true);
        addText(`${t.analysis.mitigation}: ${risco.mitigacao}`);
        yPos += 3;
      });
    }
    if (analise.recomendacoes?.length) {
      addText(t.analysis.finalRecommendations, 14, true);
      analise.recomendacoes.forEach((rec, idx) => {
        addText(`${idx + 1}. ${rec}`);
      });
    }
    doc.save("analise-projeto.pdf");
    toast.success(t.analysis.pdfExported);
  };
  return <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{t.analysis.title}</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">{t.analysis.description}</p>
      </div>

      <Tabs defaultValue="descricao" className="w-full">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-2">
            <TabsTrigger value="descricao" className="text-xs sm:text-sm whitespace-nowrap">
              <Brain className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Análise por Descrição</span>
              <span className="xs:hidden">Descrição</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs sm:text-sm whitespace-nowrap">
              <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Chat com IA</span>
              <span className="xs:hidden">Chat IA</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="descricao" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
            <Card className="lg:col-span-2 flex flex-col">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  {t.analysis.describeProject}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t.analysis.describeProjectSubtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                <div>
                  <Label htmlFor="descricao" className="text-sm">{t.analysis.projectDescription}</Label>
                  <Textarea id="descricao" placeholder={t.analysis.projectDescriptionPlaceholder} className="min-h-[150px] sm:min-h-[200px] text-sm" value={descricao} onChange={e => setDescricao(e.target.value)} />
                </div>
                <Button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center gap-2 w-full sm:w-auto" size="sm">
                  {isAnalyzing ? <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.analysis.analyzing}
                    </> : <>
                      <Sparkles className="h-4 w-4" />
                      {t.analysis.analyzeProject}
                    </>}
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">{t.analysis.whatAiSuggests}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted-foreground">
                  {[1, 2, 3, 4, 5, 6].map(num => <li key={num} className="flex items-start gap-2">
                      <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-primary">{num}</span>
                      </div>
                      <span>{t.analysis[`suggestion${num}` as keyof typeof t.analysis]}</span>
                    </li>)}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <Card className="h-[400px] sm:h-[500px] flex flex-col">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Chat com IA sobre Projetos
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Selecione um projeto e faça perguntas sobre seus dados e documentos
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
              <div>
                <Label>Selecione um Projeto</Label>
                <Select value={projetoSelecionado} onValueChange={value => {
                setProjetoSelecionado(value);
                setChatMessages([]);
              }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um projeto..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {projetos.map(projeto => <SelectItem key={projeto.id} value={projeto.id}>
                        {projeto.nome}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {projetoSelecionado && <>
                  <ScrollArea className="flex-1 border rounded-lg p-4 min-h-0">
                    <div className="space-y-4 pr-4">
                      {chatMessages.length === 0 && <div className="text-center py-12 text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">Faça uma pergunta sobre o projeto</p>
                          
                        </div>}
                      
                      {chatMessages.map((msg, idx) => <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-lg p-3 break-words ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {msg.timestamp.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                            </p>
                          </div>
                        </div>)}
                      
                      {isLoadingChat && <div className="flex justify-start">
                          <div className="max-w-[85%] rounded-lg p-3 bg-muted">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Analisando...</span>
                            </div>
                          </div>
                        </div>}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2 items-end shrink-0">
                    <div className="flex-1">
                      <Textarea placeholder="Digite sua pergunta sobre o projeto..." value={inputMensagem} onChange={e => setInputMensagem(e.target.value)} onKeyDown={handleKeyPress} className="min-h-[44px] max-h-[100px] resize-none" disabled={isLoadingChat} rows={1} />
                    </div>
                    <Button onClick={handleEnviarPergunta} disabled={isLoadingChat || !inputMensagem.trim()} size="default" className="h-[44px] px-4 shrink-0">
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </Button>
                  </div>
                </>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isAnalyzing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Brain className="h-16 w-16 text-primary animate-pulse" />
                  <Sparkles className="h-8 w-8 text-primary absolute -top-2 -right-2 animate-spin" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {t.analysis.analyzingProject}
                </span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-center space-y-3 pt-4">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>{t.analysis.aiStudying}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t.analysis.creatingEverything}</p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={showCongrats} onOpenChange={setShowCongrats}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-12 w-12 text-primary animate-bounce" />
                  </div>
                  <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
                  <Sparkles className="h-4 w-4 text-primary absolute -bottom-1 -left-1 animate-pulse" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {t.analysis.congratulations}
                </span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-2">
              <p className="text-lg font-semibold text-foreground">{t.analysis.congratsMessage}</p>
              <p className="text-sm text-muted-foreground">{t.analysis.congratsSubtitle}</p>
              <Button onClick={() => setShowCongrats(false)} className="w-full">
                {t.analysis.viewAnalysis}
              </Button>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Analysis Results */}
      {analise && <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={exportToPDF} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              {t.analysis.exportPdf}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.analysis.executiveSummary}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{analise.resumo}</p>
            </CardContent>
          </Card>

          {analise.fases && analise.fases.length > 0 && <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  {t.analysis.projectPhases}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analise.fases.map((fase, idx) => <div key={idx} className="border-l-4 border-primary pl-4">
                      <h4 className="font-semibold">{fase.nome}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{fase.descricao}</p>
                      <p className="text-xs text-primary mt-2">{t.analysis.duration}: {fase.duracao_estimada}</p>
                    </div>)}
                </div>
              </CardContent>
            </Card>}

          {analise.equipe && <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {t.analysis.recommendedTeam}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold mb-3">{t.analysis.teamSize}: {analise.equipe.tamanho_recomendado}</p>
                {analise.equipe.perfis && analise.equipe.perfis.length > 0 && <div className="flex flex-wrap gap-2">
                    {analise.equipe.perfis.map((perfil, idx) => <Badge key={idx} variant="secondary">{perfil}</Badge>)}
                  </div>}
              </CardContent>
            </Card>}

          {analise.atividades && analise.atividades.length > 0 && <Card>
              <CardHeader>
                <CardTitle>{t.analysis.recommendedActivities}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analise.atividades.map((atividade, idx) => <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{atividade.titulo}</h4>
                          <Badge variant={atividade.prioridade === 'alta' ? 'destructive' : atividade.prioridade === 'media' ? 'default' : 'secondary'}>
                            {atividade.prioridade}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{atividade.descricao}</p>
                      </div>
                    </div>)}
                </div>
              </CardContent>
            </Card>}

          {analise.cronograma && <Card>
              <CardHeader>
                <CardTitle>{t.analysis.schedule}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold mb-3">{t.analysis.totalDuration}: {analise.cronograma.duracao_total}</p>
                {analise.cronograma.marcos && analise.cronograma.marcos.length > 0 && <div>
                    <h4 className="text-sm font-semibold mb-2">{t.analysis.mainMilestones}:</h4>
                    <ul className="space-y-1">
                      {analise.cronograma.marcos.map((marco, idx) => <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          {marco}
                        </li>)}
                    </ul>
                  </div>}
              </CardContent>
            </Card>}

          {analise.recursos && <Card>
              <CardHeader>
                <CardTitle>{t.analysis.requiredResources}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analise.recursos.humanos && <div>
                    <h4 className="font-semibold text-sm mb-1">{t.analysis.humanResources}</h4>
                    <p className="text-sm text-muted-foreground">{analise.recursos.humanos}</p>
                  </div>}
                {analise.recursos.tecnologicos && <div>
                    <h4 className="font-semibold text-sm mb-1">{t.analysis.technologicalResources}</h4>
                    <p className="text-sm text-muted-foreground">{analise.recursos.tecnologicos}</p>
                  </div>}
                {analise.recursos.financeiros && <div>
                    <h4 className="font-semibold text-sm mb-1">{t.analysis.financialResources}</h4>
                    <p className="text-sm text-muted-foreground">{analise.recursos.financeiros}</p>
                  </div>}
              </CardContent>
            </Card>}

          {analise.riscos && analise.riscos.length > 0 && <Card>
              <CardHeader>
                <CardTitle>{t.analysis.risksAndMitigations}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analise.riscos.map((risco, idx) => <div key={idx} className="border-l-4 border-destructive pl-4">
                      <h4 className="font-semibold">{risco.descricao}</h4>
                      <p className="text-sm text-destructive mt-1">{t.analysis.impact}: {risco.impacto}</p>
                      <p className="text-sm text-muted-foreground mt-2">{t.analysis.mitigation}: {risco.mitigacao}</p>
                    </div>)}
                </div>
              </CardContent>
            </Card>}

          {analise.recomendacoes && analise.recomendacoes.length > 0 && <Card>
              <CardHeader>
                <CardTitle>{t.analysis.finalRecommendations}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analise.recomendacoes.map((rec, idx) => <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{rec}</span>
                    </li>)}
                </ul>
              </CardContent>
            </Card>}
        </div>}
    </div>;
};
export default AnaliseAutomatica;