import { useState, useEffect } from "react";
import { Plus, Search, MapPin, Calendar, TrendingUp, ChevronRight, Edit2, Loader2, Trash2, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/hooks/useTranslations";
import { LocationMapPicker } from "@/components/LocationMapPicker";


const Projetos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = useTranslations();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [projetos, setProjetos] = useState<any[]>([]);
  const [moedas, setMoedas] = useState<Array<{ currency_code: string; currency_name: string }>>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProjeto, setEditingProjeto] = useState<any>(null);
  const [deletingProjeto, setDeletingProjeto] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    localizacao: "",
    latitude: null as number | null,
    longitude: null as number | null,
    data_inicio: "",
    data_fim: "",
    orcamento: "",
    moeda: "MZN",
    status: "planejamento",
    cor: "#3B82F6"
  });
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingUserRole, setIsLoadingUserRole] = useState(true);
  const [isLoadingProjetos, setIsLoadingProjetos] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const projectsPerPage = 6;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchUserRole();
    fetchMoedas();
  }, []);

  useEffect(() => {
    if (!isLoadingUserRole && userRole !== null) {
      fetchProjetos();
    }
  }, [userRole, isLoadingUserRole]);

  const fetchUserRole = async () => {
    try {
      setIsLoadingUserRole(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("role_id, roles(nome)")
        .eq("id", user.id)
        .single();
      
      const roleName = (profile as any)?.roles?.nome;
      setUserRole(roleName);
    } catch (error) {
      console.error("Erro ao buscar role:", error);
    } finally {
      setIsLoadingUserRole(false);
    }
  };

  const fetchMoedas = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('currency_code, currency_name')
        .order('currency_code');
      
      if (error) throw error;
      setMoedas(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar moedas:', error);
    }
  };

  const fetchProjetos = async () => {
    setIsLoadingProjetos(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar todos os projetos ativos
      const { data, error } = await (supabase as any)
        .from('projetos')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Se for colaborador, filtrar apenas projetos em que está incluído
      if (userRole === 'Colaborador') {
        // Buscar equipas do usuário
        const { data: equipasUsuario } = await supabase
          .from('equipa_membros')
          .select('equipa_id')
          .eq('user_id', user.id);

        const equipaIds = equipasUsuario?.map(em => em.equipa_id) || [];

        // Buscar projetos dessas equipas
        const { data: projetoEquipas } = await supabase
          .from('projeto_equipas')
          .select('projeto_id')
          .in('equipa_id', equipaIds);

        const projetoIds = projetoEquipas?.map(pe => pe.projeto_id) || [];

        // Filtrar projetos
        const projetosFiltrados = (data || []).filter((p: any) => projetoIds.includes(p.id));
        setProjetos(projetosFiltrados);
      } else {
        setProjetos(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast({
        title: t.common.error,
        description: t.projects.title,
        variant: "destructive",
      });
    } finally {
      setIsLoadingProjetos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      toast({ title: "Sessão necessária", description: "Faça login para criar projetos.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await (supabase as any)
        .from('projetos')
        .insert([{
          nome: formData.nome,
          descricao: formData.descricao,
          localizacao: formData.localizacao,
          latitude: formData.latitude,
          longitude: formData.longitude,
          data_inicio: formData.data_inicio || null,
          data_fim: formData.data_fim || null,
          orcamento: formData.orcamento ? parseFloat(formData.orcamento) : null,
          moeda: formData.moeda,
          status: formData.status,
          cor: formData.cor
        }]);

      if (error) throw error;

      toast({
        title: t.common.success,
        description: t.projects.newProject + " " + t.common.success.toLowerCase(),
      });

      setIsDialogOpen(false);
      setFormData({
        nome: "",
        descricao: "",
        localizacao: "",
        latitude: null,
        longitude: null,
        data_inicio: "",
        data_fim: "",
        orcamento: "",
        moeda: "MZN",
        status: "planejamento",
        cor: "#3B82F6"
      });
      fetchProjetos();
    } catch (error: any) {
      console.error('Erro ao criar projeto:', error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível criar o projeto.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditarProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjeto) {
      toast({
        title: "Erro",
        description: "Nenhum projeto selecionado para editar.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      console.log('Atualizando projeto:', editingProjeto.id);
      
      const updateData = {
        nome: editingProjeto.nome,
        descricao: editingProjeto.descricao,
        localizacao: editingProjeto.localizacao,
        latitude: editingProjeto.latitude,
        longitude: editingProjeto.longitude,
        data_inicio: editingProjeto.data_inicio || null,
        data_fim: editingProjeto.data_fim || null,
        orcamento: editingProjeto.orcamento ? parseFloat(editingProjeto.orcamento) : null,
        moeda: editingProjeto.moeda || "MZN",
        status: editingProjeto.status,
        cor: editingProjeto.cor,
        updated_at: new Date().toISOString()
      };
      
      console.log('Dados para atualização:', updateData);
      
      const { data, error } = await (supabase as any)
        .from('projetos')
        .update(updateData)
        .eq('id', editingProjeto.id)
        .select();

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      console.log('Projeto atualizado com sucesso:', data);

      toast({
        title: "Sucesso",
        description: "Projeto atualizado com sucesso!",
      });

      setIsEditDialogOpen(false);
      setEditingProjeto(null);
      fetchProjetos();
    } catch (error: any) {
      console.error('Erro ao atualizar projeto:', error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível atualizar o projeto. Verifique se tem permissões.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProjeto = async () => {
    if (!deletingProjeto) return;
    
    setIsLoading(true);

    try {
      const { error } = await (supabase as any)
        .from('projetos')
        .update({ ativo: false })
        .eq('id', deletingProjeto.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Projeto desativado com sucesso!",
      });

      setIsDeleteDialogOpen(false);
      setDeletingProjeto(null);
      fetchProjetos();
    } catch (error: any) {
      console.error('Erro ao desativar projeto:', error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível desativar o projeto. Verifique se tem permissões.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const variants: { [key: string]: string } = {
      planejamento: "bg-blue-100 text-blue-800",
      execucao: "bg-green-100 text-green-800",
      concluido: "bg-gray-100 text-gray-800",
      suspenso: "bg-red-100 text-red-800",
    };
    return variants[estado] || "bg-gray-100 text-gray-800";
  };

  const getEstadoLabel = (estado: string) => {
    const labels: { [key: string]: string } = {
      planejamento: "Planeamento",
      execucao: "Execução",
      concluido: "Concluído",
      suspenso: "Suspenso",
    };
    return labels[estado] || estado;
  };

  const projetosFiltrados = projetos.filter((projeto) => {
    const matchesSearch = projeto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          projeto.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          projeto.localizacao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "todos" || projeto.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Paginação
  const totalPages = Math.ceil(projetosFiltrados.length / projectsPerPage);
  const startIndex = (currentPage - 1) * projectsPerPage;
  const endIndex = startIndex + projectsPerPage;
  const projetosPaginados = projetosFiltrados.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  if (isLoadingUserRole || isLoadingProjetos) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
        <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t.projects.title}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Gerencie todos os seus projetos</p>
        </div>
        {userRole !== 'Colaborador' && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={!session} title={!session ? t.auth.signIn : ''}>
                <Plus className="h-4 w-4" />
                {t.projects.newProject}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.projects.newProject}</DialogTitle>
              <DialogDescription>
                {t.projects.projectDescription}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">{t.projects.projectName} *</Label>
                <Input 
                  id="nome" 
                  placeholder="Ex: Construção da Ponte XYZ"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="descricao">{t.common.description}</Label>
                <Textarea 
                  id="descricao" 
                  placeholder="Descreva o projeto..." 
                  rows={3}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>
              <div>
                <LocationMapPicker
                  value={formData.localizacao}
                  onChange={(location, lat, lng) => setFormData({ ...formData, localizacao: location, latitude: lat, longitude: lng })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataInicio">{t.projects.startDate}</Label>
                  <Input 
                    id="dataInicio" 
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dataFim">{t.projects.endDate}</Label>
                  <Input 
                    id="dataFim" 
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_150px] gap-4">
                <div>
                  <Label htmlFor="orcamento">{t.projects.budget}</Label>
                  <Input 
                    id="orcamento" 
                    type="number" 
                    placeholder="0.00"
                    value={formData.orcamento}
                    onChange={(e) => setFormData({ ...formData, orcamento: e.target.value })}
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="moeda">Moeda</Label>
                  <Select value={formData.moeda} onValueChange={(value) => setFormData({ ...formData, moeda: value })}>
                    <SelectTrigger id="moeda">
                      <SelectValue placeholder="Selecione a moeda" />
                    </SelectTrigger>
                    <SelectContent>
                      {moedas.map((moeda) => (
                        <SelectItem key={moeda.currency_code} value={moeda.currency_code}>
                          {moeda.currency_code} - {moeda.currency_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="cor">{t.projects.color}</Label>
                <Input 
                  id="cor" 
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="estado">{t.common.status}</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejamento">Planeamento</SelectItem>
                    <SelectItem value="execucao">Execução</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.common.loading}
                    </>
                  ) : (
                    t.projects.newProject
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Projeto</DialogTitle>
              <DialogDescription>
                Atualize as informações do projeto
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditarProjeto} className="space-y-4">
              <div>
                <Label htmlFor="edit-nome">Nome do Projeto *</Label>
                <Input 
                  id="edit-nome" 
                  placeholder="Ex: Construção da Ponte"
                  value={editingProjeto?.nome || ""}
                  onChange={(e) => setEditingProjeto({ ...editingProjeto, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-descricao">Descrição</Label>
                <Textarea 
                  id="edit-descricao" 
                  placeholder="Descreva o projeto..." 
                  rows={3}
                  value={editingProjeto?.descricao || ""}
                  onChange={(e) => setEditingProjeto({ ...editingProjeto, descricao: e.target.value })}
                />
              </div>
              <div>
                <LocationMapPicker
                  value={editingProjeto?.localizacao || ""}
                  onChange={(location, lat, lng) => setEditingProjeto({ ...editingProjeto, localizacao: location, latitude: lat, longitude: lng })}
                  initialLat={editingProjeto?.latitude || undefined}
                  initialLng={editingProjeto?.longitude || undefined}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-dataInicio">Data de Início</Label>
                  <Input 
                    id="edit-dataInicio" 
                    type="date"
                    value={editingProjeto?.data_inicio || ""}
                    onChange={(e) => setEditingProjeto({ ...editingProjeto, data_inicio: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-dataFim">Data de Término</Label>
                  <Input 
                    id="edit-dataFim" 
                    type="date"
                    value={editingProjeto?.data_fim || ""}
                    onChange={(e) => setEditingProjeto({ ...editingProjeto, data_fim: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_150px] gap-4">
                <div>
                  <Label htmlFor="edit-orcamento">Orçamento</Label>
                  <Input 
                    id="edit-orcamento" 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 1000000"
                    value={editingProjeto?.orcamento || ""}
                    onChange={(e) => setEditingProjeto({ ...editingProjeto, orcamento: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-moeda">Moeda</Label>
                  <Select value={editingProjeto?.moeda || "MZN"} onValueChange={(value) => setEditingProjeto({ ...editingProjeto, moeda: value })}>
                    <SelectTrigger id="edit-moeda">
                      <SelectValue placeholder="Selecione a moeda" />
                    </SelectTrigger>
                    <SelectContent>
                      {moedas.map((moeda) => (
                        <SelectItem key={moeda.currency_code} value={moeda.currency_code}>
                          {moeda.currency_code} - {moeda.currency_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-cor">Cor do Projeto</Label>
                <Input 
                  id="edit-cor" 
                  type="color"
                  value={editingProjeto?.cor || "#3B82F6"}
                  onChange={(e) => setEditingProjeto({ ...editingProjeto, cor: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-estado">Estado</Label>
                <Select value={editingProjeto?.status || "planejamento"} onValueChange={(value) => setEditingProjeto({ ...editingProjeto, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejamento">Planeamento</SelectItem>
                    <SelectItem value="execucao">Execução</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar projetos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Estados</SelectItem>
            <SelectItem value="planejamento">Planeamento</SelectItem>
            <SelectItem value="execucao">Execução</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="suspenso">Suspenso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projetosFiltrados.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                {userRole === 'Colaborador' 
                  ? 'Você ainda não está incluído em nenhum projeto' 
                  : 'Nenhum projeto encontrado'}
              </p>
              {userRole !== 'Colaborador' && (
                <Button type="button" onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Projeto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          projetosPaginados.map((projeto) => (
            <Card 
            key={projeto.id} 
            className="hover:shadow-lg transition-shadow border-l-4 cursor-pointer"
            style={{ borderLeftColor: projeto.cor || '#3B82F6' }}
            onClick={() => navigate(`/projetos/${projeto.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: projeto.cor || '#3B82F6' }}
                      />
                      {projeto.nome}
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardTitle>
                    {projeto.descricao && (
                    <p className="text-sm text-muted-foreground">{projeto.descricao}</p>
                  )}
                </div>
                 <Badge className={getEstadoBadge(projeto.status)}>
                   {getEstadoLabel(projeto.status)}
                 </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {projeto.localizacao && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{projeto.localizacao}</span>
                  </div>
                )}
                {projeto.data_inicio && projeto.data_fim && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(projeto.data_inicio).toLocaleDateString('pt-PT')} - {new Date(projeto.data_fim).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  {projeto.orcamento && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Orçamento:</span>
                      <span className="font-semibold">{Number(projeto.orcamento).toLocaleString('pt-MZ')} {projeto.moeda}</span>
                    </div>
                  )}
                  {userRole !== 'Colaborador' && (
                    <div className="flex gap-2 ml-auto">
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProjeto(projeto);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingProjeto(projeto);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <p className="text-sm text-muted-foreground order-2 sm:order-1">
            Mostrando {startIndex + 1}-{Math.min(endIndex, projetosFiltrados.length)} de {projetosFiltrados.length} projetos
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
      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto "{deletingProjeto?.nome}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingProjeto(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProjeto}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
};

export default Projetos;