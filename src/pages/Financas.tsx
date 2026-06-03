import { useState, useEffect } from "react";
import { Plus, Search, FileText, AlertCircle, CheckCircle, Upload, Loader2, Paperclip, MessageSquare, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/hooks/useTranslations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Financas = () => {
  const { toast } = useToast();
  const t = useTranslations();
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [faturas, setFaturas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [extractedData, setExtractedData] = useState<{
    numero?: string;
    valor?: number;
    descricao?: string;
    data_emissao?: string;
  }>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedPublicUrl, setUploadedPublicUrl] = useState<string>("");
  const [uploadedStoragePath, setUploadedStoragePath] = useState<string>("");
  const [formData, setFormData] = useState({
    projeto_id: "",
    atividade_id: "",
  });
  const [atividades, setAtividades] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reciboValor, setReciboValor] = useState<{ [key: string]: string }>({});
  const [reciboJustificacao, setReciboJustificacao] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.projeto_id) {
      fetchAtividades(formData.projeto_id);
    }
  }, [formData.projeto_id]);

  const fetchData = async () => {
    try {
      const [projetosData, faturasData] = await Promise.all([
        supabase.from('projetos').select('*'),
        supabase
          .from('faturas')
          .select(`
            *,
            projeto:projetos(nome),
            atividade:atividades(nome),
            recibos(*)
          `)
          .order('created_at', { ascending: false })
      ]);

      if (projetosData.error) throw projetosData.error;
      if (faturasData.error) throw faturasData.error;

      setProjetos(projetosData.data || []);
      setFaturas(faturasData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAtividades = async (projetoId: string) => {
    try {
      const { data, error } = await supabase
        .from('atividades')
        .select('*')
        .eq('projeto_id', projetoId);

      if (error) throw error;
      setAtividades(data || []);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    }
  };

  const calcularResumo = () => {
    const orcamentoTotal = projetos.reduce((acc, p) => acc + (Number(p.orcamento) || 0), 0);
    const gastoTotal = faturas
      .filter(f => f.status === 'aprovada')
      .reduce((acc, f) => acc + (Number(f.valor) || 0), 0);
    const percentagemGasta = orcamentoTotal > 0 ? Math.round((gastoTotal / orcamentoTotal) * 100) : 0;
    const faturasPendentes = faturas.filter(f => f.status === 'pendente').length;

    return { orcamentoTotal, gastoTotal, percentagemGasta, faturasPendentes };
  };

  const resumoFinanceiro = calcularResumo();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!formData.projeto_id) {
      toast({
        title: "Selecione o projeto",
        description: "Escolha o projeto antes de anexar a fatura.",
        variant: "destructive",
      });
      e.currentTarget.value = "";
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O ficheiro ultrapassa 20MB. Compacte ou recorte e tente novamente.",
        variant: "destructive",
      });
      e.currentTarget.value = "";
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);

    try {
      // 1) Fazer upload primeiro e enviar apenas a URL pública para a função (evita erro de memória)
      const ts = Date.now();
      const safeName = file.name.replace(/\s+/g, "_");
      const storagePath = `${formData.projeto_id}/tmp/${ts}-${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from('faturas')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: pub } = supabase.storage
        .from('faturas')
        .getPublicUrl(storagePath);

      const publicUrl = pub.publicUrl;
      setUploadedPublicUrl(publicUrl);
      setUploadedStoragePath(storagePath);

      // 2) Pedir à função para classificar e extrair via URL
      const { data, error } = await supabase.functions.invoke('extrair-dados-fatura', {
        body: {
          fileUrl: publicUrl,
          fileName: file.name,
          mimeType: file.type || ''
        }
      });

      if (error) throw error;

      if (data?.success) {
        setExtractedData(data.data);
        toast({ title: "Sucesso", description: "Dados extraídos da fatura com sucesso!" });
      } else {
        const msg = data?.error || 'Não foi possível extrair os dados.';
        toast({ title: "Documento inválido", description: msg, variant: "destructive" });
        // Limpar upload temporário se falhou
        if (uploadedStoragePath) {
          await supabase.storage.from('faturas').remove([uploadedStoragePath]);
        }
      }
    } catch (error: any) {
      console.error('Erro:', error);
      
      let errorMsg = "Erro ao extrair dados da fatura";
      if (error?.message?.includes('429')) {
        errorMsg = "Muitas requisições. Aguarde um momento e tente novamente.";
      } else if (error?.message?.includes('402')) {
        errorMsg = "Créditos de IA esgotados. Contacte o administrador.";
      }
      
      toast({
        title: "Erro",
        description: errorMsg,
        variant: "destructive",
      });
      
      // Limpar upload temporário se falhou
      if (uploadedStoragePath) {
        await supabase.storage.from('faturas').remove([uploadedStoragePath]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitFatura = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !formData.projeto_id) {
      toast({
        title: "Erro",
        description: "Selecione o projeto e anexe a fatura.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Upload do arquivo para storage (reutiliza upload anterior se já existir)
      let publicUrl = uploadedPublicUrl;
      if (!publicUrl) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${formData.projeto_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('faturas')
          .upload(filePath, selectedFile);
        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage
          .from('faturas')
          .getPublicUrl(filePath);
        publicUrl = pub.publicUrl;
      }


      // Buscar orçamento do projeto e calcular orçamento restante
      const { data: projetoData } = await supabase
        .from('projetos')
        .select('orcamento')
        .eq('id', formData.projeto_id)
        .single();

      const { data: faturasAprovadas } = await supabase
        .from('faturas')
        .select('valor')
        .eq('projeto_id', formData.projeto_id)
        .eq('status', 'aprovada');

      const orcamentoTotal = Number(projetoData?.orcamento) || 0;
      const gastoTotal = faturasAprovadas?.reduce((acc, f) => acc + Number(f.valor || 0), 0) || 0;
      const orcamentoRestante = orcamentoTotal - gastoTotal;
      const valorFatura = Number(extractedData.valor) || 0;
      
      let status = 'pendente';
      let motivoRejeicao = null;

      if (valorFatura > orcamentoRestante) {
        status = 'fora_orcamento';
        motivoRejeicao = `Valor da fatura (${valorFatura.toLocaleString('pt-MZ')} MZN) excede o orçamento restante (${orcamentoRestante.toLocaleString('pt-MZ')} MZN de ${orcamentoTotal.toLocaleString('pt-MZ')} MZN)`;
      }

      // Buscar dados da atividade selecionada
      let atividadeDescricao = null;
      let atividadeOrcamento = null;
      
      if (formData.atividade_id) {
        const { data: atividadeData } = await supabase
          .from('atividades')
          .select('descricao, orcamento')
          .eq('id', formData.atividade_id)
          .single();
        
        if (atividadeData) {
          atividadeDescricao = atividadeData.descricao;
          atividadeOrcamento = atividadeData.orcamento;
        }
      }

      // Inserir fatura no banco
      const { data: user } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('faturas')
        .insert({
          numero: extractedData.numero || `FT-${Date.now()}`,
          projeto_id: formData.projeto_id,
          atividade_id: formData.atividade_id || null,
          descricao: extractedData.descricao,
          valor: valorFatura,
          arquivo_url: publicUrl,
          arquivo_nome: selectedFile.name,
          data_emissao: extractedData.data_emissao || new Date().toISOString().split('T')[0],
          status,
          motivo_rejeicao: motivoRejeicao,
          created_by: user.user?.id,
        });

      if (insertError) throw insertError;

      toast({
        title: status === 'fora_orcamento' ? "Fatura fora do orçamento" : "Sucesso",
        description: status === 'fora_orcamento' 
          ? motivoRejeicao 
          : "Fatura registada e pendente de aprovação",
        variant: status === 'fora_orcamento' ? "destructive" : "default",
      });

      setDialogOpen(false);
      setSelectedFile(null);
      setExtractedData({});
      setFormData({ projeto_id: "", atividade_id: "" });
      fetchData();

    } catch (error) {
      console.error('Erro ao submeter fatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao registar fatura",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pendente') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 gap-1">
          <AlertCircle className="h-3 w-3" />
          {t.finances.pendingApproval}
        </Badge>
      );
    }
    if (status === 'aprovada') {
      return (
        <Badge className="bg-green-100 text-green-800 gap-1">
          <CheckCircle className="h-3 w-3" />
          {t.finances.approved}
        </Badge>
      );
    }
    if (status === 'fora_orcamento') {
      return (
        <Badge className="bg-red-100 text-red-800 gap-1">
          <AlertCircle className="h-3 w-3" />
          {t.finances.outOfBudget}
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-800 gap-1">
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{t.finances.title}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t.finances.title}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto" size="sm">
              <Plus className="h-4 w-4" />
              {t.finances.newInvoice}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.finances.newInvoice}</DialogTitle>
              <DialogDescription>{t.finances.invoices}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitFatura} className="space-y-4">
              <div>
                <Label htmlFor="anexo">{t.finances.attachInvoice}</Label>
                <div className="relative">
                  <Input 
                    id="anexo" 
                    type="file" 
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" 
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                    required
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center gap-2 rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{t.finances.extractingData}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isProcessing ? t.finances.extractingData : t.finances.dataExtractedAuto}
                </p>
              </div>

              {extractedData.numero && (
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <p className="text-sm font-semibold">{t.finances.extractedData}</p>
                  <div className="text-xs space-y-1">
                    <p><strong>{t.finances.number}:</strong> {extractedData.numero}</p>
                    <p><strong>{t.finances.value}:</strong> {extractedData.valor?.toLocaleString('pt-MZ')} MZN</p>
                    <p><strong>{t.finances.date}:</strong> {extractedData.data_emissao}</p>
                    {extractedData.descricao && <p><strong>{t.common.description}:</strong> {extractedData.descricao}</p>}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="projeto">{t.finances.project}</Label>
                <Select 
                  value={formData.projeto_id} 
                  onValueChange={(value) => setFormData({ ...formData, projeto_id: value, atividade_id: "" })}
                  disabled={isProcessing}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.finances.selectProject} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {projetos.map((projeto) => (
                      <SelectItem key={projeto.id} value={projeto.id}>
                        {projeto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="atividade">{t.finances.rubric}</Label>
                <Select 
                  value={formData.atividade_id}
                  onValueChange={(value) => setFormData({ ...formData, atividade_id: value })}
                  disabled={isProcessing || !formData.projeto_id}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.finances.selectActivity} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {atividades.map((atividade) => (
                      <SelectItem key={atividade.id} value={atividade.id}>
                        {atividade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isProcessing}
                  onClick={() => setDialogOpen(false)}
                >
                  {t.finances.cancel}
                </Button>
                <Button type="submit" disabled={isProcessing || !selectedFile}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.finances.processing}
                    </>
                  ) : (
                    t.finances.registerInvoice
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.finances.totalBudget}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <p className="text-lg sm:text-2xl font-bold">{resumoFinanceiro.orcamentoTotal.toLocaleString('pt-MZ')} <span className="text-xs sm:text-sm font-normal">MZN</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t.finances.totalSpent}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <p className="text-lg sm:text-2xl font-bold">{resumoFinanceiro.gastoTotal.toLocaleString('pt-MZ')} <span className="text-xs sm:text-sm font-normal">MZN</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t.finances.percentSpent}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <p className="text-lg sm:text-2xl font-bold">{resumoFinanceiro.percentagemGasta}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{t.finances.pendingInvoices}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <p className="text-lg sm:text-2xl font-bold">{resumoFinanceiro.faturasPendentes}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.finances.searchInvoices}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-4">
        {faturas.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t.finances.noInvoicesRegistered}
            </CardContent>
          </Card>
        ) : (
          faturas.map((fatura) => (
            <Card key={fatura.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{fatura.numero}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {fatura.projeto?.nome} • {fatura.atividade?.nome}
                    </p>
                  </div>
                  {getStatusBadge(fatura.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fatura.descricao && (
                  <p className="text-sm text-muted-foreground">{fatura.descricao}</p>
                )}
                {fatura.motivo_rejeicao && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-800 dark:text-red-200">{fatura.motivo_rejeicao}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    {new Date(fatura.data_emissao).toLocaleDateString('pt-PT')}
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {Number(fatura.valor).toLocaleString('pt-MZ')} MZN
                  </span>
                </div>

                {/* Seção de Recibos */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      {t.finances.receipts} ({fatura.recibos?.length || 0})
                    </h4>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-2">
                        <Upload className="h-3 w-3" />
                        {t.finances.addReceipt}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t.finances.addReceipt} - {fatura.numero}</DialogTitle>
                      </DialogHeader>
                      <form className="space-y-4">
                        <div>
                          <Label htmlFor={`recibo-file-${fatura.id}`}>{t.finances.receiptFile}</Label>
                          <Input 
                            id={`recibo-file-${fatura.id}`}
                            type="file" 
                            accept=".pdf,.png,.jpg,.jpeg" 
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`recibo-valor-${fatura.id}`}>{t.finances.receiptValue}</Label>
                          <Input 
                            id={`recibo-valor-${fatura.id}`}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={reciboValor[fatura.id] || ""}
                            onChange={(e) => setReciboValor(prev => ({ ...prev, [fatura.id]: e.target.value }))}
                          />
                        </div>

                        {reciboValor[fatura.id] && parseFloat(reciboValor[fatura.id]) !== fatura.valor && (
                          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                                  {t.finances.valueDifferent}
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                  {t.finances.invoiceValue}: {fatura.valor.toLocaleString('pt-MZ')} MZN | 
                                  {t.finances.receiptValueLabel}: {parseFloat(reciboValor[fatura.id]).toLocaleString('pt-MZ')} MZN | 
                                  {t.finances.difference}: {Math.abs(fatura.valor - parseFloat(reciboValor[fatura.id])).toLocaleString('pt-MZ')} MZN
                                </p>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor={`recibo-justificacao-${fatura.id}`}>
                                {t.finances.justificationRequired}
                              </Label>
                              <Textarea 
                                id={`recibo-justificacao-${fatura.id}`}
                                placeholder={t.finances.justificationPlaceholder}
                                rows={3}
                                value={reciboJustificacao[fatura.id] || ""}
                                onChange={(e) => setReciboJustificacao(prev => ({ ...prev, [fatura.id]: e.target.value }))}
                                required
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <Label htmlFor={`recibo-comentario-${fatura.id}`}>{t.finances.comment}</Label>
                          <Textarea 
                            id={`recibo-comentario-${fatura.id}`}
                            placeholder={t.finances.commentPlaceholder}
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="button" variant="outline">{t.finances.cancel}</Button>
                          <Button 
                            type="submit"
                            disabled={
                              !reciboValor[fatura.id] || 
                              (parseFloat(reciboValor[fatura.id]) !== fatura.valor && !reciboJustificacao[fatura.id])
                            }
                          >
                            {t.finances.addReceipt}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {fatura.recibos && fatura.recibos.length > 0 ? (
                  <div className="space-y-2">
                    {fatura.recibos.map((recibo: any) => (
                      <div 
                        key={recibo.id} 
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                      >
                        <Paperclip className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{recibo.arquivo_nome}</p>
                            <Badge variant="secondary" className="text-xs">
                              {new Date(recibo.created_at).toLocaleDateString('pt-PT')}
                            </Badge>
                          </div>
                          <p className="text-xs font-semibold text-foreground">
                            {t.finances.value}: {Number(recibo.valor).toLocaleString('pt-MZ')} MZN
                            {Number(recibo.valor) !== Number(fatura.valor) && (
                              <Badge variant="outline" className="ml-2 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                {t.finances.difference}: {Math.abs(Number(fatura.valor) - Number(recibo.valor)).toLocaleString('pt-MZ')} MZN
                              </Badge>
                            )}
                          </p>
                          {recibo.justificacao_diferenca && (
                            <div className="flex gap-2 items-start bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded border border-amber-100 dark:border-amber-900">
                              <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-500 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-amber-900 dark:text-amber-100">{t.finances.justification}:</p>
                                <p className="text-xs text-amber-700 dark:text-amber-300">{recibo.justificacao_diferenca}</p>
                              </div>
                            </div>
                          )}
                          {recibo.comentario && (
                            <div className="flex gap-2 items-start">
                              <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5" />
                              <p className="text-xs text-muted-foreground">{recibo.comentario}</p>
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="ghost">
                          <FileText className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/30">
                    {t.finances.noReceiptsAdded}
                  </p>
                )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Financas;