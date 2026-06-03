import { useState, useEffect } from "react";
import { Plus, Search, Users, Calendar, Loader2, Upload, FileText, Check, X, Play, CheckCircle, XCircle, Clock, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/hooks/useTranslations";
import { PageSkeleton } from "@/components/PageSkeleton";

const Atividades = () => {
  const {
    toast
  } = useToast();
  const t = useTranslations();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [atividades, setAtividades] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [confirmacoesPendentes, setConfirmacoesPendentes] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState("todos");
  const [selectedStatus, setSelectedStatus] = useState("todos");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isGestor, setIsGestor] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingUserRole, setIsLoadingUserRole] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    atividadeId: string;
    confirmacaoId?: string;
    action: 'aprovar' | 'rejeitar' | null;
    observacao: string;
  }>({
    open: false,
    atividadeId: '',
    confirmacaoId: undefined,
    action: null,
    observacao: ''
  });
  const [formData, setFormData] = useState({
    projeto_id: "",
    nome: "",
    descricao: "",
    responsavel_id: "",
    status: "pendente",
    prioridade: "media",
    data_inicio: "",
    data_fim: "",
    cor: "#10B981",
    orcamento: "",
    financiamento_id: ""
  });
  const [projetoSaldo, setProjetoSaldo] = useState<number | null>(null);
  const [projetoMoeda, setProjetoMoeda] = useState<string>("MZN");
  const [projetoSelecionado, setProjetoSelecionado] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [financiamentos, setFinanciamentos] = useState<any[]>([]);
  const [financiamentoSelecionado, setFinanciamentoSelecionado] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const activitiesPerPage = 8;
  useEffect(() => {
    fetchData();
    checkUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchData();
    }
  }, [userRole]);

  useEffect(() => {
    if (isGestor) {
      fetchConfirmacoesPendentes();
    }
  }, [isGestor]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProject, selectedStatus]);

  // Filtered activities logic
  const atividadesFiltradas = atividades.filter(atividade => {
    const matchesSearch = atividade.nome.toLowerCase().includes(searchTerm.toLowerCase()) || atividade.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProject === "todos" || atividade.projeto_id === selectedProject;
    const matchesStatus = selectedStatus === "todos" || atividade.status === selectedStatus;
    return matchesSearch && matchesProject && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(atividadesFiltradas.length / activitiesPerPage);
  const startIndex = (currentPage - 1) * activitiesPerPage;
  const endIndex = startIndex + activitiesPerPage;
  const atividadesPaginadas = atividadesFiltradas.slice(startIndex, endIndex);

  const fetchConfirmacoesPendentes = async () => {
    try {
      const { data: confirmacoesData, error: confirmacoesError } = await (supabase as any)
        .from('atividade_confirmacoes')
        .select(`
          *,
          atividades(
            id,
            nome,
            projetos(nome),
            profiles(nome)
          )
        `)
        .eq('status', 'pendente')
        .order('confirmado_em', { ascending: true });

      if (!confirmacoesError && confirmacoesData) {
        setConfirmacoesPendentes(confirmacoesData);
      }
    } catch (error) {
      console.error('Erro ao buscar confirmações pendentes:', error);
    }
  };
  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const [atividadesRes, projetosRes, profilesRes, confirmacoesRes] = await Promise.all([
        (supabase as any).from('atividades').select(`
          *,
          projetos(nome),
          profiles(nome),
          atividade_confirmacoes(id, status, motivo_rejeicao, aprovado_em, confirmado_em)
        `).order('created_at', { ascending: false }),
        (supabase as any).from('projetos').select('id, nome, orcamento, moeda, data_inicio, data_fim'),
        (supabase as any).from('profiles').select('id, nome'),
        user ? (supabase as any).from('atividade_confirmacoes')
          .select('atividade_id, status')
          .eq('user_id', user.id) : Promise.resolve({ data: [] })
      ]);
      
      if (atividadesRes.error) throw atividadesRes.error;
      if (projetosRes.error) throw projetosRes.error;
      if (profilesRes.error) throw profilesRes.error;
      
      // Mapear confirmações por atividade_id
      const confirmacoesMap = new Map(
        (confirmacoesRes?.data || []).map((c: any) => [c.atividade_id, c.status])
      );
      
      // Se for colaborador, filtrar apenas atividades onde é responsável
      let atividadesComStatus;
      if (userRole === 'Colaborador' && user) {
        const atividadesFiltradas = (atividadesRes.data || []).filter(
          (a: any) => a.responsavel_id === user.id
        );
        atividadesComStatus = atividadesFiltradas.map((a: any) => {
          const confirmacaoPendente = a.atividade_confirmacoes?.find(
            (c: any) => c.status === 'pendente'
          );
          const confirmacaoRejeitada = a.atividade_confirmacoes?.find(
            (c: any) => c.status === 'rejeitado'
          );
          
          return {
            ...a,
            confirmacao_status: confirmacaoPendente?.status || null,
            confirmacao_id: confirmacaoPendente?.id || null,
            motivo_rejeicao: confirmacaoRejeitada?.motivo_rejeicao || null,
            rejeitado_em: confirmacaoRejeitada?.aprovado_em || null
          };
        });
      } else {
        atividadesComStatus = (atividadesRes.data || []).map((a: any) => {
          const confirmacaoPendente = a.atividade_confirmacoes?.find(
            (c: any) => c.status === 'pendente'
          );
          const confirmacaoRejeitada = a.atividade_confirmacoes?.find(
            (c: any) => c.status === 'rejeitado'
          );
          
          return {
            ...a,
            confirmacao_status: confirmacaoPendente?.status || null,
            confirmacao_id: confirmacaoPendente?.id || null,
            motivo_rejeicao: confirmacaoRejeitada?.motivo_rejeicao || null,
            rejeitado_em: confirmacaoRejeitada?.aprovado_em || null
          };
        });
      }
      
      setAtividades(atividadesComStatus);
      
      setProjetos(projetosRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    }
  };

  const checkUserRole = async () => {
    try {
      setIsLoadingUserRole(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUser(user);

      // Check role from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("role_id, roles(nome)")
        .eq("id", user.id)
        .single();
      
      const roleName = (profile as any)?.roles?.nome;
      setUserRole(roleName);

      // Check if user is gestor or admin
      const { data: userRoles } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isGestorOrAdmin = userRoles?.some((r: any) => 
        r.role === 'gestor' || r.role === 'admin'
      );
      
      setIsGestor(isGestorOrAdmin || false);
    } catch (error) {
      console.error('Erro ao verificar role:', error);
    } finally {
      setIsLoadingUserRole(false);
    }
  };

  const handleIniciarAtividade = async (atividadeId: string) => {
    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('atividades')
        .update({ status: 'em_andamento' })
        .eq('id', atividadeId);

      if (error) throw error;

      toast({
        title: t.common.success,
        description: t.activities.activityStarted
      });

      fetchData();
    } catch (error) {
      console.error('Erro ao iniciar atividade:', error);
      toast({
        title: t.common.error,
        description: t.activities.errorStarting,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmarConclusao = async (atividadeId: string) => {
    setIsLoading(true);
    try {
      // Verificar se já existe qualquer confirmação (independente do status)
      const { data: existingConfirmation } = await (supabase as any)
        .from('atividade_confirmacoes')
        .select('id, status')
        .eq('atividade_id', atividadeId)
        .eq('user_id', currentUser?.id)
        .maybeSingle();

      if (existingConfirmation) {
        const mensagem = existingConfirmation.status === 'pendente'
          ? t.activities.alreadySentForApproval
          : existingConfirmation.status === 'aprovado'
          ? t.activities.alreadyApproved
          : t.activities.alreadyProcessed;
        
        toast({
          title: t.activities.attention,
          description: mensagem,
          variant: "destructive"
        });
        return;
      }

      // Create confirmation record
      const { error: confirmError } = await (supabase as any)
        .from('atividade_confirmacoes')
        .insert({
          atividade_id: atividadeId,
          user_id: currentUser?.id,
          status: 'pendente',
          confirmado_em: new Date().toISOString()
        });

      if (confirmError) throw confirmError;

      toast({
        title: t.common.success,
        description: t.activities.conclusionSent
      });

      fetchData();
    } catch (error) {
      console.error('Erro ao confirmar conclusão:', error);
      toast({
        title: t.common.error,
        description: t.activities.errorConfirming,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelarAtividade = async (atividadeId: string) => {
    setIsLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('atividades')
        .update({ status: 'pendente' })
        .eq('id', atividadeId);

      if (error) throw error;

      toast({
        title: t.common.success,
        description: t.activities.activityCancelled,
      });

      fetchData();
    } catch (error) {
      console.error('Erro ao cancelar atividade:', error);
      toast({
        title: t.common.error,
        description: t.activities.errorCancelling,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAprovarRejeitar = async () => {
    if (!confirmDialog.action || !confirmDialog.confirmacaoId) return;

    setIsLoading(true);
    try {
      const newStatus = confirmDialog.action === 'aprovar' ? 'aprovado' : 'rejeitado';
      
      // Update existing confirmation record
      const { error: confirmError } = await (supabase as any)
        .from('atividade_confirmacoes')
        .update({
          status: newStatus,
          aprovado_por: currentUser?.id,
          aprovado_em: new Date().toISOString(),
          observacao: confirmDialog.observacao,
          motivo_rejeicao: confirmDialog.action === 'rejeitar' ? confirmDialog.observacao : null
        })
        .eq('id', confirmDialog.confirmacaoId);

      if (confirmError) throw confirmError;

      // Update atividade status
      if (confirmDialog.action === 'aprovar') {
        const { error: updateError } = await (supabase as any)
          .from('atividades')
          .update({ status: 'concluida' })
          .eq('id', confirmDialog.atividadeId);

        if (updateError) throw updateError;
      } else {
        // Se rejeitado, volta para pendente
        const { error: updateError } = await (supabase as any)
          .from('atividades')
          .update({ status: 'pendente' })
          .eq('id', confirmDialog.atividadeId);

        if (updateError) throw updateError;
      }

      toast({
        title: t.common.success,
        description: confirmDialog.action === 'aprovar' ? t.activities.activityApproved : t.activities.activityRejected
      });

      setConfirmDialog({ open: false, atividadeId: '', confirmacaoId: undefined, action: null, observacao: '' });
      fetchData();
      fetchConfirmacoesPendentes();
    } catch (error) {
      console.error('Erro ao processar:', error);
      toast({
        title: t.common.error,
        description: t.activities.errorProcessing,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          title: "Erro",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Buscar informações do projeto para validação de datas
      const projetoSelecionado = projetos.find(p => p.id === formData.projeto_id);
      
      // Validar orçamento com o financiamento selecionado
      if (formData.financiamento_id && formData.orcamento) {
        const valorOrcamento = parseFloat(formData.orcamento);
        const financiamento = financiamentos.find(f => f.id === formData.financiamento_id);
        
        if (financiamento) {
          if (valorOrcamento > financiamento.valor_disponivel) {
            toast({
              title: "Orçamento excedido",
              description: `O valor da rubrica (${valorOrcamento.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} ${projetoMoeda}) excede o valor disponível do financiamento (${financiamento.valor_disponivel.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} ${projetoMoeda}). Cadastro rejeitado.`,
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Validar datas em relação ao projeto
      if (formData.data_inicio && projetoSelecionado?.data_inicio) {
        const dataInicioAtividade = new Date(formData.data_inicio);
        const dataInicioProjeto = new Date(projetoSelecionado.data_inicio);
        
        if (dataInicioAtividade < dataInicioProjeto) {
          toast({
            title: "Data inválida",
            description: `A data de início da atividade não pode ser anterior à data de início do projeto (${new Date(projetoSelecionado.data_inicio).toLocaleDateString('pt-BR')})`,
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }
      
      if (formData.data_fim && projetoSelecionado?.data_fim) {
        const dataFimAtividade = new Date(formData.data_fim);
        const dataFimProjeto = new Date(projetoSelecionado.data_fim);
        
        if (dataFimAtividade > dataFimProjeto) {
          toast({
            title: "Data inválida",
            description: `A data de fim da atividade não pode ser posterior à data de fim do projeto (${new Date(projetoSelecionado.data_fim).toLocaleDateString('pt-BR')})`,
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Validar que data de início não seja posterior à data de fim
      if (formData.data_inicio && formData.data_fim) {
        const dataInicio = new Date(formData.data_inicio);
        const dataFim = new Date(formData.data_fim);
        
        if (dataInicio > dataFim) {
          toast({
            title: "Data inválida",
            description: "A data de início não pode ser posterior à data de fim da atividade",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }
      
      let faturaUrl = null;

      // Upload do arquivo se foi selecionado
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;
        const {
          error: uploadError
        } = await supabase.storage.from('faturas').upload(filePath, selectedFile);
        if (uploadError) throw uploadError;

        // Obter URL pública
        const {
          data: urlData
        } = supabase.storage.from('faturas').getPublicUrl(filePath);
        faturaUrl = urlData.publicUrl;
      }
      
      // Inserir a atividade
      const {
        data: atividadeData,
        error
      } = await (supabase as any).from('atividades').insert([{
        projeto_id: formData.projeto_id,
        nome: formData.nome,
        descricao: formData.descricao,
        responsavel_id: formData.responsavel_id || null,
        status: formData.status,
        prioridade: formData.prioridade,
        data_inicio: formData.data_inicio || null,
        data_fim: formData.data_fim || null,
        cor: formData.cor,
        orcamento: formData.orcamento ? parseFloat(formData.orcamento) : null,
        fatura_url: faturaUrl
      }]).select();
      if (error) throw error;
      
      // Se um financiamento foi selecionado, criar o vínculo e atualizar o valor disponível
      if (formData.financiamento_id && formData.orcamento && atividadeData && atividadeData.length > 0) {
        const valorAlocado = parseFloat(formData.orcamento);
        const atividadeId = atividadeData[0].id;
        
        // Inserir o vínculo na tabela financiamento_atividades
        const { error: vinculoError } = await supabase
          .from('financiamento_atividades')
          .insert({
            financiamento_id: formData.financiamento_id,
            atividade_id: atividadeId,
            valor_alocado: valorAlocado
          });
        
        if (vinculoError) throw vinculoError;
        
        // Atualizar o valor disponível do financiamento
        const financiamento = financiamentos.find(f => f.id === formData.financiamento_id);
        if (financiamento) {
          const novoValorDisponivel = financiamento.valor_disponivel - valorAlocado;
          
          const { error: updateError } = await supabase
            .from('financiamentos')
            .update({ valor_disponivel: novoValorDisponivel })
            .eq('id', formData.financiamento_id);
          
          if (updateError) throw updateError;
        }
      }
      
      toast({
        title: t.common.success,
        description: "Rubrica criada com sucesso! Financiamento atualizado."
      });
      setIsDialogOpen(false);
      setFormData({
        projeto_id: "",
        nome: "",
        descricao: "",
        responsavel_id: "",
        status: "pendente",
        prioridade: "media",
        data_inicio: "",
        data_fim: "",
        cor: "#10B981",
        orcamento: "",
        financiamento_id: ""
      });
      setProjetoSaldo(null);
      setProjetoMoeda("MZN");
      setProjetoSelecionado(null);
      setSelectedFile(null);
      setFinanciamentos([]);
      setFinanciamentoSelecionado(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao criar atividade:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a tarefa.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const getEstadoBadge = (estado: string) => {
    const variants: {
      [key: string]: string;
    } = {
      pendente: "bg-gray-100 text-gray-800",
      em_andamento: "bg-green-100 text-green-800",
      concluida: "bg-blue-100 text-blue-800",
      cancelada: "bg-red-100 text-red-800"
    };
    return variants[estado] || "bg-gray-100 text-gray-800";
  };
  const getEstadoLabel = (estado: string) => {
    const labels: {
      [key: string]: string;
    } = {
      pendente: t.activities.pending,
      em_andamento: t.activities.inProgress,
      concluida: t.activities.completed,
      cancelada: t.activities.cancelled
    };
    return labels[estado] || estado;
  };
  return (
    <>
      {isLoadingUserRole ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{t.activities.title}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">{t.activities.subtitle}</p>
        </div>
        {userRole !== 'Colaborador' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto" size="sm">
                <Plus className="h-4 w-4" />
                <span className="sm:inline">{t.activities.newActivity}</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.activities.newActivity}</DialogTitle>
              <DialogDescription>
                {t.activities.activityDescription}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="projeto">{t.activities.project} *</Label>
                <Select value={formData.projeto_id} onValueChange={async (value) => {
                  setFormData({
                    ...formData,
                    projeto_id: value,
                    financiamento_id: ""
                  });
                  
                  // Calcular saldo disponível do projeto
                  const projetoSel = projetos.find(p => p.id === value);
                  if (projetoSel) {
                    setProjetoSelecionado(projetoSel);
                    setProjetoMoeda(projetoSel.moeda || 'MZN');
                    
                    // Buscar soma dos orçamentos das atividades deste projeto
                    const { data: atividadesProjeto } = await supabase
                      .from('atividades')
                      .select('orcamento')
                      .eq('projeto_id', value);
                    
                    const totalAlocado = atividadesProjeto?.reduce((sum, a) => sum + (Number(a.orcamento) || 0), 0) || 0;
                    const orcamentoTotal = Number(projetoSel.orcamento) || 0;
                    const saldo = orcamentoTotal - totalAlocado;
                    setProjetoSaldo(saldo);
                    
                    // Buscar financiamentos disponíveis para este projeto
                    const { data: financiamentosData } = await supabase
                      .from('financiamentos')
                      .select('*')
                      .eq('projeto_id', value)
                      .eq('ativo', true)
                      .gt('valor_disponivel', 0);
                    
                    setFinanciamentos(financiamentosData || []);
                  }
                }} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t.activities.selectProject} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {projetos.map(projeto => <SelectItem key={projeto.id} value={projeto.id}>
                        {projeto.nome}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                {projetoSaldo !== null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.activities.availableBalance}: {projetoSaldo.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} {projetoMoeda}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="nome">{t.activities.activityName} *</Label>
                <Input id="nome" placeholder="Ex: Fundações" value={formData.nome} onChange={e => setFormData({
                ...formData,
                nome: e.target.value
              })} required />
              </div>
              <div>
                <Label htmlFor="descricao">{t.common.description}</Label>
                <Textarea id="descricao" placeholder="Descreva a tarefa..." rows={3} value={formData.descricao} onChange={e => setFormData({
                ...formData,
                descricao: e.target.value
              })} />
              </div>
              <div>
                <Label htmlFor="financiamento">{t.activities.financing}</Label>
                <Select 
                  value={formData.financiamento_id} 
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      financiamento_id: value
                    });
                    const financ = financiamentos.find(f => f.id === value);
                    setFinanciamentoSelecionado(financ);
                  }}
                  disabled={!formData.projeto_id || financiamentos.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={financiamentos.length === 0 ? t.activities.noFinancingAvailable : t.activities.selectFinancing} />
                  </SelectTrigger>
                  <SelectContent>
                    {financiamentos.map(financ => (
                      <SelectItem key={financ.id} value={financ.id}>
                        {financ.nome} - Disponível: {Number(financ.valor_disponivel).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {projetoMoeda}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {financiamentoSelecionado && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.activities.availableValue}: {Number(financiamentoSelecionado.valor_disponivel).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {projetoMoeda}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="orcamento">{t.activities.budget} ({projetoMoeda})</Label>
                <Input 
                  id="orcamento" 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  value={formData.orcamento} 
                  onChange={e => setFormData({
                    ...formData,
                    orcamento: e.target.value
                  })} 
                />
                {formData.orcamento && financiamentoSelecionado && parseFloat(formData.orcamento) > financiamentoSelecionado.valor_disponivel && (
                  <p className="text-sm text-destructive mt-1">
                    ⚠️ {t.activities.valueExceedsFinancing}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataInicio">{t.activities.startDate}</Label>
                  <Input 
                    id="dataInicio" 
                    type="date" 
                    min={projetoSelecionado?.data_inicio || undefined}
                    max={projetoSelecionado?.data_fim || undefined}
                    value={formData.data_inicio} 
                    onChange={e => {
                      const novaData = e.target.value;
                      
                      // Validar se está dentro do período do projeto
                      if (novaData && projetoSelecionado?.data_inicio) {
                        const dataInicio = new Date(novaData);
                        const dataInicioProjeto = new Date(projetoSelecionado.data_inicio);
                        
                      if (dataInicio < dataInicioProjeto) {
                          toast({
                            title: t.activities.invalidDate,
                            description: `${t.activities.dateCannotBeBefore} ${dataInicioProjeto.toLocaleDateString('pt-BR')}`,
                            variant: "destructive"
                          });
                          return;
                        }
                      }
                      
                      if (novaData && projetoSelecionado?.data_fim) {
                        const dataInicio = new Date(novaData);
                        const dataFimProjeto = new Date(projetoSelecionado.data_fim);
                        
                        if (dataInicio > dataFimProjeto) {
                          toast({
                            title: t.activities.invalidDate,
                            description: `${t.activities.dateCannotBeAfter} ${dataFimProjeto.toLocaleDateString('pt-BR')}`,
                            variant: "destructive"
                          });
                          return;
                        }
                      }
                      
                      setFormData({
                        ...formData,
                        data_inicio: novaData
                      });
                    }} 
                  />
                  {projetoSelecionado?.data_inicio && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.activities.projectFrom}: {new Date(projetoSelecionado.data_inicio).toLocaleDateString('pt-BR')} {t.activities.to} {projetoSelecionado.data_fim ? new Date(projetoSelecionado.data_fim).toLocaleDateString('pt-BR') : t.activities.noEndDate}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="dataFim">{t.activities.endDate}</Label>
                  <Input 
                    id="dataFim" 
                    type="date" 
                    min={projetoSelecionado?.data_inicio || undefined}
                    max={projetoSelecionado?.data_fim || undefined}
                    value={formData.data_fim} 
                    onChange={e => {
                      const novaData = e.target.value;
                      
                      // Validar se está dentro do período do projeto
                      if (novaData && projetoSelecionado?.data_inicio) {
                        const dataFim = new Date(novaData);
                        const dataInicioProjeto = new Date(projetoSelecionado.data_inicio);
                        
                      if (dataFim < dataInicioProjeto) {
                          toast({
                            title: t.activities.invalidDate,
                            description: `${t.activities.dateCannotBeBefore} ${dataInicioProjeto.toLocaleDateString('pt-BR')}`,
                            variant: "destructive"
                          });
                          return;
                        }
                      }
                      
                      if (novaData && projetoSelecionado?.data_fim) {
                        const dataFim = new Date(novaData);
                        const dataFimProjeto = new Date(projetoSelecionado.data_fim);
                        
                        if (dataFim > dataFimProjeto) {
                          toast({
                            title: t.activities.invalidDate,
                            description: `${t.activities.dateCannotBeAfter} ${dataFimProjeto.toLocaleDateString('pt-BR')}`,
                            variant: "destructive"
                          });
                          return;
                        }
                      }
                      
                      setFormData({
                        ...formData,
                        data_fim: novaData
                      });
                    }} 
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="responsavel">{t.activities.responsible}</Label>
                <Select value={formData.responsavel_id} onValueChange={value => setFormData({
                ...formData,
                responsavel_id: value
              })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.activities.selectResponsible} />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map(profile => <SelectItem key={profile.id} value={profile.id}>
                        {profile.nome}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="prioridade">{t.activities.priority}</Label>
                <Select value={formData.prioridade} onValueChange={value => setFormData({
                ...formData,
                prioridade: value
              })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">{t.activities.low}</SelectItem>
                    <SelectItem value="media">{t.activities.medium}</SelectItem>
                    <SelectItem value="alta">{t.activities.high}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estado">{t.activities.status}</Label>
                <Select value={formData.status} onValueChange={value => setFormData({
                ...formData,
                status: value
              })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">{t.activities.pending}</SelectItem>
                    <SelectItem value="em_andamento">{t.activities.inProgress}</SelectItem>
                    <SelectItem value="concluida">{t.activities.completed}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cor">{t.activities.activityColor}</Label>
                <Input id="cor" type="color" value={formData.cor} onChange={e => setFormData({
                ...formData,
                cor: e.target.value
              })} />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.activities.creating}
                    </> : t.activities.createActivity}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className={`inline-flex w-auto min-w-full sm:grid sm:w-full mb-4 ${isGestor ? 'sm:grid-cols-6' : 'sm:grid-cols-5'}`}>
            <TabsTrigger value="todos" className="text-xs sm:text-sm whitespace-nowrap">{t.activities.all}</TabsTrigger>
            <TabsTrigger value="pendente" className="text-xs sm:text-sm whitespace-nowrap">{t.activities.pending}</TabsTrigger>
            <TabsTrigger value="em_andamento" className="text-xs sm:text-sm whitespace-nowrap">{t.activities.inProgress}</TabsTrigger>
            <TabsTrigger value="concluida" className="text-xs sm:text-sm whitespace-nowrap">{t.activities.completed}</TabsTrigger>
            <TabsTrigger value="cancelada" className="text-xs sm:text-sm whitespace-nowrap">{t.activities.cancelled}</TabsTrigger>
            {isGestor && (
              <TabsTrigger value="para_aprovar" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                {t.activities.toApprove}
                {confirmacoesPendentes.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-xs">
                    {confirmacoesPendentes.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </div>
      </Tabs>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.activities.searchActivities} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] overflow-y-auto">
            <SelectItem value="todos">{t.activities.allProjects}</SelectItem>
            {projetos.map(projeto => <SelectItem key={projeto.id} value={projeto.id}>
                {projeto.nome}
              </SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {selectedStatus === 'para_aprovar' && isGestor ? (
          confirmacoesPendentes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t.activities.noConfirmationPending}</p>
              </CardContent>
            </Card>
          ) : (
            confirmacoesPendentes.map(confirmacao => (
              <Card key={confirmacao.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-xl flex-1">{confirmacao.atividades?.nome}</CardTitle>
                        <Badge className="bg-yellow-100 text-yellow-800">{t.activities.awaitingApproval}</Badge>
                      </div>
                      {confirmacao.atividades?.projetos && (
                        <p className="text-sm text-muted-foreground">{confirmacao.atividades.projetos.nome}</p>
                      )}
                      {confirmacao.atividades?.profiles && (
                        <p className="text-sm text-muted-foreground">
                          {t.activities.responsible}: {confirmacao.atividades.profiles.nome}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t.activities.confirmedAt}: {new Date(confirmacao.confirmado_em).toLocaleString('pt-PT')}
                      </p>
                      {confirmacao.observacao && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <strong>{t.activities.observation}:</strong> {confirmacao.observacao}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setConfirmDialog({
                        open: true,
                        atividadeId: confirmacao.atividade_id,
                        confirmacaoId: confirmacao.id,
                        action: 'aprovar',
                        observacao: ''
                      })}
                      disabled={isLoading}
                    >
                      <Check className="h-3 w-3" />
                      {t.activities.approve}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setConfirmDialog({
                        open: true,
                        atividadeId: confirmacao.atividade_id,
                        confirmacaoId: confirmacao.id,
                        action: 'rejeitar',
                        observacao: ''
                      })}
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                      {t.activities.reject}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )
        ) : (
          atividadesFiltradas.length === 0 ? <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  {userRole === 'Colaborador' 
                    ? t.activities.noActivitiesAssigned 
                    : t.activities.noActivitiesFound}
                </p>
                {userRole !== 'Colaborador' && (
                  <Button type="button" onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t.activities.createFirstActivity}
                  </Button>
                )}
              </CardContent>
            </Card> : (
            <>
              {atividadesPaginadas.map(atividade => <Card key={atividade.id} className="hover:shadow-lg transition-shadow border-l-4" style={{
                borderLeftColor: atividade.cor || '#10B981'
              }}>
                    <CardHeader className="cursor-pointer" onClick={() => navigate(`/atividades/${atividade.id}`)}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{
                        backgroundColor: atividade.cor || '#10B981'
                      }} />
                            <CardTitle className="text-xl flex-1">{atividade.nome}</CardTitle>
                            <Badge className={getEstadoBadge(atividade.status)}>
                              {getEstadoLabel(atividade.status)}
                            </Badge>
                            {atividade.confirmacao_status === 'pendente' && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1">
                                <Clock className="h-3 w-3" />
                                {t.activities.awaitingApproval}
                              </Badge>
                            )}
                          </div>
                          {atividade.projetos && <p className="text-sm text-muted-foreground">{atividade.projetos.nome}</p>}
                          {atividade.descricao && <p className="text-sm text-muted-foreground">{atividade.descricao}</p>}
                          {atividade.motivo_rejeicao && atividade.status === 'pendente' && (
                            <Alert variant="destructive" className="mt-3" onClick={(e) => e.stopPropagation()}>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>{t.activities.activityRejectedLabel}</AlertTitle>
                              <AlertDescription>
                                {atividade.motivo_rejeicao}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-3">
                          {(atividade.data_inicio || atividade.data_fim) && <div className="flex items-center gap-2 text-muted-foreground text-sm">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {atividade.data_inicio ? new Date(atividade.data_inicio).toLocaleDateString('pt-PT') : '---'} - {atividade.data_fim ? new Date(atividade.data_fim).toLocaleDateString('pt-PT') : '---'}
                              </span>
                            </div>}
                          {atividade.profiles && <div className="flex items-center gap-2 text-muted-foreground text-sm">
                              <Users className="h-4 w-4" />
                              <span>{atividade.profiles.nome}</span>
                            </div>}
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {atividade.status === 'pendente' && !atividade.confirmacao_status && atividade.responsavel_id === currentUser?.id && (
                            <Button
                              size="sm"
                              className="gap-1 bg-blue-600 hover:bg-blue-700 text-white border-0 h-7 px-2.5 text-xs"
                              onClick={() => handleIniciarAtividade(atividade.id)}
                              disabled={isLoading}
                            >
                              <Play className="h-3 w-3" />
                              {atividade.motivo_rejeicao ? t.activities.restart : t.activities.start}
                            </Button>
                          )}
                          {atividade.status === 'em_andamento' && !atividade.confirmacao_status && atividade.responsavel_id === currentUser?.id && (
                            <>
                              <Button
                                size="sm"
                                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-7 px-2.5 text-xs"
                                onClick={() => handleConfirmarConclusao(atividade.id)}
                                disabled={isLoading}
                              >
                                <CheckCircle className="h-3 w-3" />
                                {t.activities.submit}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 h-7 px-2.5 text-xs"
                                onClick={() => handleCancelarAtividade(atividade.id)}
                                disabled={isLoading}
                              >
                                <XCircle className="h-3 w-3" />
                                {t.common.cancel}
                              </Button>
                            </>
                          )}
                          {atividade.confirmacao_status === 'pendente' && (
                            <p className="text-sm text-amber-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {t.activities.awaitingManagerApproval}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>)}
              
              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                  <p className="text-sm text-muted-foreground order-2 sm:order-1">
                    Mostrando {startIndex + 1}-{Math.min(endIndex, atividadesFiltradas.length)} de {atividadesFiltradas.length} rubricas
                  </p>
                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="gap-1"
                    >
                      <span className="hidden sm:inline">Próximo</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'aprovar' ? t.activities.approveActivity : t.activities.rejectActivity}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'aprovar' 
                ? t.activities.approveConfirmation
                : t.activities.rejectConfirmation}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="observacao">
              {confirmDialog.action === 'aprovar' ? t.activities.observationOptional : `${t.activities.rejectionReason} *`}
            </Label>
            <Textarea
              id="observacao"
              placeholder={confirmDialog.action === 'aprovar' ? t.activities.addObservation : t.activities.explainRejection}
              value={confirmDialog.observacao}
              onChange={(e) => setConfirmDialog({ ...confirmDialog, observacao: e.target.value })}
              rows={4}
              required={confirmDialog.action === 'rejeitar'}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAprovarRejeitar}
              disabled={isLoading || (confirmDialog.action === 'rejeitar' && !confirmDialog.observacao)}
              className={confirmDialog.action === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.activities.processing}
                </>
              ) : (
                confirmDialog.action === 'aprovar' ? t.activities.approve : t.activities.reject
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
      )}
    </>
  );
};
export default Atividades;