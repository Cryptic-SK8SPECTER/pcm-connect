import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Search, Calendar, User, TrendingUp, MapPin, ChevronDown, ChevronRight, ChevronLeft, Edit, ListChecks, X, CheckCircle2, ExternalLink, FileText, AlertCircle, CheckCircle, Upload, Loader2, Paperclip, MessageSquare, AlertTriangle, DollarSign, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LocationMapPicker } from "@/components/LocationMapPicker";
import { useTranslations } from "@/hooks/useTranslations";
const ProjetoDetalhes = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const t = useTranslations();

  // Helper function to open files in new tab
  const handleDownloadFile = (url: string, fileName: string) => {
    // Corrigir URLs antigas que não têm /public/ no caminho
    let correctedUrl = url;
    if (url.includes('/storage/v1/object/faturas/') && !url.includes('/public/')) {
      correctedUrl = url.replace('/storage/v1/object/faturas/', '/storage/v1/object/public/faturas/');
    }
    window.open(correctedUrl, "_blank");
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedAtividade, setExpandedAtividade] = useState<string | null>(null);
  const [selectedResponsaveis, setSelectedResponsaveis] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
  const [selectedAtividadeId, setSelectedAtividadeId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<any>(null);
  const [isEditProjetoDialogOpen, setIsEditProjetoDialogOpen] = useState(false);
  const [formProjeto, setFormProjeto] = useState({
    nome: "",
    descricao: "",
    data_inicio: "",
    data_fim: "",
    orcamento: "",
    status: "planejamento",
    localizacao: "",
    latitude: null as number | null,
    longitude: null as number | null,
    cor: "#3B82F6"
  });
  const [projeto, setProjeto] = useState<any>(null);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [equipas, setEquipas] = useState<any[]>([]);
  const [formAtividade, setFormAtividade] = useState({
    nome: "",
    descricao: "",
    data_inicio: "",
    data_fim: "",
    responsavel_id: "",
    status: "pendente",
    prioridade: "media",
    cor: "#10B981",
    orcamento: "",
    financiamento_id: ""
  });
  const [financiamentoSelecionadoAtividade, setFinanciamentoSelecionadoAtividade] = useState<any>(null);
  const [formSubatividade, setFormSubatividade] = useState({
    nome: "",
    descricao: "",
    responsavel_id: ""
  });

  // Estados para Finanças
  const [faturas, setFaturas] = useState<any[]>([]);
  const [isLoadingFaturas, setIsLoadingFaturas] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formDataFatura, setFormDataFatura] = useState({
    atividade_id: "",
    valor: "",
    descricao: ""
  });
  const [querTraduzirFatura, setQuerTraduzirFatura] = useState(false);
  const [linguaSelecionada, setLinguaSelecionada] = useState("");
  const [isDialogFaturaOpen, setIsDialogFaturaOpen] = useState(false);
  const [isDialogReciboOpen, setIsDialogReciboOpen] = useState<string | null>(null);
  const [isConfirmExceedBudget, setIsConfirmExceedBudget] = useState(false);
  const [exceedBudgetData, setExceedBudgetData] = useState<{
    valorFatura: number;
    orcamentoRestante: number;
    orcamentoTotal: number;
    tipo: 'projeto' | 'atividade';
    nomeAtividade?: string;
  } | null>(null);
  const [formDataRecibo, setFormDataRecibo] = useState({
    valor: "",
    justificacao: "",
    comentario: "",
    arquivo: null as File | null
  });
  const [webhookResponse, setWebhookResponse] = useState<any>(null);
  const [isConfirmSaldoInsuficiente, setIsConfirmSaldoInsuficiente] = useState(false);
  const [faturaDetalhes, setFaturaDetalhes] = useState<any>(null);
  const [itensFatura, setItensFatura] = useState<any[]>([]);
  const [isLoadingItensFatura, setIsLoadingItensFatura] = useState(false);
  
  // Estados para tradução de fatura
  const [isDialogTraduzirOpen, setIsDialogTraduzirOpen] = useState<string | null>(null);
  const [linguaTraduzir, setLinguaTraduzir] = useState("");
  const [isTraduzindo, setIsTraduzindo] = useState(false);
  
  // Estados para Equipas
  const [projetoEquipas, setProjetoEquipas] = useState<any[]>([]);
  const [availableEquipas, setAvailableEquipas] = useState<any[]>([]);
  const [isDialogEquipaOpen, setIsDialogEquipaOpen] = useState(false);
  
  // Estados para Documentos/Anexos
  const [projetoAnexos, setProjetoAnexos] = useState<any[]>([]);
  const [isDialogAnexoOpen, setIsDialogAnexoOpen] = useState(false);
  const [selectedAnexoFile, setSelectedAnexoFile] = useState<File | null>(null);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [formDataAnexo, setFormDataAnexo] = useState({
    descricao: ""
  });
  const [currentPageAnexos, setCurrentPageAnexos] = useState(1);
  const anexosPerPage = 8;
  const [isDialogNovaEquipaOpen, setIsDialogNovaEquipaOpen] = useState(false);
  const [isDialogMembrosOpen, setIsDialogMembrosOpen] = useState<string | null>(null);
  const [selectedEquipaMembers, setSelectedEquipaMembers] = useState<any[]>([]);
  const [formEquipa, setFormEquipa] = useState({ nome: "", descricao: "" });
  const [selectedEquipaId, setSelectedEquipaId] = useState<string>("");
  const [newMemberId, setNewMemberId] = useState<string>("");
  const [newMembroFuncao, setNewMembroFuncao] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Estados para Financiamentos
  const [financiamentos, setFinanciamentos] = useState<any[]>([]);
  const [isDialogFinanciamentoOpen, setIsDialogFinanciamentoOpen] = useState(false);
  const [isEditFinanciamentoOpen, setIsEditFinanciamentoOpen] = useState(false);
  const [editingFinanciamento, setEditingFinanciamento] = useState<any>(null);
  const [formFinanciamento, setFormFinanciamento] = useState({
    nome: "",
    descricao: "",
    valor_total: ""
  });
  const [totalFinanciadoColaborador, setTotalFinanciadoColaborador] = useState<number>(0);
  
  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (id && userRole) {
      fetchProjetoDetalhes();
      fetchTotalFinanciadoColaborador();
    }
  }, [id, userRole]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("role_id, roles(nome)")
        .eq("id", user.id)
        .single();
      
      const roleName = (profile as any)?.roles?.nome;
      setUserRole(roleName);
    } catch (error) {
      console.error("Erro ao buscar role:", error);
    }
  };

  const fetchTotalFinanciadoColaborador = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar atividades onde o usuário é responsável
      const { data: atividadesResponsavel } = await supabase
        .from("atividades")
        .select("id")
        .eq("projeto_id", id)
        .eq("responsavel_id", user.id);

      if (!atividadesResponsavel || atividadesResponsavel.length === 0) {
        setTotalFinanciadoColaborador(0);
        return;
      }

      const atividadeIds = atividadesResponsavel.map(a => a.id);

      // Buscar valores de financiamento alocados para essas atividades
      const { data: financiamentosAlocados } = await supabase
        .from("financiamento_atividades")
        .select("valor_alocado")
        .in("atividade_id", atividadeIds);

      const total = financiamentosAlocados?.reduce((acc, f) => acc + Number(f.valor_alocado || 0), 0) || 0;
      setTotalFinanciadoColaborador(total);
    } catch (error) {
      console.error("Erro ao buscar total financiado do colaborador:", error);
      setTotalFinanciadoColaborador(0);
    }
  };
  const fetchProjetoAnexos = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("projeto_anexos")
        .select("*")
        .eq("projeto_id", id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setProjetoAnexos(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar anexos:", error);
    }
  };

  const handleUploadAnexo = async () => {
    if (!selectedAnexoFile || !id) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo para fazer upload",
        variant: "destructive"
      });
      return;
    }

    setUploadingAnexo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Upload do arquivo para storage
      const fileExt = selectedAnexoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("projeto-documentos")
        .upload(fileName, selectedAnexoFile);

      if (uploadError) throw uploadError;

      // Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from("projeto-documentos")
        .getPublicUrl(fileName);

      // Salvar informações no banco de dados
      const { error: dbError } = await supabase
        .from("projeto_anexos")
        .insert({
          projeto_id: id,
          nome_arquivo: selectedAnexoFile.name,
          url: publicUrl,
          tipo_arquivo: selectedAnexoFile.type || 'application/octet-stream',
          tamanho: selectedAnexoFile.size,
          descricao: formDataAnexo.descricao,
          created_by: user.id
        });

      if (dbError) throw dbError;

      toast({
        title: "Sucesso",
        description: "Documento anexado com sucesso!"
      });

      setIsDialogAnexoOpen(false);
      setSelectedAnexoFile(null);
      setFormDataAnexo({ descricao: "" });
      fetchProjetoAnexos();
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível fazer upload do documento",
        variant: "destructive"
      });
    } finally {
      setUploadingAnexo(false);
    }
  };

  const handleSubmitFinanciamento = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("financiamentos")
        .insert([{
          projeto_id: id,
          nome: formFinanciamento.nome,
          descricao: formFinanciamento.descricao,
          valor_total: Number(formFinanciamento.valor_total),
          valor_disponivel: Number(formFinanciamento.valor_total),
          created_by: user.id
        }]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Financiamento criado com sucesso"
      });

      setIsDialogFinanciamentoOpen(false);
      setFormFinanciamento({ nome: "", descricao: "", valor_total: "" });
      fetchProjetoDetalhes();
    } catch (error: any) {
      console.error("Erro ao criar financiamento:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o financiamento",
        variant: "destructive"
      });
    }
  };

  const handleEditarFinanciamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFinanciamento) return;

    try {
      // Calcular a diferença no valor total
      const diferencaValor = Number(editingFinanciamento.valor_total) - Number(editingFinanciamento.valor_total_original);
      const novoValorDisponivel = Number(editingFinanciamento.valor_disponivel) + diferencaValor;

      // Validar se o novo valor disponível não é negativo
      if (novoValorDisponivel < 0) {
        toast({
          title: "Erro",
          description: "O novo valor total não pode ser menor que o valor já alocado",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from("financiamentos")
        .update({
          nome: editingFinanciamento.nome,
          descricao: editingFinanciamento.descricao,
          valor_total: Number(editingFinanciamento.valor_total),
          valor_disponivel: novoValorDisponivel
        })
        .eq("id", editingFinanciamento.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Financiamento atualizado com sucesso"
      });

      fetchProjetoDetalhes();
      setIsEditFinanciamentoOpen(false);
      setEditingFinanciamento(null);
    } catch (error: any) {
      console.error("Erro ao editar financiamento:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível editar o financiamento",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAnexo = async (anexoId: string, fileName: string) => {
    if (!confirm("Deseja realmente excluir este documento?")) return;

    try {
      // Extrair o caminho do arquivo da URL
      const urlParts = fileName.split('/projeto-documentos/');
      const filePath = urlParts[1] || fileName;

      // Deletar arquivo do storage
      const { error: storageError } = await supabase.storage
        .from("projeto-documentos")
        .remove([filePath]);

      if (storageError) console.error("Erro ao deletar arquivo do storage:", storageError);

      // Deletar registro do banco de dados
      const { error: dbError } = await supabase
        .from("projeto_anexos")
        .delete()
        .eq("id", anexoId);

      if (dbError) throw dbError;

      toast({
        title: "Sucesso",
        description: "Documento excluído com sucesso!"
      });

      fetchProjetoAnexos();
    } catch (error: any) {
      console.error("Erro ao excluir anexo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o documento",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const fetchFaturas = async () => {
    setIsLoadingFaturas(true);
    try {
      const {
        data: faturasData,
        error: faturasError
      } = await (supabase as any).from("faturas").select(`
          *,
          atividade:atividades(nome),
          recibos(*)
        `).eq("projeto_id", id).order("created_at", {
        ascending: false
      });
      if (faturasError) throw faturasError;
      setFaturas(faturasData || []);
    } catch (error) {
      console.error("Erro ao carregar faturas:", error);
    } finally {
      setIsLoadingFaturas(false);
    }
  };

  const handleVerDetalhesFatura = async (fatura: any) => {
    setFaturaDetalhes(fatura);
    setIsLoadingItensFatura(true);
    try {
      const { data: itensData, error: itensError } = await supabase
        .from("itens_fatura")
        .select("*")
        .eq("fatura_id", fatura.id)
        .order("created_at", { ascending: true });
      
      if (itensError) throw itensError;
      setItensFatura(itensData || []);
    } catch (error) {
      console.error("Erro ao carregar itens da fatura:", error);
      setItensFatura([]);
    } finally {
      setIsLoadingItensFatura(false);
    }
  };

  const handleTraduzirFatura = async (fatura: any) => {
    if (!linguaTraduzir) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um idioma.",
        variant: "destructive"
      });
      return;
    }

    if (!fatura.arquivo_url) {
      toast({
        title: "Erro",
        description: "Arquivo da fatura não encontrado.",
        variant: "destructive"
      });
      return;
    }

    setIsTraduzindo(true);
    try {
      const [langCode, langName] = linguaTraduzir.split("|");
      
      // Chamar edge function com visão para ler a fatura original
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/traduzir-fatura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          arquivoUrl: fatura.arquivo_url,
          targetLanguage: langCode,
          targetLanguageName: langName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na tradução');
      }

      const result = await response.json();
      
      if (result.success && result.translatedData) {
        // Gerar PDF com o texto traduzido
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        const data = result.translatedData;
        
        let y = 20;
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Título
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(data.titulo || 'INVOICE', pageWidth / 2, y, { align: 'center' });
        y += 15;
        
        // Linha separadora
        doc.setDrawColor(0, 51, 102);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Cabeçalho - Info da empresa e número da fatura
        if (data.cabecalho) {
          if (data.cabecalho.empresa) {
            doc.setFont('helvetica', 'bold');
            doc.text(data.cabecalho.empresa, margin, y);
            y += 6;
          }
          doc.setFont('helvetica', 'normal');
          
          // Número da fatura
          const numeroLabel = data.cabecalho.numero_label || data.cabecalho.numero_fatura_label;
          const numeroValor = data.cabecalho.numero_valor || data.cabecalho.numero_fatura;
          if (numeroLabel) {
            doc.text(`${numeroLabel}: ${numeroValor || ''}`, pageWidth - margin, y - 6, { align: 'right' });
          }
          
          // Data
          const dataLabel = data.cabecalho.data_label;
          const dataValor = data.cabecalho.data_valor || data.cabecalho.data;
          if (dataLabel) {
            doc.text(`${dataLabel}: ${dataValor || ''}`, pageWidth - margin, y, { align: 'right' });
            y += 6;
          }
          
          // Vencimento
          const vencLabel = data.cabecalho.vencimento_label;
          const vencValor = data.cabecalho.vencimento_valor || data.cabecalho.vencimento;
          if (vencLabel) {
            doc.text(`${vencLabel}: ${vencValor || ''}`, pageWidth - margin, y, { align: 'right' });
            y += 6;
          }
          
          // P.O.
          if (data.cabecalho.po_label && data.cabecalho.po_valor) {
            doc.text(`${data.cabecalho.po_label}: ${data.cabecalho.po_valor}`, pageWidth - margin, y, { align: 'right' });
            y += 6;
          }
          y += 5;
        }
        
        // Destinatário e Envio lado a lado
        const colWidth = (pageWidth - 2 * margin) / 2;
        const yDestinatario = y;
        
        if (data.destinatario) {
          doc.setFont('helvetica', 'bold');
          doc.text(data.destinatario.label || 'Bill To:', margin, y);
          doc.setFont('helvetica', 'normal');
          y += 5;
          const conteudo = data.destinatario.conteudo || data.destinatario.nome;
          if (conteudo) {
            const lines = doc.splitTextToSize(conteudo, colWidth - 5);
            doc.text(lines, margin, y);
            y += lines.length * 5;
          }
        }
        
        // Envio (ao lado do destinatário)
        if (data.envio && data.envio.label && data.envio.conteudo) {
          doc.setFont('helvetica', 'bold');
          doc.text(data.envio.label, margin + colWidth, yDestinatario);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(data.envio.conteudo, colWidth - 5);
          doc.text(lines, margin + colWidth, yDestinatario + 5);
        }
        
        y += 10;
        
        // Tabela de itens (nova estrutura)
        if (data.tabela && data.tabela.colunas && data.tabela.linhas) {
          // Cabeçalhos da tabela - larguras ajustadas: Descrição maior, outras menores
          const tableWidth = pageWidth - 2 * margin;
          const colWidths = [tableWidth * 0.45, tableWidth * 0.15, tableWidth * 0.20, tableWidth * 0.20];
          
          doc.setFillColor(0, 51, 102);
          doc.rect(margin, y, tableWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          
          const cols = data.tabela.colunas;
          let xPos = margin;
          cols.forEach((col: string, i: number) => {
            doc.text(col, xPos + 2, y + 5.5);
            xPos += colWidths[i] || 40;
          });
          y += 10;
          
          // Linhas da tabela
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          
          data.tabela.linhas.forEach((row: any, rowIndex: number) => {
            // Calcular altura da linha baseado no conteúdo
            let maxLines = 1;
            const values = Array.isArray(row) ? row : [
              row.descricao || row.item || '',
              row.quantidade || row.qtd || '',
              row.preco_unitario || row.preco || '',
              row.valor_total || row.total || row.valor || ''
            ];
            
            // Verificar quantas linhas a descrição precisa
            const descText = String(values[0] || '');
            const descLines = doc.splitTextToSize(descText, colWidths[0] - 4);
            maxLines = Math.max(maxLines, descLines.length);
            const rowHeight = maxLines * 4 + 4;
            
            if (rowIndex % 2 === 0) {
              doc.setFillColor(245, 245, 245);
              doc.rect(margin, y - 2, tableWidth, rowHeight, 'F');
            }
            
            xPos = margin;
            values.forEach((cell: string, i: number) => {
              const cellText = String(cell || '');
              if (i === 0) {
                // Descrição - com quebra de linha
                const lines = doc.splitTextToSize(cellText, colWidths[i] - 4);
                doc.text(lines, xPos + 2, y + 3);
              } else {
                // Outras colunas - texto simples
                doc.text(cellText, xPos + 2, y + 3);
              }
              xPos += colWidths[i] || 40;
            });
            y += rowHeight;
          });
          y += 5;
        }
        // Fallback para estrutura antiga
        else if (data.itens && data.itens.colunas && data.itens.linhas) {
          doc.setFillColor(0, 51, 102);
          doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          
          const cols = data.itens.colunas;
          const colW = (pageWidth - 2 * margin) / cols.length;
          cols.forEach((col: string, i: number) => {
            doc.text(col, margin + i * colW + 2, y + 5.5);
          });
          y += 10;
          
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          data.itens.linhas.forEach((row: string[], rowIndex: number) => {
            if (rowIndex % 2 === 0) {
              doc.setFillColor(245, 245, 245);
              doc.rect(margin, y - 2, pageWidth - 2 * margin, 7, 'F');
            }
            row.forEach((cell: string, i: number) => {
              doc.text(String(cell || ''), margin + i * colW + 2, y + 3);
            });
            y += 8;
          });
          y += 5;
        }
        
        // Totais (nova estrutura)
        if (data.totais) {
          const totalsX = pageWidth - margin - 60;
          
          if (data.totais.subtotal_label) {
            doc.setFont('helvetica', 'normal');
            doc.text(data.totais.subtotal_label + ':', totalsX, y);
            doc.text(data.totais.subtotal_valor || '', pageWidth - margin, y, { align: 'right' });
            y += 6;
          }
          
          if (data.totais.imposto_label) {
            doc.text(data.totais.imposto_label + ':', totalsX, y);
            doc.text(data.totais.imposto_valor || '', pageWidth - margin, y, { align: 'right' });
            y += 6;
          }
          
          if (data.totais.total_label) {
            doc.setFont('helvetica', 'bold');
            doc.text(data.totais.total_label + ':', totalsX, y);
            doc.text(data.totais.total_valor || '', pageWidth - margin, y, { align: 'right' });
            y += 6;
          }
          
          // Fallback para array
          if (Array.isArray(data.totais)) {
            data.totais.forEach((total: {label: string, valor: string}) => {
              doc.setFont('helvetica', total.label?.toLowerCase().includes('total') && !total.label?.toLowerCase().includes('sub') ? 'bold' : 'normal');
              doc.text((total.label || '') + ':', totalsX, y);
              doc.text(total.valor || '', pageWidth - margin, y, { align: 'right' });
              y += 6;
            });
          }
          y += 10;
        }
        
        // Termos e condições
        if (data.termos && data.termos.label) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(data.termos.label, margin, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          if (data.termos.conteudo) {
            const lines = doc.splitTextToSize(data.termos.conteudo, pageWidth - 2 * margin);
            doc.text(lines, margin, y);
            y += lines.length * 4;
          }
          y += 5;
        }
        
        // Pagamento
        if (data.pagamento && data.pagamento.label && data.pagamento.banco) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(data.pagamento.label, margin, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(data.pagamento.banco, pageWidth - 2 * margin);
          doc.text(lines, margin, y);
          y += lines.length * 4 + 5;
        }
        
        // Agradecimento
        if (data.agradecimento) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'italic');
          doc.text(data.agradecimento, margin, y);
          y += 10;
        }
        
        // Assinatura
        if (data.assinatura) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(data.assinatura, margin, y);
        }
        
        // Salvar PDF
        doc.save(`fatura_${fatura.numero}_${langCode}.pdf`);
        
        toast({
          title: "Sucesso",
          description: `Fatura traduzida para ${langName}!`
        });
        
        setIsDialogTraduzirOpen(null);
        setLinguaTraduzir("");
      } else {
        throw new Error(result.error || 'Erro ao traduzir fatura');
      }
    } catch (error: any) {
      console.error("Erro ao traduzir fatura:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível traduzir a fatura.",
        variant: "destructive"
      });
    } finally {
      setIsTraduzindo(false);
    }
  };

  const fetchProjetoDetalhes = async () => {
    setIsLoading(true);
    try {
      // Fetch projeto
      const {
        data: projetoData,
        error: projetoError
      } = await (supabase as any).from("projetos").select(`
          *,
          projeto_equipas(
            equipas(id, nome)
          )
        `).eq("id", id).single();
      if (projetoError) throw projetoError;
      setProjeto(projetoData);

      // Fetch atividades com subatividades
      const {
        data: atividadesData,
        error: atividadesError
      } = await (supabase as any).from("atividades").select(`
          *,
          profiles(id, nome, email),
          subatividades(*)
        `).eq("projeto_id", id).order("created_at", {
        ascending: false
      });
      if (atividadesError) throw atividadesError;
      setAtividades(atividadesData || []);

      // Fetch faturas do projeto
      await fetchFaturas();

      // Fetch all profiles
      const {
        data: profilesData,
        error: profilesError
      } = await (supabase as any).from("profiles").select("id, nome, email");
      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Fetch all equipas
      const {
        data: equipasData,
        error: equipasError
      } = await (supabase as any).from("equipas").select("id, nome");
      if (equipasError) throw equipasError;
      setEquipas(equipasData || []);
      
      // Fetch projeto equipas com membros
      const { data: projetoEquipasData, error: peError } = await supabase
        .from("projeto_equipas")
        .select(`
          id,
          equipa_id,
          equipas(
            id,
            nome,
            descricao
          )
        `)
        .eq("projeto_id", id);
      
      if (peError) throw peError;
      
      // Para cada equipa, buscar os membros
      const equipasComMembros = await Promise.all(
        (projetoEquipasData || []).map(async (pe: any) => {
          const { data: membros } = await supabase
            .from("equipa_membros")
            .select(`
              id,
              user_id,
              funcao,
              profiles(id, nome, email, avatar_url)
            `)
            .eq("equipa_id", pe.equipa_id);
          
          return {
            ...pe,
            membros: membros || []
          };
        })
      );
      
      setProjetoEquipas(equipasComMembros);
      
      // Equipas disponíveis (que não estão associadas ao projeto)
      const equipasAssociadas = projetoEquipasData?.map((pe: any) => pe.equipa_id) || [];
      const equipasDisponiveis = equipasData?.filter((eq: any) => !equipasAssociadas.includes(eq.id)) || [];
      setAvailableEquipas(equipasDisponiveis);
      
      // Fetch anexos do projeto
      await fetchProjetoAnexos();
      
      // Fetch financiamentos do projeto
      const { data: financiamentosData, error: finError } = await supabase
        .from("financiamentos")
        .select(`
          *,
          financiamento_atividades(
            id,
            valor_alocado,
            atividade_id,
            atividades(nome)
          )
        `)
        .eq("projeto_id", id)
        .order("created_at", { ascending: false });
      
      if (finError) throw finError;
      setFinanciamentos(financiamentosData || []);
      
      // Atualizar total financiado para colaboradores
      if (userRole === "Colaborador") {
        await fetchTotalFinanciadoColaborador();
      }
    } catch (error: any) {
      console.error("Erro ao carregar detalhes:", error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível carregar os detalhes do projeto.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleCriarAtividade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar orçamento com o financiamento selecionado
    if (formAtividade.financiamento_id && formAtividade.orcamento) {
      const valorOrcamento = parseFloat(formAtividade.orcamento);
      const financiamento = financiamentos.find(f => f.id === formAtividade.financiamento_id);
      
      if (financiamento) {
        if (valorOrcamento > financiamento.valor_disponivel) {
          toast({
            title: "Orçamento excedido",
            description: `O valor da rubrica (${valorOrcamento.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} ${projeto?.moeda}) excede o valor disponível do financiamento (${financiamento.valor_disponivel.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} ${projeto?.moeda}). Cadastro rejeitado.`,
            variant: "destructive"
          });
          return;
        }
      }
    }
    
    // Validar datas em relação ao projeto
    if (formAtividade.data_inicio && projeto?.data_inicio) {
      const dataInicioAtividade = new Date(formAtividade.data_inicio);
      const dataInicioProjeto = new Date(projeto.data_inicio);
      
      if (dataInicioAtividade < dataInicioProjeto) {
        toast({
          title: "Data inválida",
          description: `A data de início da atividade não pode ser anterior à data de início do projeto (${new Date(projeto.data_inicio).toLocaleDateString('pt-BR')})`,
          variant: "destructive"
        });
        return;
      }
    }
    
    if (formAtividade.data_fim && projeto?.data_fim) {
      const dataFimAtividade = new Date(formAtividade.data_fim);
      const dataFimProjeto = new Date(projeto.data_fim);
      
      if (dataFimAtividade > dataFimProjeto) {
        toast({
          title: "Data inválida",
          description: `A data de fim da atividade não pode ser posterior à data de fim do projeto (${new Date(projeto.data_fim).toLocaleDateString('pt-BR')})`,
          variant: "destructive"
        });
        return;
      }
    }
    
    // Validar que data de início não seja posterior à data de fim
    if (formAtividade.data_inicio && formAtividade.data_fim) {
      const dataInicio = new Date(formAtividade.data_inicio);
      const dataFim = new Date(formAtividade.data_fim);
      
      if (dataInicio > dataFim) {
        toast({
          title: "Data inválida",
          description: "A data de início não pode ser posterior à data de fim da atividade",
          variant: "destructive"
        });
        return;
      }
    }
    
    const orcamentoAtividade = Number(formAtividade.orcamento) || 0;
    try {
      const {
        data: atividadeData,
        error
      } = await (supabase as any).from("atividades").insert([{
        projeto_id: id,
        nome: formAtividade.nome,
        descricao: formAtividade.descricao,
        data_inicio: formAtividade.data_inicio || null,
        data_fim: formAtividade.data_fim || null,
        responsavel_id: formAtividade.responsavel_id || null,
        status: formAtividade.status,
        prioridade: formAtividade.prioridade,
        cor: formAtividade.cor,
        orcamento: orcamentoAtividade
      }]).select();
      if (error) throw error;
      
      // Se um financiamento foi selecionado, criar o vínculo e atualizar o valor disponível
      if (formAtividade.financiamento_id && formAtividade.orcamento && atividadeData && atividadeData.length > 0) {
        const valorAlocado = parseFloat(formAtividade.orcamento);
        const atividadeId = atividadeData[0].id;
        
        // Inserir o vínculo na tabela financiamento_atividades
        const { error: vinculoError } = await supabase
          .from('financiamento_atividades')
          .insert({
            financiamento_id: formAtividade.financiamento_id,
            atividade_id: atividadeId,
            valor_alocado: valorAlocado
          });
        
        if (vinculoError) throw vinculoError;
        
        // Atualizar o valor disponível do financiamento
        const financiamento = financiamentos.find(f => f.id === formAtividade.financiamento_id);
        if (financiamento) {
          const novoValorDisponivel = financiamento.valor_disponivel - valorAlocado;
          
          const { error: updateError } = await supabase
            .from('financiamentos')
            .update({ valor_disponivel: novoValorDisponivel })
            .eq('id', formAtividade.financiamento_id);
          
          if (updateError) throw updateError;
        }
      }
      
      toast({
        title: "Sucesso",
        description: "Rubrica criada com sucesso! Financiamento atualizado."
      });
      setIsDialogOpen(false);
      setFormAtividade({
        nome: "",
        descricao: "",
        data_inicio: "",
        data_fim: "",
        responsavel_id: "",
        status: "pendente",
        prioridade: "media",
        cor: "#10B981",
        orcamento: "",
        financiamento_id: ""
      });
      setFinanciamentoSelecionadoAtividade(null);
      fetchProjetoDetalhes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível criar a tarefa.",
        variant: "destructive"
      });
    }
  };
  const handleCriarSubatividade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAtividadeId) return;
    try {
      const {
        error
      } = await (supabase as any).from("subatividades").insert([{
        atividade_id: selectedAtividadeId,
        nome: formSubatividade.nome,
        descricao: formSubatividade.descricao,
        responsavel_id: formSubatividade.responsavel_id || null,
        concluida: false
      }]);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Atividade criada com sucesso!"
      });
      setIsSubDialogOpen(false);
      setSelectedAtividadeId(null);
      setFormSubatividade({
        nome: "",
        descricao: "",
        responsavel_id: ""
      });
      fetchProjetoDetalhes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível criar a atividade.",
        variant: "destructive"
      });
    }
  };
  const handleToggleSubatividade = async (subatividadeId: string, concluida: boolean) => {
    try {
      const {
        error
      } = await (supabase as any).from("subatividades").update({
        concluida: !concluida,
        data_conclusao: !concluida ? new Date().toISOString() : null
      }).eq("id", subatividadeId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: `Atividade ${!concluida ? "concluída" : "reaberta"}!`
      });
      fetchProjetoDetalhes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a atividade.",
        variant: "destructive"
      });
    }
  };
  const handleEditarAtividade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAtividade) return;
    
    // Validar datas em relação ao projeto
    if (editingAtividade.data_inicio && projeto?.data_inicio) {
      const dataInicioAtividade = new Date(editingAtividade.data_inicio);
      const dataInicioProjeto = new Date(projeto.data_inicio);
      
      if (dataInicioAtividade < dataInicioProjeto) {
        toast({
          title: "Data inválida",
          description: `A data de início da atividade não pode ser anterior à data de início do projeto (${new Date(projeto.data_inicio).toLocaleDateString('pt-BR')})`,
          variant: "destructive"
        });
        return;
      }
    }
    
    if (editingAtividade.data_fim && projeto?.data_fim) {
      const dataFimAtividade = new Date(editingAtividade.data_fim);
      const dataFimProjeto = new Date(projeto.data_fim);
      
      if (dataFimAtividade > dataFimProjeto) {
        toast({
          title: "Data inválida",
          description: `A data de fim da atividade não pode ser posterior à data de fim do projeto (${new Date(projeto.data_fim).toLocaleDateString('pt-BR')})`,
          variant: "destructive"
        });
        return;
      }
    }
    
    // Validar que data de início não seja posterior à data de fim
    if (editingAtividade.data_inicio && editingAtividade.data_fim) {
      const dataInicio = new Date(editingAtividade.data_inicio);
      const dataFim = new Date(editingAtividade.data_fim);
      
      if (dataInicio > dataFim) {
        toast({
          title: "Data inválida",
          description: "A data de início não pode ser posterior à data de fim da atividade",
          variant: "destructive"
        });
        return;
      }
    }
    
    const orcamentoAtividade = Number(editingAtividade.orcamento) || 0;
    try {
      const {
        error
      } = await (supabase as any).from("atividades").update({
        nome: editingAtividade.nome,
        descricao: editingAtividade.descricao,
        data_inicio: editingAtividade.data_inicio || null,
        data_fim: editingAtividade.data_fim || null,
        responsavel_id: editingAtividade.responsavel_id || null,
        status: editingAtividade.status,
        prioridade: editingAtividade.prioridade,
        orcamento: orcamentoAtividade
      }).eq("id", editingAtividade.id);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso!"
      });
      setIsEditDialogOpen(false);
      setEditingAtividade(null);
      fetchProjetoDetalhes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível atualizar a tarefa.",
        variant: "destructive"
      });
    }
  };

  const handleEditarProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    const orcamentoProjeto = Number(formProjeto.orcamento) || 0;
    try {
      const { error } = await supabase
        .from("projetos")
        .update({
          nome: formProjeto.nome,
          descricao: formProjeto.descricao,
          data_inicio: formProjeto.data_inicio || null,
          data_fim: formProjeto.data_fim || null,
          orcamento: orcamentoProjeto,
          status: formProjeto.status,
          localizacao: formProjeto.localizacao,
          latitude: formProjeto.latitude,
          longitude: formProjeto.longitude,
          cor: formProjeto.cor
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Projeto atualizado com sucesso!"
      });
      setIsEditProjetoDialogOpen(false);
      fetchProjetoDetalhes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível atualizar o projeto.",
        variant: "destructive"
      });
    }
  };

  const handleOpenEditProjeto = () => {
    setFormProjeto({
      nome: projeto?.nome || "",
      descricao: projeto?.descricao || "",
      data_inicio: projeto?.data_inicio || "",
      data_fim: projeto?.data_fim || "",
      orcamento: projeto?.orcamento?.toString() || "",
      status: projeto?.status || "planejamento",
      localizacao: projeto?.localizacao || "",
      latitude: projeto?.latitude || null,
      longitude: projeto?.longitude || null,
      cor: projeto?.cor || "#3B82F6"
    });
    setIsEditProjetoDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: {
      [key: string]: string;
    } = {
      pendente: "bg-gray-100 text-gray-800",
      em_andamento: "bg-blue-100 text-blue-800",
      concluida: "bg-green-100 text-green-800",
      cancelada: "bg-red-100 text-red-800",
      fora_orcamento: "bg-orange-100 text-orange-800"
    };
    const labels: {
      [key: string]: string;
    } = {
      pendente: t.projectDetails.status.pending,
      em_andamento: t.projectDetails.status.inProgress,
      concluida: t.projectDetails.status.completed,
      cancelada: t.projectDetails.status.cancelled,
      fora_orcamento: t.projectDetails.status.overBudget
    };
    return {
      class: variants[status] || "bg-gray-100 text-gray-800",
      label: labels[status] || status
    };
  };
  const getEstadoBadge = (estado: string) => {
    const variants: {
      [key: string]: string;
    } = {
      planejamento: "bg-blue-100 text-blue-800",
      execucao: "bg-green-100 text-green-800",
      concluido: "bg-gray-100 text-gray-800",
      suspenso: "bg-red-100 text-red-800"
    };
    return variants[estado] || "bg-gray-100 text-gray-800";
  };
  const getEstadoLabel = (estado: string) => {
    const labels: {
      [key: string]: string;
    } = {
      planejamento: t.projectDetails.status.planning,
      execucao: t.projectDetails.status.execution,
      concluido: t.projectDetails.status.completed,
      suspenso: t.projectDetails.status.suspended
    };
    return labels[estado] || estado;
  };
  const calcularProgresso = () => {
    if (atividades.length === 0) return 0;

    // Só pode ser 100% se TODAS as atividades estiverem concluídas
    const todasConcluidas = atividades.every(atv => atv.status === "concluida");
    if (todasConcluidas) return 100;

    // Caso contrário, calcular baseado no número de atividades concluídas
    const atividadesConcluidas = atividades.filter(atv => atv.status === "concluida").length;
    return Math.round(atividadesConcluidas / atividades.length * 100);
  };

  // Funções para Equipas
  const handleCriarEquipa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nome = formEquipa.nome.trim();
      const descricao = formEquipa.descricao.trim();
      if (!nome) {
        toast({ title: "Nome obrigatório", description: "Indique o nome da equipa.", variant: "destructive" });
        return;
      }
      const { data: novaEquipa, error: equipaError } = await supabase
        .from("equipas")
        .insert([{ nome, descricao }])
        .select()
        .single();
      if (equipaError) throw equipaError;
      // Associar equipa ao projeto e obter id da relação
      const { data: peRow, error: peError } = await supabase
        .from("projeto_equipas")
        .insert([{ projeto_id: id, equipa_id: novaEquipa.id }])
        .select("id, equipa_id")
        .single();
      if (peError) throw peError;
      // Atualização otimista de estado - sem recarregar
      setProjetoEquipas(prev => [
        ...prev,
        { ...peRow, equipas: { id: novaEquipa.id, nome: novaEquipa.nome, descricao: novaEquipa.descricao }, membros: [] }
      ]);
      setAvailableEquipas(prev => prev.filter(eq => eq.id !== novaEquipa.id));
      setProjeto((prev: any) => prev ? ({
        ...prev,
        projeto_equipas: [...(prev.projeto_equipas || []), { equipas: { id: novaEquipa.id, nome: novaEquipa.nome } }]
      }) : prev);
      toast({ title: "Sucesso", description: "Equipa criada com sucesso!" });
      setIsDialogNovaEquipaOpen(false);
      setFormEquipa({ nome: "", descricao: "" });
    } catch (error: any) {
      toast({ title: "Erro", description: error?.message || "Não foi possível criar a equipa.", variant: "destructive" });
    }
  };

  const handleAssociarEquipa = async () => {
    if (!selectedEquipaId) return;
    try {
      const selected = (availableEquipas.length ? availableEquipas : equipas).find((e:any)=> e.id === selectedEquipaId);
      const { data: peRow, error } = await supabase
        .from("projeto_equipas")
        .insert([{ projeto_id: id, equipa_id: selectedEquipaId }])
        .select("id, equipa_id")
        .single();
      if (error) throw error;
      
      // Buscar membros da equipe
      const { data: membros } = await supabase
        .from("equipa_membros")
        .select("id, user_id, funcao, profiles(id, nome, email, avatar_url)")
        .eq("equipa_id", selectedEquipaId);
      
      // Atualização otimista
      setProjetoEquipas(prev => [...prev, { ...peRow, equipas: selected, membros: membros || [] }]);
      setAvailableEquipas(prev => prev.filter(eq => eq.id !== selectedEquipaId));
      setProjeto((prev: any) => prev ? ({
        ...prev,
        projeto_equipas: [...(prev.projeto_equipas || []), { equipas: { id: selectedEquipaId, nome: selected?.nome } }]
      }) : prev);
      toast({ title: "Sucesso", description: "Equipa associada ao projeto!" });
      setIsDialogEquipaOpen(false);
      setSelectedEquipaId("");
    } catch (error: any) {
      toast({ title: "Erro", description: error?.message || "Não foi possível associar a equipa.", variant: "destructive" });
    }
  };

  const handleRemoverEquipa = async (projetoEquipaId: string) => {
    try {
      // Encontrar equipa removida
      const removed = projetoEquipas.find((pe:any)=> pe.id === projetoEquipaId);
      const { error } = await supabase
        .from("projeto_equipas")
        .delete()
        .eq("id", projetoEquipaId);
      
      if (error) throw error;
      
      // Atualização otimista
      setProjetoEquipas(prev => prev.filter(pe => pe.id !== projetoEquipaId));
      if (removed?.equipas) {
        setAvailableEquipas(prev => [...prev, removed.equipas]);
      }
      setProjeto((prev: any) => prev ? ({
        ...prev,
        projeto_equipas: (prev.projeto_equipas || []).filter((pe:any)=> pe.equipas?.id !== removed?.equipa_id)
      }) : prev);
      
      toast({ title: "Sucesso", description: "Equipa removida do projeto!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error?.message || "Não foi possível remover a equipa.", variant: "destructive" });
    }
  };

  const handleAdicionarMembro = async (equipaId: string) => {
    if (!newMemberId) return;
    
    // Verificar se o membro já existe na equipa
    const equipaAtual = projetoEquipas.find((pe:any) => pe.equipa_id === equipaId);
    const membroExiste = equipaAtual?.membros?.some((m:any) => m.user_id === newMemberId);
    
    if (membroExiste) {
      toast({ 
        title: "Membro já existe", 
        description: "Este utilizador já é membro desta equipa.", 
        variant: "destructive" 
      });
      return;
    }
    
    try {
      const { data: row, error } = await supabase
        .from("equipa_membros")
        .insert([{ equipa_id: equipaId, user_id: newMemberId, funcao: newMembroFuncao || null }])
        .select("id, user_id, funcao")
        .single();
      
      if (error) {
        // Tratar erro de constraint única
        if (error.code === '23505') {
          throw new Error('Este utilizador já é membro desta equipa.');
        }
        throw error;
      }
      
      const profile = profiles.find((p:any) => p.id === newMemberId);
      setProjetoEquipas(prev => prev.map(pe => pe.equipa_id === equipaId ? {
        ...pe,
        membros: [...(pe.membros || []), { id: row.id, user_id: newMemberId, funcao: row.funcao, profiles: profile }]
      } : pe));
      
      toast({ title: "Sucesso", description: "Membro adicionado à equipa!" });
      setNewMemberId("");
      setNewMembroFuncao("");
      setIsDialogMembrosOpen(null);
    } catch (error: any) {
      toast({ 
        title: "Erro", 
        description: error?.message || "Não foi possível adicionar o membro.", 
        variant: "destructive" 
      });
    }
  };

  const handleRemoverMembro = async (membroId: string) => {
    try {
      const { error } = await supabase
        .from("equipa_membros")
        .delete()
        .eq("id", membroId);
      
      if (error) throw error;
      
      setProjetoEquipas(prev => prev.map(pe => ({
        ...pe,
        membros: (pe.membros || []).filter((m:any) => m.id !== membroId)
      })));
      
      toast({ title: "Sucesso", description: "Membro removido da equipa!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error?.message || "Não foi possível remover o membro.", variant: "destructive" });
    }
  };

  // Funções para Finanças
  const calcularResumoFinanceiro = () => {
    const orcamentoProjeto = Number(projeto?.orcamento) || 0;

    // Calcular total de orçamentos alocados nas atividades
    const orcamentosAtividades = atividades.reduce((acc, atv) => acc + (Number(atv.orcamento) || 0), 0);

    // Calcular total gasto com faturas aprovadas (excluindo valor 0)
    const gastoTotal = faturas.filter(f => f.status === "aprovada" && Number(f.valor) > 0).reduce((acc, f) => acc + (Number(f.valor) || 0), 0);

    // Deduzir os orçamentos das atividades e faturas aprovadas do orçamento do projeto
    const orcamentoDisponivel = orcamentoProjeto - orcamentosAtividades - gastoTotal;
    
    const percentagemGasta = orcamentoProjeto > 0 ? Math.round(gastoTotal / orcamentoProjeto * 100) : 0;
    const faturasPendentes = faturas.filter(f => f.status === "pendente" && Number(f.valor) > 0).length;
    const faturasAprovadas = faturas.filter(f => f.status === "aprovada" && Number(f.valor) > 0).length;
    const faturasForaOrcamento = faturas.filter(f => f.status === "fora_orcamento" && Number(f.valor) > 0).length;
    return {
      orcamentoTotal: orcamentoDisponivel,
      orcamentoAtual: orcamentoProjeto,
      orcamentosAtividades,
      gastoTotal,
      percentagemGasta,
      faturasPendentes,
      faturasAprovadas,
      faturasForaOrcamento
    };
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O ficheiro ultrapassa 20MB. Compacte ou recorte e tente novamente.",
        variant: "destructive"
      });
      e.currentTarget.value = "";
      return;
    }
    setSelectedFile(file);
  };
  const handleSubmitFatura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !formDataFatura.descricao) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    // Se há uma atividade selecionada, apenas registar
    if (formDataFatura.atividade_id) {
      const atividadeSelecionada = atividades.find(a => a.id === formDataFatura.atividade_id);
    }

    // Processar fatura sem validar orçamento aqui (será feito pelo webhook)
    await processarFatura(0, 0, 0);
  };
  const processarFatura = async (valorFatura: number, totalFaturasAprovadas: number, novoTotalComFatura: number) => {
    setIsProcessing(true);
    try {
      // Get current user
      const { data: user } = await supabase.auth.getUser();
      
      // Calcular saldo disponível do projeto
      const orcamentoTotal = Number(projeto?.orcamento) || 0;
      const { data: faturasAprovadas } = await supabase.from("faturas").select("valor").eq("projeto_id", id).eq("status", "aprovada");
      const totalFaturasAprovadasReal = faturasAprovadas?.reduce((acc, f) => acc + Number(f.valor || 0), 0) || 0;
      const saldoDisponivel = orcamentoTotal - totalFaturasAprovadasReal;
      
      // Buscar dados da atividade selecionada
      const atividadeSelecionada = atividades.find(a => a.id === formDataFatura.atividade_id);
      const atividadeId = atividadeSelecionada?.id || '';
      const atividadeDescricao = atividadeSelecionada?.descricao || '';
      const atividadeOrcamento = atividadeSelecionada?.orcamento || 0;
      
      // Buscar taxa de câmbio da moeda do projeto
      const moedaProjeto = projeto?.moeda || 'MZN';
      let taxaCambio = 1; // Default para MZN
      if (moedaProjeto !== 'MZN') {
        const { data: exchangeRate } = await supabase
          .from('exchange_rates')
          .select('rate_to_mzn')
          .eq('currency_code', moedaProjeto)
          .eq('ativo', true)
          .maybeSingle();
        
        if (exchangeRate) {
          taxaCambio = Number(exchangeRate.rate_to_mzn);
        }
      }
      
      // Buscar todas as taxas de câmbio ativas para enviar ao n8n
      const { data: allExchangeRates } = await supabase
        .from('exchange_rates')
        .select('currency_code, rate_to_mzn')
        .eq('ativo', true)
        .order('currency_code');
      
      // Converter para objeto simples { USD: 63.5, EUR: 70.2, ... }
      const exchangeRatesData = (allExchangeRates || []).reduce((acc, rate) => {
        acc[rate.currency_code] = rate.rate_to_mzn;
        return acc;
      }, {} as Record<string, number>);
      
      // PRIMEIRO: Upload do arquivo para Supabase Storage para obter a URL
      const fileExt = selectedFile!.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("faturas").upload(filePath, selectedFile!);
      if (uploadError) throw uploadError;
      
      const { data: pub } = supabase.storage.from("faturas").getPublicUrl(filePath);
      const publicUrl = pub.publicUrl;
      
      console.log('URL pública do arquivo no Supabase Storage:', publicUrl);
      
      // Criar FormData para enviar o arquivo diretamente
      const formData = new FormData();
      formData.append('data0', selectedFile!);
      
      // Fazer POST para o webhook do n8n com form-data para análise, INCLUINDO a URL do arquivo e taxas de câmbio
      const linguaParam = querTraduzirFatura && linguaSelecionada ? `&lingua_selecionada=${encodeURIComponent(linguaSelecionada)}` : '';
      const webhookUrl = `https://digiglow28.app.n8n.cloud/webhook/accb7e32-b938-4926-902e-94178842025f?projeto_id=${id}&usuario_id=${user.user?.id}&saldo_disponivel=${saldoDisponivel}&arquivo_url=${encodeURIComponent(publicUrl)}&atividade_id=${encodeURIComponent(atividadeId)}&atividade_descricao=${encodeURIComponent(atividadeDescricao)}&atividade_orcamento=${atividadeOrcamento}&moeda=${moedaProjeto}&taxa_cambio=${taxaCambio}&exchange_rates=${encodeURIComponent(JSON.stringify(exchangeRatesData))}${linguaParam}`;
      
      console.log('Enviando para n8n com arquivo_url e exchange_rates:', { publicUrl, exchangeRatesData });
      
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxibm1naGV5b2VnZ2Rzc2J4cWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjUxMzEsImV4cCI6MjA3NTQ0MTEzMX0.rb7hdNk3PX9bzTmWK0sxRSHl399Yi-MSHUWFMF7VWNw',
        },
        body: formData,
      });
      
      if (!webhookResponse.ok) {
        throw new Error(`Erro na análise da fatura: ${webhookResponse.status}`);
      }
      
      const responseData = await webhookResponse.json();
      
      // Verificar se há saldo insuficiente
      if (!responseData.sucesso && responseData.resultado === "saldo_insuficiente" && responseData.popup_confirmacao) {
        setWebhookResponse(responseData);
        setIsConfirmSaldoInsuficiente(true);
        setIsProcessing(false);
        return;
      }
      
      // Se o saldo é suficiente, salvar fatura no banco de dados
      if (responseData.sucesso && responseData.invoice_data) {
        // Gerar número único para a fatura
        const numeroFatura = responseData.invoice_data.numero || `${Math.random().toString(36).substr(2, 8).toUpperCase()}-${String(Date.now()).substr(-4)}`;
        
        // Usar valor extraído pela análise do n8n
        const valorFatura = Number(responseData.invoice_data.valor_total || formDataFatura.valor);
        
        // Salvar fatura na tabela do banco de dados somente se tiver valor > 0
        if (valorFatura > 0) {
          const { data: faturaData, error: faturaError } = await supabase
            .from('faturas')
            .insert({
              numero: numeroFatura,
              projeto_id: id,
              atividade_id: formDataFatura.atividade_id || null,
              descricao: formDataFatura.descricao || responseData.invoice_data.descricao,
              valor: valorFatura,
              data_emissao: new Date().toISOString().split('T')[0],
              arquivo_url: publicUrl,
              arquivo_nome: selectedFile!.name,
              created_by: user.user?.id,
              status: 'pendente'
            })
            .select()
            .single();
          
          if (faturaError) {
            console.error('Erro ao salvar fatura:', faturaError);
            toast({
              title: "Erro ao salvar fatura",
              description: faturaError.message,
              variant: "destructive"
            });
            return;
          }
          
          console.log('Fatura salva com sucesso no banco:', faturaData);
        }
      }
      
      // Mostrar sucesso já que o upload e primeira análise foram bem-sucedidos
      toast({
        title: "Fatura Enviada",
        description: "A fatura foi enviada para processamento com sucesso.",
      });
      
      setIsDialogFaturaOpen(false);
      setSelectedFile(null);
      setFormDataFatura({
        atividade_id: "",
        valor: "",
        descricao: ""
      });
      setQuerTraduzirFatura(false);
      setLinguaSelecionada("");
      
      // Atualizar apenas a lista de faturas
      fetchFaturas();
    } catch (error) {
      console.error("Erro ao submeter fatura:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao registar fatura";
      toast({
        title: "Erro",
        description: errorMessage.includes("Failed to fetch") 
          ? "Não foi possível conectar ao servidor. Verifique a conexão ou tente novamente." 
          : errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleConfirmarSaldoInsuficiente = async () => {
    if (!webhookResponse || !webhookResponse.invoice_data) return;
    
    setIsProcessing(true);
    try {
      // Buscar orçamento da atividade selecionada
      const atividadeSelecionada = atividades.find(a => a.id === formDataFatura.atividade_id);
      const orcamentoAtividade = atividadeSelecionada?.orcamento || 0;

      // Fazer POST para confirmar a fatura com todos os dados incluindo atividade_id e orcamento
      const confirmResponse = await fetch('https://digiglow28.app.n8n.cloud/webhook/confirm-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxibm1naGV5b2VnZ2Rzc2J4cWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjUxMzEsImV4cCI6MjA3NTQ0MTEzMX0.rb7hdNk3PX9bzTmWK0sxRSHl399Yi-MSHUWFMF7VWNw',
        },
        body: JSON.stringify({
          ...webhookResponse,
          atividade_id: formDataFatura.atividade_id,
          atividade_orcamento: orcamentoAtividade,
        }),
      });
      
      if (!confirmResponse.ok) {
        throw new Error(`Erro ao confirmar fatura: ${confirmResponse.status}`);
      }
      
      const confirmData = await confirmResponse.json();
      
      toast({
        title: "Fatura Confirmada",
        description: "A fatura foi registada com sucesso apesar do saldo insuficiente.",
      });
      
      setIsConfirmSaldoInsuficiente(false);
      setWebhookResponse(null);
      setIsDialogFaturaOpen(false);
      setSelectedFile(null);
      setFormDataFatura({
        atividade_id: "",
        valor: "",
        descricao: ""
      });
      setQuerTraduzirFatura(false);
      setLinguaSelecionada("");
      
      // Atualizar apenas a lista de faturas
      fetchFaturas();
    } catch (error) {
      console.error("Erro ao confirmar fatura:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao confirmar a fatura";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const getFaturaStatusBadge = (status: string) => {
    if (status === "pendente") {
      return <Badge className="bg-yellow-100 text-yellow-800 gap-1">
          <AlertCircle className="h-3 w-3" />
          {t.projectDetails.finances.statusSubmitted}
        </Badge>;
    }
    if (status === "aprovada") {
      return <Badge className="bg-green-100 text-green-800 gap-1">
          <CheckCircle className="h-3 w-3" />
          {t.projectDetails.finances.statusApproved}
        </Badge>;
    }
    if (status === "fora_orcamento") {
      return <Badge className="bg-red-100 text-red-800 gap-1">
          <AlertCircle className="h-3 w-3" />
          {t.projectDetails.finances.statusOverBudget}
        </Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800 gap-1">{status}</Badge>;
  };
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-6 w-full max-w-6xl p-6">
          <Skeleton className="h-16 w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>;
  }
  if (!projeto) {
    return <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">{t.projectDetails.projectNotFound}</p>
        <Button onClick={() => navigate("/projetos")}>{t.projectDetails.backToProjects}</Button>
      </div>;
  }
  const progresso = calcularProgresso();
  const atividadesConcluidas = atividades.filter(a => a.status === "concluida").length;
  const atividadesPendentes = atividades.length - atividadesConcluidas;
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projetos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex items-center gap-3">
          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{
          backgroundColor: projeto.cor || "#3B82F6"
        }} />
          <div>
            <h1 className="text-3xl font-bold text-foreground">{projeto.nome}</h1>
            {projeto.descricao && <p className="text-muted-foreground mt-1">{projeto.descricao}</p>}
          </div>
        </div>
        <Badge className={getEstadoBadge(projeto.status)}>{getEstadoLabel(projeto.status)}</Badge>
        {userRole !== 'Colaborador' && (
          <Button variant="outline" size="sm" onClick={handleOpenEditProjeto} className="gap-2">
            <Edit className="h-4 w-4" />
            {t.projectDetails.editProject.title}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={userRole === 'Colaborador' ? 'financas' : 'visao-geral'} className="space-y-6">
        <TabsList>
          {userRole !== 'Colaborador' && (
            <>
              <TabsTrigger value="visao-geral">{t.projectDetails.tabs.overview}</TabsTrigger>
              <TabsTrigger value="atividades">{t.projectDetails.tabs.activities}</TabsTrigger>
              <TabsTrigger value="equipas">{t.projectDetails.tabs.teams}</TabsTrigger>
              <TabsTrigger value="documentos">{t.projectDetails.tabs.documents}</TabsTrigger>
            </>
          )}
          <TabsTrigger value="financas">{t.projectDetails.tabs.finances}</TabsTrigger>
          {userRole !== 'Colaborador' && (
            <TabsTrigger value="financiamento">{t.projectDetails.tabs.financing}</TabsTrigger>
          )}
        </TabsList>

        {/* Visão Geral Tab */}
        {userRole !== 'Colaborador' && (
        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.projectDetails.overview.progress}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{progresso}%</div>
                  <Progress value={progresso} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.projectDetails.tabs.activities}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{atividades.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {atividadesConcluidas} {t.projectDetails.status.completed.toLowerCase()} • {atividadesPendentes} {t.projectDetails.status.pending.toLowerCase()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.projectDetails.overview.budget}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">
                    {projeto.orcamento ? `${Number(projeto.orcamento).toLocaleString("pt-MZ")} ${projeto.moeda}` : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Informações do Projeto */}
          <Card>
            <CardHeader>
              <CardTitle>{t.common.details}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {projeto.localizacao && <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t.projectDetails.overview.location}</p>
                    <p className="text-sm text-muted-foreground">{projeto.localizacao}</p>
                  </div>
                </div>}

              {(projeto.data_inicio || projeto.data_fim) && <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t.projectDetails.overview.dates}</p>
                    <p className="text-sm text-muted-foreground">
                      {projeto.data_inicio ? new Date(projeto.data_inicio).toLocaleDateString("pt-PT") : "---"} - {projeto.data_fim ? new Date(projeto.data_fim).toLocaleDateString("pt-PT") : "---"}
                    </p>
                  </div>
                </div>}

              {projeto.projeto_equipas && projeto.projeto_equipas.length > 0 && <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">{t.projectDetails.overview.teams}</p>
                    <div className="flex flex-wrap gap-2">
                      {projeto.projeto_equipas.map((pe: any, idx: number) => <Badge key={idx} variant="outline">
                          {pe.equipas?.nome || "N/A"}
                        </Badge>)}
                    </div>
                  </div>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Rubricas Tab */}
        {userRole !== 'Colaborador' && (
        <TabsContent value="atividades" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar tarefas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Rubrica
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Rubrica</DialogTitle>
                  <DialogDescription>Preencha os dados da nova rubrica</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCriarAtividade} className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome da Rubrica *</Label>
                    <Input id="nome" placeholder="Ex: Fundação da Ponte" value={formAtividade.nome} onChange={e => setFormAtividade({
                    ...formAtividade,
                    nome: e.target.value
                  })} required />
                  </div>
                  <div>
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea id="descricao" placeholder="Descreva a rubrica..." value={formAtividade.descricao} onChange={e => setFormAtividade({
                    ...formAtividade,
                    descricao: e.target.value
                  })} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dataInicio">Data de Início</Label>
                      <Input 
                        id="dataInicio" 
                        type="date" 
                        min={projeto?.data_inicio || undefined}
                        max={projeto?.data_fim || undefined}
                        value={formAtividade.data_inicio} 
                        onChange={e => setFormAtividade({
                          ...formAtividade,
                          data_inicio: e.target.value
                        })} 
                      />
                      {projeto?.data_inicio && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Projeto: {new Date(projeto.data_inicio).toLocaleDateString('pt-BR')} até {projeto.data_fim ? new Date(projeto.data_fim).toLocaleDateString('pt-BR') : 'sem data fim'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="dataFim">Data de Fim</Label>
                      <Input 
                        id="dataFim" 
                        type="date" 
                        min={projeto?.data_inicio || undefined}
                        max={projeto?.data_fim || undefined}
                        value={formAtividade.data_fim} 
                        onChange={e => setFormAtividade({
                          ...formAtividade,
                          data_fim: e.target.value
                        })} 
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <Select value={formAtividade.responsavel_id} onValueChange={value => setFormAtividade({
                    ...formAtividade,
                    responsavel_id: value
                  })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map(profile => <SelectItem key={profile.id} value={profile.id}>
                            {profile.nome}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={formAtividade.prioridade} onValueChange={value => setFormAtividade({
                    ...formAtividade,
                    prioridade: value
                  })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="financiamento">Financiamento</Label>
                    <Select 
                      value={formAtividade.financiamento_id} 
                      onValueChange={(value) => {
                        setFormAtividade({
                          ...formAtividade,
                          financiamento_id: value
                        });
                        const financ = financiamentos.find(f => f.id === value);
                        setFinanciamentoSelecionadoAtividade(financ);
                      }}
                      disabled={financiamentos.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={financiamentos.length === 0 ? "Nenhum financiamento disponível" : "Selecione o financiamento"} />
                      </SelectTrigger>
                      <SelectContent>
                        {financiamentos.map(financ => (
                          <SelectItem key={financ.id} value={financ.id}>
                            {financ.nome} - Disponível: {Number(financ.valor_disponivel).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {projeto?.moeda || 'MZN'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {financiamentoSelecionadoAtividade && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Valor disponível: {Number(financiamentoSelecionadoAtividade.valor_disponivel).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {projeto?.moeda || 'MZN'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="orcamento">Orçamento ({projeto?.moeda || 'MZN'})</Label>
                    <Input id="orcamento" type="number" step="0.01" placeholder="0.00" value={formAtividade.orcamento} onChange={e => setFormAtividade({
                    ...formAtividade,
                    orcamento: e.target.value
                  })} />
                    {formAtividade.orcamento && financiamentoSelecionadoAtividade && parseFloat(formAtividade.orcamento) > financiamentoSelecionadoAtividade.valor_disponivel && (
                      <p className="text-sm text-destructive mt-1">
                        ⚠️ O valor excede o disponível no financiamento selecionado!
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Saldo disponível do projeto: {calcularResumoFinanceiro().orcamentoTotal.toLocaleString("pt-MZ")} {projeto?.moeda || 'MZN'}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="cor">Cor da rubrica</Label>
                    <Input id="cor" type="color" value={formAtividade.cor} onChange={e => setFormAtividade({
                    ...formAtividade,
                    cor: e.target.value
                  })} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Criar Rubrica</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista de Atividades */}
          <div className="space-y-4">
            {atividades.length === 0 ? <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground mb-4">Nenhuma tarefa encontrada</p>
                  <Button type="button" onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Primeira Tarefa
                  </Button>
                </CardContent>
              </Card> : atividades.map(atividade => {
            const statusInfo = getStatusBadge(atividade.status);
            const isExpanded = expandedAtividade === atividade.id;
            const subatividades = atividade.subatividades || [];
            const progessoSub = subatividades.length > 0 ? Math.round(subatividades.filter((s: any) => s.concluida).length / subatividades.length * 100) : 0;
            return <Card key={atividade.id} className="hover:shadow-md transition-shadow border-l-4" style={{
              borderLeftColor: atividade.cor || "#10B981"
            }}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpandedAtividade(isExpanded ? null : atividade.id)}>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                          <div className="flex-1">
                            <Link to={`/atividades/${atividade.id}`} className="hover:underline">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{
                            backgroundColor: atividade.cor || "#10B981"
                          }} />
                                {atividade.nome}
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                              </CardTitle>
                            </Link>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => {
                      setEditingAtividade(atividade);
                      setIsEditDialogOpen(true);
                    }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Badge className={statusInfo.class}>{statusInfo.label}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {(atividade.data_inicio || atividade.data_fim) && <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {atividade.data_inicio ? new Date(atividade.data_inicio).toLocaleDateString("pt-PT") : "---"}{" "}
                              - {atividade.data_fim ? new Date(atividade.data_fim).toLocaleDateString("pt-PT") : "---"}
                            </span>
                          </div>}
                        {atividade.profiles && <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{atividade.profiles.nome}</span>
                          </div>}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <ListChecks className="h-4 w-4" />
                          <span>{subatividades.length} {subatividades.length === 1 ? 'Atividade' : 'Atividades'}</span>
                        </div>
                      </div>

                      {subatividades.length > 0 && <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-semibold">{progessoSub}%</span>
                          </div>
                          <Progress value={progessoSub} className="h-2" />
                        </div>}

                      {isExpanded && <div className="space-y-3 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <ListChecks className="h-4 w-4 text-primary" />
                              Atividades
                            </h4>
                            <Button size="sm" className="gap-2 shadow-sm" onClick={() => {
                      setSelectedAtividadeId(atividade.id);
                      setIsSubDialogOpen(true);
                    }}>
                              <Plus className="h-3 w-3" />
                              Nova Atividade
                            </Button>
                          </div>
                          {subatividades.length === 0 ? <div className="flex flex-col items-center justify-center py-8 px-4 text-center border-2 border-dashed rounded-lg">
                              <ListChecks className="h-12 w-12 text-muted-foreground/40 mb-3" />
                              <p className="text-sm font-medium text-muted-foreground mb-1">Nenhuma atividade criada</p>
                              <p className="text-xs text-muted-foreground mb-4">Adicione atividades para organizar melhor esta rubrica</p>
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => {
                      setSelectedAtividadeId(atividade.id);
                      setIsSubDialogOpen(true);
                    }}>
                                <Plus className="h-3 w-3" />
                                Criar Primeira Atividade
                              </Button>
                            </div> : <div className="space-y-2">
                              {subatividades.map((sub: any) => <div key={sub.id} className="group flex items-start gap-3 p-4 rounded-lg bg-card border border-border hover:border-primary/50 hover:shadow-sm transition-all">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0 mt-0.5 hover:bg-primary/10" 
                                    onClick={() => handleToggleSubatividade(sub.id, sub.concluida)}
                                  >
                                    <CheckCircle2 className={`h-5 w-5 transition-all ${sub.concluida ? "text-green-600 fill-green-600 scale-110" : "text-muted-foreground group-hover:text-primary"}`} />
                                  </Button>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium transition-all ${sub.concluida ? "line-through text-muted-foreground" : "text-foreground group-hover:text-primary"}`}>
                                      {sub.nome}
                                    </p>
                                    {sub.descricao && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{sub.descricao}</p>}
                                    {sub.data_conclusao && <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Concluída em {new Date(sub.data_conclusao).toLocaleDateString("pt-PT")}
                                        </Badge>
                                      </div>}
                                  </div>
                                </div>)}
                            </div>}
                        </div>}
                    </CardContent>
                  </Card>;
            })}
          </div>
        </TabsContent>
        )}

        {/* Finanças Tab */}
        <TabsContent value="financas" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{t.projectDetails.finances.title}</h2>
              <p className="text-muted-foreground">{t.projectDetails.finances.subtitle}</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isDialogFaturaOpen} onOpenChange={setIsDialogFaturaOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t.projectDetails.finances.newInvoice}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
                  <DialogHeader>
                    <DialogTitle>{t.projectDetails.finances.newInvoice}</DialogTitle>
                    <DialogDescription>{t.projectDetails.newActivity.subtitle}</DialogDescription>
                  </DialogHeader>
                <form onSubmit={handleSubmitFatura} className="space-y-4">
                  <div>
                    <Label htmlFor="data0">{t.projectDetails.finances.attachInvoice} *</Label>
                    <div className="mt-2">
                      {!selectedFile ? <label htmlFor="data0" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-accent/50 transition-all">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <div className="mb-2 p-2 bg-primary/10 rounded-full">
                              <Upload className="h-6 w-6 text-primary" />
                            </div>
                            <p className="mb-2 text-sm font-medium">
                              {t.projectDetails.finances.clickToUpload}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t.projectDetails.finances.maxSize}
                            </p>
                          </div>
                          <Input id="data0" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,image/*,application/pdf" onChange={handleFileUpload} disabled={isProcessing} className="hidden" required />
                        </label> : <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/20">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium truncate max-w-xs">
                                {selectedFile.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFile(null)} disabled={isProcessing} className="hover:text-destructive">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="descricao">{t.projectDetails.finances.expenseDescription} *</Label>
                    <Textarea id="descricao" placeholder={t.projectDetails.finances.expenseDescriptionPlaceholder} value={formDataFatura.descricao} onChange={e => setFormDataFatura({
                    ...formDataFatura,
                    descricao: e.target.value
                  })} disabled={isProcessing} rows={3} required />
                  </div>

                  <div>
                    <Label htmlFor="atividade">Rubrica (obrigatório)</Label>
                    <Select value={formDataFatura.atividade_id} onValueChange={value => setFormDataFatura({
                    ...formDataFatura,
                    atividade_id: value
                  })} disabled={isProcessing} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a tarefa" />
                      </SelectTrigger>
                      <SelectContent>
                        {atividades.map(atividade => <SelectItem key={atividade.id} value={atividade.id}>
                            {atividade.nome}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>


                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" disabled={isProcessing} onClick={() => {
                    setIsDialogFaturaOpen(false);
                    setSelectedFile(null);
                    setFormDataFatura({
                      atividade_id: "",
                      valor: "",
                      descricao: ""
                    });
                    setQuerTraduzirFatura(false);
                    setLinguaSelecionada("");
                  }}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isProcessing || !selectedFile}>
                      {isProcessing ? <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </> : "Registar Fatura"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {userRole === "Colaborador" ? t.projectDetails.finances.totalFinanced : t.projectDetails.finances.availableBalance}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {userRole === "Colaborador" 
                    ? `${totalFinanciadoColaborador.toLocaleString("pt-MZ")} ${projeto?.moeda || "MZN"}`
                    : `${calcularResumoFinanceiro().orcamentoTotal.toLocaleString("pt-MZ")} ${projeto?.moeda || "MZN"}`
                  }
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.projectDetails.finances.totalSpentLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {calcularResumoFinanceiro().gastoTotal.toLocaleString("pt-MZ")} {projeto?.moeda || "MZN"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.projectDetails.finances.spentPercentage}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{calcularResumoFinanceiro().percentagemGasta}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.projectDetails.finances.approvedInvoices}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{calcularResumoFinanceiro().faturasAprovadas}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.projectDetails.finances.overBudgetInvoices}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{calcularResumoFinanceiro().faturasForaOrcamento}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {isLoadingFaturas ? (
              <Card>
                <CardContent className="py-8 flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">A carregar faturas...</span>
                </CardContent>
              </Card>
            ) : faturas.filter(f => Number(f.valor) > 0).length === 0 ? <Card>
                <CardContent className="py-8 text-center text-muted-foreground">Nenhuma fatura registada</CardContent>
              </Card> : <Accordion type="single" collapsible className="space-y-2">
                {faturas.filter(fatura => Number(fatura.valor) > 0).map(fatura => <AccordionItem key={fatura.id} value={fatura.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-lg">{fatura.numero}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-foreground">
                            {Number(fatura.valor).toLocaleString("pt-MZ")} {projeto?.moeda || 'MZN'}
                          </span>
                          {getFaturaStatusBadge(fatura.status)}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t.projectDetails.finances.activity}:</span>
                          <span className="text-sm font-medium">{fatura.atividade?.nome || t.common.noData}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t.projectDetails.finances.issueDate}:</span>
                          <span className="text-sm font-medium">
                            {new Date(fatura.data_emissao).toLocaleDateString("pt-PT")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t.projectDetails.finances.downloadFile}:</span>
                          <Button variant="link" size="sm" className="h-auto p-0 text-sm font-medium flex items-center gap-1" onClick={() => handleDownloadFile(fatura.arquivo_url, fatura.arquivo_nome)}>
                            <Download className="h-3 w-3" />
                            {fatura.arquivo_nome}
                          </Button>
                        </div>
                        {fatura.descricao && <div>
                            <span className="text-sm text-muted-foreground">{t.common.description}:</span>
                            <p className="text-sm mt-1">{fatura.descricao}</p>
                          </div>}
                        {fatura.motivo_rejeicao && <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                            <p className="text-sm text-red-800 dark:text-red-200">{fatura.motivo_rejeicao}</p>
                          </div>}
                        <div className="pt-2 flex gap-2 flex-wrap items-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleVerDetalhesFatura(fatura)}
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t.projectDetails.finances.viewDetails}
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsDialogTraduzirOpen(fatura.id)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-3 w-3" />
                            {t.projectDetails.finances.translateDownload || "Traduzir e Baixar"}
                          </Button>
                          
                          <Dialog open={isDialogTraduzirOpen === fatura.id} onOpenChange={(open) => {
                            if (!open) {
                              setIsDialogTraduzirOpen(null);
                              setLinguaTraduzir("");
                            }
                          }}>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Traduzir Fatura</DialogTitle>
                                <DialogDescription>
                                  Selecione o idioma para traduzir a fatura #{fatura.numero}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <Label>Idioma de destino</Label>
                                  <Select value={linguaTraduzir} onValueChange={setLinguaTraduzir}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione um idioma" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                      <SelectItem value="en|Inglês">Inglês</SelectItem>
                                      <SelectItem value="es|Espanhol">Espanhol</SelectItem>
                                      <SelectItem value="fr|Francês">Francês</SelectItem>
                                      <SelectItem value="de|Alemão">Alemão</SelectItem>
                                      <SelectItem value="it|Italiano">Italiano</SelectItem>
                                      <SelectItem value="pt|Português">Português</SelectItem>
                                      <SelectItem value="zh|Chinês">Chinês</SelectItem>
                                      <SelectItem value="ja|Japonês">Japonês</SelectItem>
                                      <SelectItem value="ar|Árabe">Árabe</SelectItem>
                                      <SelectItem value="ru|Russo">Russo</SelectItem>
                                      <SelectItem value="ko|Coreano">Coreano</SelectItem>
                                      <SelectItem value="nl|Holandês">Holandês</SelectItem>
                                      <SelectItem value="sv|Sueco">Sueco</SelectItem>
                                      <SelectItem value="pl|Polaco">Polaco</SelectItem>
                                      <SelectItem value="tr|Turco">Turco</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setIsDialogTraduzirOpen(null);
                                      setLinguaTraduzir("");
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button 
                                    disabled={!linguaTraduzir || isTraduzindo}
                                    onClick={() => handleTraduzirFatura(fatura)}
                                  >
                                    {isTraduzindo ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        A traduzir...
                                      </>
                                    ) : (
                                      <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Traduzir e Baixar
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      <div className="border-t pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            {t.projectDetails.finances.receipts} ({fatura.recibos?.length || 0})
                          </h4>
                          <Dialog open={isDialogReciboOpen === fatura.id} onOpenChange={open => {
                      if (!open) {
                        setIsDialogReciboOpen(null);
                        setFormDataRecibo({
                          valor: "",
                          justificacao: "",
                          comentario: "",
                          arquivo: null
                        });
                      }
                    }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setIsDialogReciboOpen(fatura.id)}>
                                <Plus className="h-3 w-3 mr-1" />
                                {t.projectDetails.finances.addReceipt}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>{t.projectDetails.finances.addReceipt}</DialogTitle>
                                <DialogDescription>
                                  {t.projectDetails.finances.invoiceNumber}: {fatura.numero} - {Number(fatura.valor).toLocaleString("pt-MZ")} MZN
                                </DialogDescription>
                              </DialogHeader>
                              <form onSubmit={async e => {
                          e.preventDefault();
                          if (!formDataRecibo.arquivo || !formDataRecibo.valor) {
                            toast({
                              title: "Erro",
                              description: "Por favor, anexe o recibo e insira o valor.",
                              variant: "destructive"
                            });
                            return;
                          }
                          const valorRecibo = Number(formDataRecibo.valor);
                          if (isNaN(valorRecibo) || valorRecibo <= 0) {
                            toast({
                              title: "Erro",
                              description: "Valor inválido.",
                              variant: "destructive"
                            });
                            return;
                          }
                          const diferencaValor = Math.abs(Number(fatura.valor) - valorRecibo);
                          if (diferencaValor > 0 && !formDataRecibo.justificacao.trim()) {
                            toast({
                              title: "Justificação obrigatória",
                              description: "É necessário justificar a diferença de valor.",
                              variant: "destructive"
                            });
                            return;
                          }
                          setIsProcessing(true);
                          try {
                            const fileExt = formDataRecibo.arquivo.name.split(".").pop();
                            const fileName = `${Date.now()}.${fileExt}`;
                            const filePath = `${id}/recibos/${fileName}`;
                            const {
                              error: uploadError
                            } = await supabase.storage.from("faturas").upload(filePath, formDataRecibo.arquivo);
                            if (uploadError) throw uploadError;
                            const {
                              data: pub
                            } = supabase.storage.from("faturas").getPublicUrl(filePath);
                            const {
                              data: user
                            } = await supabase.auth.getUser();
                            const {
                              error: insertError
                            } = await supabase.from("recibos").insert({
                              fatura_id: fatura.id,
                              arquivo_url: pub.publicUrl,
                              arquivo_nome: formDataRecibo.arquivo.name,
                              valor: valorRecibo,
                              justificacao_diferenca: diferencaValor > 0 ? formDataRecibo.justificacao : null,
                              comentario: formDataRecibo.comentario || null,
                              created_by: user.user?.id
                            });
                            if (insertError) throw insertError;
                            toast({
                              title: "Sucesso",
                              description: "Recibo adicionado com sucesso!"
                            });
                            setIsDialogReciboOpen(null);
                            setFormDataRecibo({
                              valor: "",
                              justificacao: "",
                              comentario: "",
                              arquivo: null
                            });
                            fetchProjetoDetalhes();
                          } catch (error: any) {
                            console.error("Erro ao adicionar recibo:", error);
                            toast({
                              title: "Erro",
                              description: "Não foi possível adicionar o recibo.",
                              variant: "destructive"
                            });
                          } finally {
                            setIsProcessing(false);
                          }
                        }} className="space-y-4">
                                <div>
                                  <Label htmlFor="recibo-arquivo">Anexar Recibo *</Label>
                                  <Input id="recibo-arquivo" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setFormDataRecibo({
                                  ...formDataRecibo,
                                  arquivo: file
                                });
                              }
                            }} required />
                                  {formDataRecibo.arquivo && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <Paperclip className="h-3 w-3" />
                                      {formDataRecibo.arquivo.name}
                                    </p>}
                                </div>

                                <div>
                                  <Label htmlFor="recibo-valor">Valor do Recibo *</Label>
                                  <Input id="recibo-valor" type="number" step="0.01" placeholder="0.00" value={formDataRecibo.valor} onChange={e => setFormDataRecibo({
                              ...formDataRecibo,
                              valor: e.target.value
                            })} required />
                                  {formDataRecibo.valor && Math.abs(Number(fatura.valor) - Number(formDataRecibo.valor)) > 0 && <p className="text-xs text-amber-600 mt-1">
                                        Diferença:{" "}
                                        {Math.abs(Number(fatura.valor) - Number(formDataRecibo.valor)).toLocaleString("pt-MZ")}{" "}
                                        MZN
                                      </p>}
                                </div>

                                {formDataRecibo.valor && Math.abs(Number(fatura.valor) - Number(formDataRecibo.valor)) > 0 && <div>
                                      <Label htmlFor="recibo-justificacao">Justificação da Diferença *</Label>
                                      <Textarea id="recibo-justificacao" placeholder="Explique a razão da diferença de valor..." value={formDataRecibo.justificacao} onChange={e => setFormDataRecibo({
                              ...formDataRecibo,
                              justificacao: e.target.value
                            })} rows={3} required />
                                    </div>}

                                <div>
                                  <Label htmlFor="recibo-comentario">Comentário (opcional)</Label>
                                  <Textarea id="recibo-comentario" placeholder="Comentário adicional..." value={formDataRecibo.comentario} onChange={e => setFormDataRecibo({
                              ...formDataRecibo,
                              comentario: e.target.value
                            })} rows={2} />
                                </div>

                                <div className="flex gap-2 justify-end">
                                  <Button type="button" variant="outline" onClick={() => {
                              setIsDialogReciboOpen(null);
                              setFormDataRecibo({
                                valor: "",
                                justificacao: "",
                                comentario: "",
                                arquivo: null
                              });
                            }}>
                                    Cancelar
                                  </Button>
                                  <Button type="submit" disabled={isProcessing}>
                                    {isProcessing ? <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Processando...
                                      </> : "Adicionar Recibo"}
                                  </Button>
                                </div>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {fatura.recibos && fatura.recibos.length > 0 ? <div className="space-y-2">
                            {fatura.recibos.map((recibo: any) => <div key={recibo.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                                <Paperclip className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Button variant="link" size="sm" className="h-auto p-0 text-sm font-medium flex items-center gap-1" onClick={() => handleDownloadFile(recibo.arquivo_url, recibo.arquivo_nome)}>
                                      <Download className="h-3 w-3" />
                                      {recibo.arquivo_nome}
                                    </Button>
                                    <Badge variant="secondary" className="text-xs">
                                      {new Date(recibo.created_at).toLocaleDateString("pt-PT")}
                                    </Badge>
                                  </div>
                                  <p className="text-xs font-semibold text-foreground">
                                    Valor: {Number(recibo.valor).toLocaleString("pt-MZ")} MZN
                                    {Number(recibo.valor) !== Number(fatura.valor) && <Badge variant="outline" className="ml-2 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                        Diferença:{" "}
                                        {Math.abs(Number(fatura.valor) - Number(recibo.valor)).toLocaleString("pt-MZ")}{" "}
                                        MZN
                                      </Badge>}
                                  </p>
                                  {recibo.justificacao_diferenca && <div className="flex gap-2 items-start bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded border border-amber-100 dark:border-amber-900">
                                      <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-500 mt-0.5" />
                                      <div>
                                        <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                                          Justificação:
                                        </p>
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                          {recibo.justificacao_diferenca}
                                        </p>
                                      </div>
                                    </div>}
                                  {recibo.comentario && <div className="flex gap-2 items-start">
                                      <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5" />
                                      <p className="text-xs text-muted-foreground">{recibo.comentario}</p>
                                    </div>}
                                </div>
                              </div>)}
                          </div> : <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/30">
                            {t.projectDetails.finances.noReceipts}
                          </p>}
                      </div>
                    </AccordionContent>
                  </AccordionItem>)}
              </Accordion>}
          </div>
        </TabsContent>
        
        {/* Equipas Tab */}
        {userRole !== 'Colaborador' && (
        <TabsContent value="equipas" className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold flex-1">{t.projectDetails.teams.title}</h2>
            <Dialog open={isDialogEquipaOpen} onOpenChange={setIsDialogEquipaOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" type="button">
                  <Plus className="h-4 w-4" />
                  {t.projectDetails.teams.associateTeam}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.projectDetails.teams.associateTeam}</DialogTitle>
                  <DialogDescription>{t.projectDetails.teams.createOrAssociate}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t.projectDetails.tabs.teams}</Label>
                    <Select value={selectedEquipaId} onValueChange={setSelectedEquipaId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t.projectDetails.teams.selectTeam} />
                      </SelectTrigger>
                       <SelectContent className="z-[9999]">
                        {availableEquipas.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            {t.projectDetails.teams.noTeamsAvailable}
                          </div>
                        ) : (
                          availableEquipas.map(equipa => (
                            <SelectItem key={equipa.id} value={equipa.id}>
                              {equipa.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsDialogEquipaOpen(false)}>
                      {t.common.cancel}
                    </Button>
                    <Button onClick={handleAssociarEquipa} disabled={!selectedEquipaId}>{t.projectDetails.teams.associate}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogNovaEquipaOpen} onOpenChange={setIsDialogNovaEquipaOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" type="button">
                  <Plus className="h-4 w-4" />
                  {t.projectDetails.teams.newTeam}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.projectDetails.teams.newTeam}</DialogTitle>
                  <DialogDescription>{t.projectDetails.teams.createOrAssociate}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCriarEquipa} className="space-y-4" action="#" >
                  <div>
                    <Label htmlFor="nome-equipa">{t.projectDetails.teams.teamName} *</Label>
                    <Input
                      id="nome-equipa"
                      placeholder="Ex: Equipa de Construção"
                      value={formEquipa.nome}
                      onChange={e => setFormEquipa({ ...formEquipa, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="descricao-equipa">{t.common.description}</Label>
                    <Textarea
                      id="descricao-equipa"
                      placeholder={t.projectDetails.teams.teamDescription}
                      value={formEquipa.descricao}
                      onChange={e => setFormEquipa({ ...formEquipa, descricao: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsDialogNovaEquipaOpen(false)}>
                      {t.common.cancel}
                    </Button>
                    <Button type="submit" onClick={(e) => e.stopPropagation()}>
                      {t.projectDetails.teams.create}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista de Equipas */}
          <div className="grid gap-4">
            {projetoEquipas.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">{t.projectDetails.teams.noTeams}</p>
                  <div className="flex gap-2">
                    <Button onClick={() => setIsDialogNovaEquipaOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      {t.projectDetails.teams.newTeam}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              projetoEquipas.map(pe => (
                <Card key={pe.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          {pe.equipas?.nome}
                        </CardTitle>
                        {pe.equipas?.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">{pe.equipas.descricao}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoverEquipa(pe.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium">
                          {t.projectDetails.teams.members} ({pe.membros?.length || 0})
                        </Label>
                        <Dialog
                          open={isDialogMembrosOpen === pe.equipa_id}
                          onOpenChange={(open) => setIsDialogMembrosOpen(open ? pe.equipa_id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Plus className="h-3 w-3" />
                              {t.projectDetails.teams.addMember}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t.projectDetails.teams.addMember}</DialogTitle>
                              <DialogDescription>
                                {t.projectDetails.teams.selectMember} {pe.equipas?.nome}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>{t.projectDetails.teams.selectMember}</Label>
                                <Select value={newMemberId} onValueChange={setNewMemberId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t.projectDetails.teams.selectMember} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {profiles
                                      .filter(p => !pe.membros?.some((m: any) => m.user_id === p.id))
                                      .map(profile => (
                                        <SelectItem key={profile.id} value={profile.id}>
                                          {profile.nome} ({profile.email})
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>{t.projectDetails.teams.role}</Label>
                                <Input
                                  placeholder={t.projectDetails.teams.rolePlaceholder}
                                  value={newMembroFuncao}
                                  onChange={(e) => setNewMembroFuncao(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsDialogMembrosOpen(null)}
                                >
                                  {t.common.cancel}
                                </Button>
                                <Button onClick={() => handleAdicionarMembro(pe.equipa_id)}>
                                  {t.common.add}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      {pe.membros && pe.membros.length > 0 ? (
                        <div className="space-y-2">
                          {pe.membros.map((membro: any) => (
                            <div
                              key={membro.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {membro.profiles?.nome?.charAt(0).toUpperCase() || '?'}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{membro.profiles?.nome}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {membro.funcao ? `${membro.funcao} • ` : ''}{membro.profiles?.email}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoverMembro(membro.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/30">
                          {t.projectDetails.teams.noMembers}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        )}
        
        {/* Documentos Tab */}
        {userRole !== 'Colaborador' && (
        <TabsContent value="documentos" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">{t.projectDetails.documents.title}</h2>
              <p className="text-sm text-muted-foreground">{t.projectDetails.documents.subtitle}</p>
            </div>
            <Dialog open={isDialogAnexoOpen} onOpenChange={setIsDialogAnexoOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Upload className="h-4 w-4" />
                  {t.projectDetails.documents.attachDocument}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.projectDetails.documents.dialogTitle}</DialogTitle>
                  <DialogDescription>
                    {t.projectDetails.documents.dialogDescription}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="anexo-file">{t.projectDetails.documents.fileRequired}</Label>
                    <Input
                      id="anexo-file"
                      type="file"
                      onChange={(e) => setSelectedAnexoFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.projectDetails.documents.acceptedFormats}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="anexo-descricao">{t.projectDetails.documents.descriptionOptional}</Label>
                    <Textarea
                      id="anexo-descricao"
                      placeholder={t.projectDetails.documents.descriptionPlaceholder}
                      value={formDataAnexo.descricao}
                      onChange={(e) => setFormDataAnexo({ ...formDataAnexo, descricao: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogAnexoOpen(false);
                        setSelectedAnexoFile(null);
                        setFormDataAnexo({ descricao: "" });
                      }}
                    >
                      {t.projectDetails.documents.cancel}
                    </Button>
                    <Button
                      onClick={handleUploadAnexo}
                      disabled={!selectedAnexoFile || uploadingAnexo}
                    >
                      {uploadingAnexo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t.projectDetails.documents.upload}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista de Documentos */}
          <div className="space-y-4">
            {projetoAnexos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {t.projectDetails.documents.noDocuments}
                  </p>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    {t.projectDetails.documents.clickToAdd}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.projectDetails.documents.file}</TableHead>
                        <TableHead>{t.projectDetails.documents.size}</TableHead>
                        <TableHead>{t.projectDetails.documents.description}</TableHead>
                        <TableHead>{t.projectDetails.documents.date}</TableHead>
                        <TableHead className="text-right">{t.projectDetails.documents.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projetoAnexos
                        .slice((currentPageAnexos - 1) * anexosPerPage, currentPageAnexos * anexosPerPage)
                        .map((anexo) => (
                        <TableRow key={anexo.id}>
                          <TableCell>
                            <button 
                              onClick={() => window.open(anexo.url, '_blank')}
                              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
                            >
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="font-medium text-primary hover:underline">{anexo.nome_arquivo}</span>
                            </button>
                          </TableCell>
                          <TableCell>{formatFileSize(anexo.tamanho)}</TableCell>
                          <TableCell className="max-w-xs">
                            <span className="line-clamp-2 text-sm text-muted-foreground">
                              {anexo.descricao || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(anexo.created_at).toLocaleDateString('pt-PT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(anexo.url, '_blank')}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteAnexo(anexo.id, anexo.url)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Paginação */}
            {Math.ceil(projetoAnexos.length / anexosPerPage) > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPageAnexos(prev => Math.max(prev - 1, 1))}
                  disabled={currentPageAnexos === 1}
                  className="w-full sm:w-auto"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t.common.previous}
                </Button>
                
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {Array.from({ length: Math.ceil(projetoAnexos.length / anexosPerPage) }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPageAnexos === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPageAnexos(page)}
                      className="min-w-[32px] sm:min-w-[40px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPageAnexos(prev => Math.min(prev + 1, Math.ceil(projetoAnexos.length / anexosPerPage)))}
                  disabled={currentPageAnexos === Math.ceil(projetoAnexos.length / anexosPerPage)}
                  className="w-full sm:w-auto"
                >
                  {t.common.next}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        )}
        
        {/* Financiamento Tab */}
        {userRole !== 'Colaborador' && (
        <TabsContent value="financiamento" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">{t.projectDetails.financing.title}</h2>
              <p className="text-sm text-muted-foreground">{t.projectDetails.financing.subtitle}</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isDialogFinanciamentoOpen} onOpenChange={setIsDialogFinanciamentoOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t.projectDetails.financing.newFinancing}
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.projectDetails.financing.newFinancing}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitFinanciamento} className="space-y-4">
                  <div>
                    <Label htmlFor="nome-financiamento">{t.projectDetails.financing.name} *</Label>
                    <Input
                      id="nome-financiamento"
                      value={formFinanciamento.nome}
                      onChange={(e) => setFormFinanciamento({ ...formFinanciamento, nome: e.target.value })}
                      placeholder={t.projectDetails.financing.namePlaceholder}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="descricao-financiamento">{t.projectDetails.financing.description}</Label>
                    <Textarea
                      id="descricao-financiamento"
                      value={formFinanciamento.descricao}
                      onChange={(e) => setFormFinanciamento({ ...formFinanciamento, descricao: e.target.value })}
                      placeholder={t.projectDetails.financing.descriptionPlaceholder}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="valor-financiamento">{t.projectDetails.financing.totalValue} ({projeto?.moeda}) *</Label>
                    <Input
                      id="valor-financiamento"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formFinanciamento.valor_total}
                      onChange={(e) => setFormFinanciamento({ ...formFinanciamento, valor_total: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogFinanciamentoOpen(false)}>
                      {t.common.cancel}
                    </Button>
                    <Button type="submit">
                      {t.projectDetails.financing.create}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {financiamentos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {t.projectDetails.financing.noFinancing}
                    <br />
                    {t.projectDetails.financing.addFirst}
                  </p>
                </CardContent>
              </Card>
            ) : (
              financiamentos.map((financiamento) => (
                <Card key={financiamento.id} className="border-l-4" style={{ borderLeftColor: financiamento.valor_disponivel <= 0 ? '#EF4444' : '#10B981' }}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{financiamento.nome}</h3>
                        {financiamento.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">{financiamento.descricao}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingFinanciamento({
                              ...financiamento,
                              valor_total_original: financiamento.valor_total
                            });
                            setIsEditFinanciamentoOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <X className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Financiamento</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este financiamento? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  // Primeiro, deletar alocações relacionadas
                                  await supabase
                                    .from('financiamento_atividades')
                                    .delete()
                                    .eq('financiamento_id', financiamento.id);
                                  
                                  // Depois, deletar o financiamento
                                  const { error } = await supabase
                                    .from('financiamentos')
                                    .delete()
                                    .eq('id', financiamento.id);
                                  
                                  if (error) throw error;
                                  
                                  toast({
                                    title: "Sucesso",
                                    description: "Financiamento excluído com sucesso"
                                  });
                                  
                                  fetchProjetoDetalhes();
                                } catch (error) {
                                  console.error('Erro ao excluir financiamento:', error);
                                  toast({
                                    title: "Erro",
                                    description: "Não foi possível excluir o financiamento",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t.projectDetails.financing.totalAmount}</p>
                        <p className="text-lg font-semibold">
                          {Number(financiamento.valor_total).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {projeto?.moeda}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t.projectDetails.financing.availableAmount}</p>
                        <p className="text-lg font-semibold" style={{ color: financiamento.valor_disponivel <= 0 ? '#EF4444' : '#10B981' }}>
                          {Number(financiamento.valor_disponivel).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {projeto?.moeda}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t.projectDetails.financing.allocatedAmount}</p>
                        <p className="text-lg font-semibold">
                          {(Number(financiamento.valor_total) - Number(financiamento.valor_disponivel)).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {projeto?.moeda}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Utilização</span>
                        <span>{((1 - Number(financiamento.valor_disponivel) / Number(financiamento.valor_total)) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={(1 - Number(financiamento.valor_disponivel) / Number(financiamento.valor_total)) * 100} 
                        className="h-2"
                      />
                    </div>

                    {financiamento.financiamento_atividades && financiamento.financiamento_atividades.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium mb-3">Alocações ({financiamento.financiamento_atividades.length})</h4>
                        <div className="space-y-2">
                          {financiamento.financiamento_atividades.map((alocacao: any) => {
                            const atividade = atividades.find(a => a.id === alocacao.atividade_id);
                            return (
                              <div key={alocacao.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                                <span className="font-medium">{atividade?.nome || 'Rubrica não encontrada'}</span>
                                <span className="text-muted-foreground">
                                  {Number(alocacao.valor_alocado).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {projeto?.moeda}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        )}
      </Tabs>

      {/* Dialog Editar Financiamento */}
      <Dialog open={isEditFinanciamentoOpen} onOpenChange={setIsEditFinanciamentoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.projectDetails.financing.edit}</DialogTitle>
          </DialogHeader>
          {editingFinanciamento && (
            <form onSubmit={handleEditarFinanciamento} className="space-y-4">
              <div>
                <Label htmlFor="edit-nome-financiamento">{t.projectDetails.financing.name} *</Label>
                <Input
                  id="edit-nome-financiamento"
                  value={editingFinanciamento.nome}
                  onChange={(e) => setEditingFinanciamento({ ...editingFinanciamento, nome: e.target.value })}
                  placeholder={t.projectDetails.financing.namePlaceholder}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-descricao-financiamento">{t.projectDetails.financing.description}</Label>
                <Textarea
                  id="edit-descricao-financiamento"
                  value={editingFinanciamento.descricao || ""}
                  onChange={(e) => setEditingFinanciamento({ ...editingFinanciamento, descricao: e.target.value })}
                  placeholder={t.projectDetails.financing.descriptionPlaceholder}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-valor-financiamento">{t.projectDetails.financing.totalValue} ({projeto?.moeda}) *</Label>
                <Input
                  id="edit-valor-financiamento"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingFinanciamento.valor_total}
                  onChange={(e) => setEditingFinanciamento({ ...editingFinanciamento, valor_total: e.target.value })}
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t.projectDetails.financing.allocatedAmount}: {(Number(editingFinanciamento.valor_total_original) - Number(editingFinanciamento.valor_disponivel)).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {projeto?.moeda}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditFinanciamentoOpen(false);
                  setEditingFinanciamento(null);
                }}>
                  {t.common.cancel}
                </Button>
                <Button type="submit">
                  {t.projectDetails.financing.save}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Atividade */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.projectDetails.editActivity.title}</DialogTitle>
          </DialogHeader>
          {editingAtividade && <form onSubmit={handleEditarAtividade} className="space-y-4">
              <div>
                <Label htmlFor="edit-nome">{t.projectDetails.editActivity.name} *</Label>
                <Input id="edit-nome" value={editingAtividade.nome} onChange={e => setEditingAtividade({
              ...editingAtividade,
              nome: e.target.value
            })} required />
              </div>
              <div>
                <Label htmlFor="edit-descricao">{t.projectDetails.editActivity.description}</Label>
                <Textarea id="edit-descricao" value={editingAtividade.descricao || ""} onChange={e => setEditingAtividade({
              ...editingAtividade,
              descricao: e.target.value
            })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-dataInicio">{t.projectDetails.editActivity.startDate}</Label>
                  <Input 
                    id="edit-dataInicio" 
                    type="date" 
                    min={projeto?.data_inicio || undefined}
                    max={projeto?.data_fim || undefined}
                    value={editingAtividade.data_inicio || ""} 
                    onChange={e => setEditingAtividade({
                      ...editingAtividade,
                      data_inicio: e.target.value
                    })} 
                  />
                  {projeto?.data_inicio && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.sidebar.projects}: {new Date(projeto.data_inicio).toLocaleDateString('pt-BR')} - {projeto.data_fim ? new Date(projeto.data_fim).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-dataFim">{t.projectDetails.editActivity.endDate}</Label>
                  <Input 
                    id="edit-dataFim" 
                    type="date" 
                    min={projeto?.data_inicio || undefined}
                    max={projeto?.data_fim || undefined}
                    value={editingAtividade.data_fim || ""} 
                    onChange={e => setEditingAtividade({
                      ...editingAtividade,
                      data_fim: e.target.value
                    })} 
                  />
                </div>
              </div>
              <div>
                <Label>{t.projectDetails.editActivity.responsible}</Label>
                <Select value={editingAtividade.responsavel_id || ""} onValueChange={value => setEditingAtividade({
              ...editingAtividade,
              responsavel_id: value
            })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.projectDetails.editActivity.responsible} />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map(profile => <SelectItem key={profile.id} value={profile.id}>
                        {profile.nome}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.projectDetails.editActivity.priority}</Label>
                <Select value={editingAtividade.prioridade} onValueChange={value => setEditingAtividade({
              ...editingAtividade,
              prioridade: value
            })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">{t.projectDetails.priority.low}</SelectItem>
                    <SelectItem value="media">{t.projectDetails.priority.medium}</SelectItem>
                    <SelectItem value="alta">{t.projectDetails.priority.high}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.projectDetails.editActivity.status}</Label>
                <Select value={editingAtividade.status} onValueChange={value => setEditingAtividade({
              ...editingAtividade,
              status: value
            })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">{t.projectDetails.status.pending}</SelectItem>
                    <SelectItem value="em_andamento">{t.projectDetails.status.inProgress}</SelectItem>
                    <SelectItem value="concluida">{t.projectDetails.status.completed}</SelectItem>
                    <SelectItem value="cancelada">{t.projectDetails.status.cancelled}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-orcamento">{t.projectDetails.editActivity.budget} (MZN)</Label>
                <Input id="edit-orcamento" type="number" step="0.01" placeholder="0.00" value={editingAtividade.orcamento || ""} onChange={e => setEditingAtividade({
              ...editingAtividade,
              orcamento: e.target.value
            })} />
                <p className="text-xs text-muted-foreground mt-1">
                  {t.projectDetails.finances.totalBudget}: {projeto?.orcamento ? Number(projeto.orcamento).toLocaleString("pt-MZ") : "0"} MZN
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit">{t.projectDetails.editActivity.save}</Button>
              </div>
            </form>}
        </DialogContent>
      </Dialog>

      {/* AlertDialog Confirmação Orçamento Excedido */}
      <AlertDialog open={isConfirmExceedBudget} onOpenChange={setIsConfirmExceedBudget}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Orçamento Excedido
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {exceedBudgetData && <>
                  <p>
                    O valor da fatura <strong>{exceedBudgetData.valorFatura.toLocaleString("pt-MZ")} MZN</strong> excede
                    o orçamento restante {exceedBudgetData.tipo === 'atividade' ? `da atividade "${exceedBudgetData.nomeAtividade}"` : 'do projeto'} de{" "}
                    <strong>{exceedBudgetData.orcamentoRestante.toLocaleString("pt-MZ")} MZN</strong>.
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Orçamento total {exceedBudgetData.tipo === 'atividade' ? 'da atividade' : 'do projeto'}: {exceedBudgetData.orcamentoTotal.toLocaleString("pt-MZ")} MZN
                  </p>
                  <p className="pt-2">
                    Deseja continuar mesmo assim?
                  </p>
                  {exceedBudgetData.tipo === 'atividade' && <p className="text-amber-600 text-sm font-medium pt-2">
                      Se confirmar, a fatura será submetida mas marcada como "acima do orçamento".
                    </p>}
                </>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
            setIsConfirmExceedBudget(false);
            setExceedBudgetData(null);
          }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
            if (exceedBudgetData) {
              // Recalcular totais no momento da confirmação
              const {
                data: faturasAprovadas
              } = await supabase.from("faturas").select("valor").eq("projeto_id", id).eq("status", "aprovada");
              const totalFaturasAprovadas = faturasAprovadas?.reduce((acc, f) => acc + Number(f.valor || 0), 0) || 0;
              const novoTotalComFatura = totalFaturasAprovadas + exceedBudgetData.valorFatura;
              processarFatura(exceedBudgetData.valorFatura, totalFaturasAprovadas, novoTotalComFatura);
            }
          }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Confirmação Saldo Insuficiente */}
      <AlertDialog open={isConfirmSaldoInsuficiente} onOpenChange={setIsConfirmSaldoInsuficiente}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Saldo Insuficiente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {webhookResponse && webhookResponse.invoice_data && (
                <>
                  <p className="font-medium text-foreground">
                    O saldo disponível é insuficiente para aprovar esta fatura.
                  </p>
                  
                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fatura:</span>
                      <span className="font-semibold">{webhookResponse.invoice_data.dados_fatura?.numero_fatura}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor Total:</span>
                      <span className="font-semibold">{webhookResponse.invoice_data.dados_fatura?.total_liquido?.toLocaleString("pt-MZ")} MZN</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fornecedor:</span>
                      <span className="font-medium">{webhookResponse.invoice_data.fornecedor?.nome}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground pt-2">
                    Deseja continuar e registar esta fatura mesmo assim?
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsConfirmSaldoInsuficiente(false);
              setWebhookResponse(null);
              setIsProcessing(false);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmarSaldoInsuficiente}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "A processar..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Detalhes da Fatura */}
      <Dialog open={!!faturaDetalhes} onOpenChange={(open) => {
        if (!open) {
          setFaturaDetalhes(null);
          setItensFatura([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t.projectDetails.finances.invoiceDetails}
            </DialogTitle>
            <DialogDescription>
              {faturaDetalhes?.numero}
            </DialogDescription>
          </DialogHeader>
          
          {faturaDetalhes && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t.projectDetails.finances.invoiceNumber}</span>
                  <p className="font-medium">{faturaDetalhes.numero}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t.common.status}</span>
                  <div>{getFaturaStatusBadge(faturaDetalhes.status)}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t.projectDetails.finances.totalValue}</span>
                  <p className="font-bold text-lg text-primary">
                    {Number(faturaDetalhes.valor).toLocaleString("pt-MZ")} {projeto?.moeda || 'MZN'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t.projectDetails.finances.issueDate}</span>
                  <p className="font-medium">
                    {new Date(faturaDetalhes.data_emissao).toLocaleDateString("pt-PT")}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t.projectDetails.tabs.activities}</span>
                  <p className="font-medium">{faturaDetalhes.atividade?.nome || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t.projectDetails.finances.downloadFile}</span>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-sm font-medium flex items-center gap-1" 
                    onClick={() => handleDownloadFile(faturaDetalhes.arquivo_url, faturaDetalhes.arquivo_nome)}
                  >
                    <Download className="h-3 w-3" />
                    {faturaDetalhes.arquivo_nome}
                  </Button>
                </div>
              </div>

              {faturaDetalhes.descricao && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t.common.description}</span>
                  <p className="text-sm">{faturaDetalhes.descricao}</p>
                </div>
              )}

              {faturaDetalhes.motivo_rejeicao && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">{t.projectDetails.finances.rejectionReason}:</span>
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">{faturaDetalhes.motivo_rejeicao}</p>
                </div>
              )}

              {/* Itens da Fatura */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  {t.projectDetails.finances.invoiceItems} ({itensFatura.length})
                </h4>
                
                {isLoadingItensFatura ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">{t.projectDetails.finances.loadingItems}</span>
                  </div>
                ) : itensFatura.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    {t.projectDetails.finances.noItems}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.common.description}</TableHead>
                        <TableHead className="text-center">{t.projectDetails.finances.quantity}</TableHead>
                        <TableHead className="text-right">{t.projectDetails.finances.unitValue}</TableHead>
                        <TableHead className="text-right">{t.projectDetails.finances.total}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensFatura.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.descricao}</TableCell>
                          <TableCell className="text-center">{Number(item.quantidade).toLocaleString("pt-MZ")}</TableCell>
                          <TableCell className="text-right">
                            {Number(item.valor_unitario).toLocaleString("pt-MZ")} {projeto?.moeda || 'MZN'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {Number(item.valor_total || (item.quantidade * item.valor_unitario)).toLocaleString("pt-MZ")} {projeto?.moeda || 'MZN'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Recibos */}
              {faturaDetalhes.recibos && faturaDetalhes.recibos.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    {t.projectDetails.finances.receipts} ({faturaDetalhes.recibos.length})
                  </h4>
                  <div className="space-y-2">
                    {faturaDetalhes.recibos.map((recibo: any) => (
                      <div key={recibo.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{recibo.arquivo_nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {Number(recibo.valor).toLocaleString("pt-MZ")} {projeto?.moeda || 'MZN'}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownloadFile(recibo.arquivo_url, recibo.arquivo_nome)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Atividade */}
      <Dialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              {t.projectDetails.newSubactivity.title}
            </DialogTitle>
            <DialogDescription>
              {t.projectDetails.newSubactivity.subtitle}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCriarSubatividade} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="sub-nome" className="text-sm font-medium flex items-center gap-2">
                <span className="text-destructive">*</span>
                {t.projectDetails.newSubactivity.name}
              </Label>
              <Input 
                id="sub-nome" 
                placeholder="Ex: Preparação do terreno, Instalação de equipamentos..." 
                value={formSubatividade.nome} 
                onChange={e => setFormSubatividade({
                  ...formSubatividade,
                  nome: e.target.value
                })} 
                required 
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-descricao" className="text-sm font-medium">
                {t.projectDetails.newSubactivity.description}
              </Label>
              <Textarea 
                id="sub-descricao" 
                placeholder={t.common.description}
                value={formSubatividade.descricao} 
                onChange={e => setFormSubatividade({
                  ...formSubatividade,
                  descricao: e.target.value
                })} 
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-responsavel" className="text-sm font-medium">
                {t.projectDetails.newSubactivity.responsible}
              </Label>
              <Select 
                value={formSubatividade.responsavel_id} 
                onValueChange={value => setFormSubatividade({
                  ...formSubatividade,
                  responsavel_id: value
                })}
              >
                <SelectTrigger id="sub-responsavel" className="h-11">
                  <SelectValue placeholder={t.projectDetails.editActivity.responsible} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setIsSubDialogOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" className="gap-2">
                <Plus className="h-4 w-4" />
                {t.projectDetails.newSubactivity.create}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição do Projeto */}
      <Dialog open={isEditProjetoDialogOpen} onOpenChange={setIsEditProjetoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.projectDetails.editProject.title}</DialogTitle>
            <DialogDescription>{t.projectDetails.editProject.title}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditarProjeto} className="space-y-4">
            <div>
              <Label htmlFor="edit-nome">{t.projectDetails.editProject.name} *</Label>
              <Input
                id="edit-nome"
                placeholder={t.projectDetails.editProject.name}
                value={formProjeto.nome}
                onChange={(e) => setFormProjeto({ ...formProjeto, nome: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                placeholder="Descreva o projeto..."
                value={formProjeto.descricao}
                onChange={(e) => setFormProjeto({ ...formProjeto, descricao: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <LocationMapPicker
                value={formProjeto.localizacao}
                onChange={(location, lat, lng) => setFormProjeto({ ...formProjeto, localizacao: location, latitude: lat, longitude: lng })}
                initialLat={formProjeto.latitude || undefined}
                initialLng={formProjeto.longitude || undefined}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-data-inicio">Data de Início</Label>
                <Input
                  id="edit-data-inicio"
                  type="date"
                  value={formProjeto.data_inicio}
                  onChange={(e) => setFormProjeto({ ...formProjeto, data_inicio: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-data-fim">Data de Fim</Label>
                <Input
                  id="edit-data-fim"
                  type="date"
                  value={formProjeto.data_fim}
                  onChange={(e) => setFormProjeto({ ...formProjeto, data_fim: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-orcamento">Orçamento (MZN)</Label>
                <Input
                  id="edit-orcamento"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formProjeto.orcamento}
                  onChange={(e) => setFormProjeto({ ...formProjeto, orcamento: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-status">Estado</Label>
                <Select value={formProjeto.status} onValueChange={(value) => setFormProjeto({ ...formProjeto, status: value })}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejamento">Planeamento</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-cor">Cor do Projeto</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="edit-cor"
                  type="color"
                  value={formProjeto.cor}
                  onChange={(e) => setFormProjeto({ ...formProjeto, cor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formProjeto.cor}
                  onChange={(e) => setFormProjeto({ ...formProjeto, cor: e.target.value })}
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditProjetoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>;
};
export default ProjetoDetalhes;