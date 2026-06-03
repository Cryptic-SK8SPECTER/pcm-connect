import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Search, FileText, CheckCircle, XCircle, Clock, Ban, FolderKanban, Briefcase, User, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useTranslations } from "@/hooks/useTranslations";

export default function Subatividades() {
  const t = useTranslations();
  const [subatividades, setSubatividades] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroAtividade, setFiltroAtividade] = useState("todas");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmacoesPendentes, setConfirmacoesPendentes] = useState<any[]>([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [acaoConfirmacao, setAcaoConfirmacao] = useState<{ id: string; acao: 'aprovar' | 'rejeitar' } | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userConfirmacoes, setUserConfirmacoes] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    atividade_id: "",
    responsavel_id: "",
    data_prevista: undefined as Date | undefined,
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchData();
    }
  }, [userRole]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role_id, roles(nome)')
        .eq('id', user.id)
        .single();

      const roleName = profile?.roles?.nome;
      setUserRole(roleName);
    } catch (error) {
      console.error('Erro ao verificar role:', error);
    }
  };

  const fetchConfirmacoesPendentes = async () => {
    if (userRole !== 'gestor' && userRole !== 'Administrador') return;

    try {
      const { data: confirmacoes, error } = await supabase
        .from('subatividade_confirmacoes')
        .select(`
          *,
          subatividades (
            id,
            nome,
            atividade_id,
            atividades (
              nome,
              projeto_id,
              projetos (nome)
            )
          )
        `)
        .eq('status', 'pendente');

      if (error) throw error;

      // Buscar informações dos usuários separadamente
      if (confirmacoes && confirmacoes.length > 0) {
        const userIds = confirmacoes.map(c => c.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .in('id', userIds);

        // Mapear profiles aos confirmações
        const confirmacoesComPerfis = confirmacoes.map(conf => ({
          ...conf,
          profiles: profiles?.find(p => p.id === conf.user_id)
        }));

        setConfirmacoesPendentes(confirmacoesComPerfis);
      } else {
        setConfirmacoesPendentes([]);
      }
    } catch (error: any) {
      console.error('Erro ao buscar confirmações pendentes:', error);
      toast.error('Erro ao carregar confirmações pendentes');
    }
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar subatividades com filtro por colaborador
      let subatividadesQuery = supabase
        .from('subatividades')
        .select(`
          *,
          atividades (
            id,
            nome,
            projeto_id,
            projetos (nome, cor)
          )
        `)
        .order('created_at', { ascending: false });

      // Se for colaborador, filtrar apenas suas subatividades
      if (userRole === 'Colaborador') {
        subatividadesQuery = subatividadesQuery.eq('responsavel_id', user.id);
      }

      const { data: subatividadesData, error: subatividadesError } = await subatividadesQuery;

      if (subatividadesError) throw subatividadesError;

      // Buscar informações dos responsáveis separadamente
      const responsavelIds = subatividadesData?.map(s => s.responsavel_id).filter(Boolean) || [];
      let profilesMap: Record<string, any> = {};
      
      if (responsavelIds.length > 0) {
        const { data: responsaveisData } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .in('id', responsavelIds);
        
        if (responsaveisData) {
          profilesMap = responsaveisData.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Adicionar informações do responsável às subatividades
      const subatividadesComResponsavel = subatividadesData?.map(sub => ({
        ...sub,
        profiles: sub.responsavel_id ? profilesMap[sub.responsavel_id] : null
      })) || [];

      setSubatividades(subatividadesComResponsavel);

      // Buscar atividades
      const { data: atividadesData, error: atividadesError } = await supabase
        .from('atividades')
        .select('*')
        .order('nome');

      if (atividadesError) throw atividadesError;
      setAtividades(atividadesData || []);

      // Buscar profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Buscar confirmações do usuário
      const { data: confirmacoesData, error: confirmacoesError } = await supabase
        .from('subatividade_confirmacoes')
        .select('*')
        .eq('user_id', user.id);

      if (confirmacoesError) throw confirmacoesError;
      setUserConfirmacoes(confirmacoesData || []);

      // Buscar confirmações pendentes se for gestor
      await fetchConfirmacoesPendentes();
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('subatividades')
        .insert([{
          nome: formData.nome,
          descricao: formData.descricao,
          atividade_id: formData.atividade_id,
          responsavel_id: formData.responsavel_id,
          data_prevista: formData.data_prevista ? format(formData.data_prevista, 'yyyy-MM-dd') : null,
          concluida: false
        }])
        .select();

      if (error) throw error;

      toast.success(t.subactivitiesPage.toasts.created);
      setIsDialogOpen(false);
      setFormData({
        nome: "",
        descricao: "",
        atividade_id: "",
        responsavel_id: "",
        data_prevista: undefined,
      });
      fetchData();
    } catch (error: any) {
      console.error('Erro ao criar atividade:', error);
      toast.error(error.message || t.subactivitiesPage.toasts.errorCreate);
    }
  };

  const handleIniciarSubatividade = async (subatividadeId: string) => {
    try {
      const { error } = await supabase
        .from('subatividades')
        .update({ status: 'em_andamento' })
        .eq('id', subatividadeId);

      if (error) throw error;

      toast.success(t.subactivitiesPage.toasts.started);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao iniciar atividade:', error);
      toast.error(error.message || t.subactivitiesPage.toasts.errorStart);
    }
  };

  const handleConfirmarConclusao = async (subatividadeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar confirmação pendente
      const { error: confirmacaoError } = await supabase
        .from('subatividade_confirmacoes')
        .insert([{
          subatividade_id: subatividadeId,
          user_id: user.id,
          status: 'pendente',
          confirmado_em: new Date().toISOString()
        }]);

      if (confirmacaoError) throw confirmacaoError;

      // Atualizar status da subatividade para aguardando_aprovacao
      const { error: updateError } = await supabase
        .from('subatividades')
        .update({ status: 'aguardando_aprovacao' })
        .eq('id', subatividadeId);

      if (updateError) throw updateError;

      toast.success(t.subactivitiesPage.toasts.submitted);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao confirmar conclusão:', error);
      toast.error(error.message || t.subactivitiesPage.toasts.errorSubmit);
    }
  };

  const handleAprovarRejeitar = async (confirmacaoId: string, acao: 'aprovar' | 'rejeitar') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const updates: any = {
        status: acao === 'aprovar' ? 'aprovado' : 'rejeitado',
        aprovado_por: user.id,
        aprovado_em: new Date().toISOString()
      };

      if (acao === 'rejeitar' && motivoRejeicao) {
        updates.motivo_rejeicao = motivoRejeicao;
      }

      const { data: confirmacao, error: updateError } = await supabase
        .from('subatividade_confirmacoes')
        .update(updates)
        .eq('id', confirmacaoId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Se aprovada, atualizar subatividade para concluída
      if (acao === 'aprovar') {
        const { error: subatividadeError } = await supabase
          .from('subatividades')
          .update({
            concluida: true,
            status: 'concluida',
            data_conclusao: new Date().toISOString()
          })
          .eq('id', confirmacao.subatividade_id);

        if (subatividadeError) throw subatividadeError;

        // Criar notificação
        await supabase.from('notificacoes').insert({
          user_id: confirmacao.user_id,
          tipo: 'aprovacao_subatividade',
          titulo: 'Atividade Aprovada',
          mensagem: `Sua atividade foi aprovada!`,
          link: `/subatividades`
        });

        toast.success(t.subactivitiesPage.toasts.approved);
      } else {
        // Atualizar status da subatividade para em_andamento ao rejeitar
        await supabase
          .from('subatividades')
          .update({ status: 'em_andamento' })
          .eq('id', confirmacao.subatividade_id);

        // Criar notificação de rejeição
        await supabase.from('notificacoes').insert({
          user_id: confirmacao.user_id,
          tipo: 'rejeicao_subatividade',
          titulo: 'Atividade Rejeitada',
          mensagem: `Sua atividade foi rejeitada. Motivo: ${motivoRejeicao}`,
          link: `/subatividades`
        });

        toast.success(t.subactivitiesPage.toasts.rejected);
      }

      setMotivoRejeicao("");
      setAcaoConfirmacao(null);
      setIsAlertOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao processar confirmação:', error);
      toast.error(error.message || t.subactivitiesPage.toasts.errorProcess);
    }
  };

  const getStatusBadge = (subatividade: any) => {
    if (subatividade.status === 'concluida') {
      return <Badge className="bg-green-500">{t.subactivitiesPage.statusCompleted}</Badge>;
    }
    
    if (subatividade.status === 'aguardando_aprovacao') {
      return <Badge className="bg-yellow-500">{t.subactivitiesPage.statusWaitingApproval}</Badge>;
    }
    
    if (subatividade.status === 'em_andamento') {
      return <Badge className="bg-blue-500">{t.subactivitiesPage.statusInProgress}</Badge>;
    }
    
    return <Badge className="bg-gray-500">{t.subactivitiesPage.statusPending}</Badge>;
  };

  const subatividadesFiltradas = subatividades.filter(sub => {
    const matchSearch = sub.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchAtividade = filtroAtividade === "todas" || sub.atividade_id === filtroAtividade;
    
    let matchStatus = true;
    if (filtroStatus !== "todos") {
      if (filtroStatus === "concluida") {
        matchStatus = sub.status === 'concluida';
      } else if (filtroStatus === "pendente") {
        matchStatus = sub.status === 'pendente';
      } else if (filtroStatus === "em_andamento") {
        matchStatus = sub.status === 'em_andamento';
      } else if (filtroStatus === "aguardando") {
        matchStatus = sub.status === 'aguardando_aprovacao';
      } else if (filtroStatus === "rejeitada") {
        const confirmacao = userConfirmacoes.find(c => c.subatividade_id === sub.id);
        matchStatus = confirmacao?.status === 'rejeitada';
      }
    }
    
    return matchSearch && matchAtividade && matchStatus;
  });

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroAtividade, filtroStatus]);

  // Calcular paginação
  const totalPages = Math.ceil(subatividadesFiltradas.length / itemsPerPage);
  const paginatedSubatividades = subatividadesFiltradas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (userRole === null) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{t.subactivitiesPage.title}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">{t.subactivitiesPage.subtitle}</p>
      </div>

      {/* Tabs para filtro de status */}
      <Tabs value={filtroStatus} onValueChange={setFiltroStatus}>
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-max">
            <TabsTrigger value="todos" className="text-xs sm:text-sm whitespace-nowrap">{t.subactivitiesPage.tabs.all}</TabsTrigger>
            <TabsTrigger value="pendente" className="text-xs sm:text-sm whitespace-nowrap">{t.subactivitiesPage.tabs.pending}</TabsTrigger>
            <TabsTrigger value="em_andamento" className="text-xs sm:text-sm whitespace-nowrap">{t.subactivitiesPage.tabs.inProgress}</TabsTrigger>
            <TabsTrigger value="aguardando" className="text-xs sm:text-sm whitespace-nowrap">{t.subactivitiesPage.tabs.waiting}</TabsTrigger>
            <TabsTrigger value="concluida" className="text-xs sm:text-sm whitespace-nowrap">{t.subactivitiesPage.tabs.completed}</TabsTrigger>
            <TabsTrigger value="rejeitada" className="text-xs sm:text-sm whitespace-nowrap">{t.subactivitiesPage.tabs.rejected}</TabsTrigger>
            {(userRole === 'gestor' || userRole === 'Administrador') && (
              <TabsTrigger value="para_aprovar" className="text-xs sm:text-sm whitespace-nowrap">
                {t.subactivitiesPage.tabs.toApprove}
                {confirmacoesPendentes.length > 0 && (
                  <Badge className="ml-1 sm:ml-2" variant="destructive">{confirmacoesPendentes.length}</Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </div>
      </Tabs>

      {/* Filtros e Ações */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center flex-1">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t.subactivitiesPage.search}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={filtroAtividade} onValueChange={setFiltroAtividade}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t.subactivitiesPage.filterByRubric} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">{t.subactivitiesPage.allRubrics}</SelectItem>
              {atividades.map((atividade) => (
                <SelectItem key={atividade.id} value={atividade.id}>
                  {atividade.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t.subactivitiesPage.newActivity}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.subactivitiesPage.createTitle}</DialogTitle>
              <DialogDescription>
                {t.subactivitiesPage.createDescription}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">{t.subactivitiesPage.name}</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">{t.subactivitiesPage.description}</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="atividade_id">{t.subactivitiesPage.rubric}</Label>
                  <Select value={formData.atividade_id} onValueChange={(value) => setFormData({ ...formData, atividade_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.subactivitiesPage.selectRubric} />
                    </SelectTrigger>
                    <SelectContent>
                      {atividades.map((atividade) => (
                        <SelectItem key={atividade.id} value={atividade.id}>
                          {atividade.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel_id">{t.subactivitiesPage.responsible}</Label>
                  <Select value={formData.responsavel_id} onValueChange={(value) => setFormData({ ...formData, responsavel_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.subactivitiesPage.selectResponsible} />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.subactivitiesPage.expectedDate}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !formData.data_prevista && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data_prevista ? format(formData.data_prevista, "dd/MM/yyyy") : t.subactivitiesPage.selectDate}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.data_prevista}
                      onSelect={(date) => setFormData({ ...formData, data_prevista: date })}
                      disabled={(date) => {
                        if (!formData.atividade_id) return false;
                        const atividade = atividades.find(a => a.id === formData.atividade_id);
                        if (!atividade) return false;
                        
                        const dataInicio = atividade.data_inicio ? new Date(atividade.data_inicio) : null;
                        const dataFim = atividade.data_fim ? new Date(atividade.data_fim) : null;
                        
                        if (dataInicio && date < dataInicio) return true;
                        if (dataFim && date > dataFim) return true;
                        return false;
                      }}
                      fromDate={
                        formData.atividade_id 
                          ? atividades.find(a => a.id === formData.atividade_id)?.data_inicio 
                            ? new Date(atividades.find(a => a.id === formData.atividade_id)!.data_inicio!)
                            : undefined
                          : undefined
                      }
                      toDate={
                        formData.atividade_id
                          ? atividades.find(a => a.id === formData.atividade_id)?.data_fim
                            ? new Date(atividades.find(a => a.id === formData.atividade_id)!.data_fim!)
                            : undefined
                          : undefined
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {formData.atividade_id && (() => {
                  const atividade = atividades.find(a => a.id === formData.atividade_id);
                  if (atividade?.data_inicio && atividade?.data_fim) {
                    return (
                      <p className="text-xs text-muted-foreground">
                        {t.subactivitiesPage.rubricPeriod} {format(new Date(atividade.data_inicio), "dd/MM/yyyy")} - {format(new Date(atividade.data_fim), "dd/MM/yyyy")}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t.subactivitiesPage.cancel}
                </Button>
                <Button type="submit">{t.subactivitiesPage.createActivity}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Subatividades ou Confirmações Pendentes */}
      {filtroStatus === "para_aprovar" && (userRole === 'gestor' || userRole === 'Administrador') ? (
        <div className="grid gap-4">
          {confirmacoesPendentes.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-10">
                <p className="text-muted-foreground">{t.subactivitiesPage.noPendingConfirmations}</p>
              </CardContent>
            </Card>
          ) : (
            confirmacoesPendentes.map((confirmacao) => (
              <Card key={confirmacao.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <CardTitle className="text-lg">{confirmacao.subatividades?.nome}</CardTitle>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FolderKanban className="h-4 w-4 text-primary" />
                          <span className="font-medium">{t.subactivitiesPage.rubricLabel}</span>
                          <span>{confirmacao.subatividades?.atividades?.nome}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="h-4 w-4 text-primary" />
                          <span className="font-medium">{t.subactivitiesPage.projectLabel}</span>
                          <span>{confirmacao.subatividades?.atividades?.projetos?.nome}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4 text-primary" />
                          <span className="font-medium">{t.subactivitiesPage.requestedBy}</span>
                          <span>{confirmacao.profiles?.nome}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <Badge className="bg-yellow-500">{t.subactivitiesPage.statusPending}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => {
                        setAcaoConfirmacao({ id: confirmacao.id, acao: 'aprovar' });
                        setIsAlertOpen(true);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      {t.subactivitiesPage.approve}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setAcaoConfirmacao({ id: confirmacao.id, acao: 'rejeitar' });
                        setIsAlertOpen(true);
                      }}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      {t.subactivitiesPage.reject}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {subatividadesFiltradas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 space-y-2">
                <p className="text-muted-foreground">
                  {userRole === 'Colaborador' 
                    ? t.subactivitiesPage.noActivitiesAssigned
                    : t.subactivitiesPage.noActivitiesFound}
                </p>
                {userRole === 'Colaborador' && (
                  <p className="text-sm text-muted-foreground">
                    {t.subactivitiesPage.activitiesWillAppear}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            paginatedSubatividades.map((subatividade) => {
              const confirmacao = userConfirmacoes.find(c => c.subatividade_id === subatividade.id);
              
              return (
                <Card key={subatividade.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div>
                          <CardTitle className="text-lg">{subatividade.nome}</CardTitle>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FolderKanban className="h-4 w-4 text-primary" />
                            <span className="font-medium">{t.subactivitiesPage.rubricLabel}</span>
                            <span>{subatividade.atividades?.nome}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="h-4 w-4 text-primary" />
                            <span className="font-medium">{t.subactivitiesPage.projectLabel}</span>
                            <span>{subatividade.atividades?.projetos?.nome}</span>
                          </div>
                          {subatividade.data_prevista && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <CalendarIcon className="h-4 w-4 text-primary" />
                              <span className="font-medium">{t.subactivitiesPage.expectedDateLabel}</span>
                              <span>{format(new Date(subatividade.data_prevista), 'dd/MM/yyyy')}</span>
                            </div>
                          )}
                          {subatividade.profiles && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4 text-primary" />
                              <span className="font-medium">{t.subactivitiesPage.responsibleLabel}</span>
                              <span>{subatividade.profiles.nome}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Badge de status no lado direito */}
                      <div className="flex-shrink-0">
                        {getStatusBadge(subatividade)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    {confirmacao?.status === 'rejeitada' && confirmacao.motivo_rejeicao && (
                      <div className="bg-destructive/10 border-l-4 border-destructive rounded-lg p-4 mb-3">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-destructive mb-1">{t.subactivitiesPage.rejectionReason}</p>
                            <p className="text-sm text-destructive/90">{confirmacao.motivo_rejeicao}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {subatividade.status === 'pendente' && (
                        <Button
                          size="sm"
                          onClick={() => handleIniciarSubatividade(subatividade.id)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Play className="mr-1.5 h-3.5 w-3.5" />
                          {t.subactivitiesPage.start}
                        </Button>
                      )}
                      
                      {subatividade.status === 'em_andamento' && (
                        <Button
                          size="sm"
                          onClick={() => handleConfirmarConclusao(subatividade.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                          {t.subactivitiesPage.submit}
                        </Button>
                      )}
                      
                      {subatividade.status === 'aguardando_aprovacao' && (
                        <div className="flex items-center gap-1.5 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-2.5 py-1.5 rounded-md border border-yellow-200 dark:border-yellow-800">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="font-medium">{t.subactivitiesPage.waitingApproval}</span>
                        </div>
                      )}
                      
                      {subatividade.status === 'concluida' && (
                        <div className="flex items-center gap-1.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2.5 py-1.5 rounded-md border border-green-200 dark:border-green-800">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span className="font-medium">{t.subactivitiesPage.statusCompleted}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && filtroStatus !== 'para_aprovar' && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t.common.previous}
          </Button>
          
          <div className="flex items-center gap-1 flex-wrap justify-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="min-w-[32px] sm:min-w-[40px]"
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
            className="w-full sm:w-auto"
          >
            {t.common.next}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Alert Dialog para Aprovar/Rejeitar */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {acaoConfirmacao?.acao === 'aprovar' ? t.subactivitiesPage.approveActivityTitle : t.subactivitiesPage.rejectActivityTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {acaoConfirmacao?.acao === 'aprovar' 
                ? t.subactivitiesPage.approveConfirmation 
                : t.subactivitiesPage.rejectPrompt}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {acaoConfirmacao?.acao === 'rejeitar' && (
            <Textarea
              placeholder={t.subactivitiesPage.rejectionPlaceholder}
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              rows={3}
            />
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setAcaoConfirmacao(null);
              setMotivoRejeicao("");
            }}>
              {t.subactivitiesPage.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (acaoConfirmacao) {
                  handleAprovarRejeitar(acaoConfirmacao.id, acaoConfirmacao.acao);
                }
              }}
              className={acaoConfirmacao?.acao === 'aprovar' ? 'bg-green-500 hover:bg-green-600' : ''}
            >
              {t.subactivitiesPage.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
