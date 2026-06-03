import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { User, Briefcase, CheckCircle, TrendingUp, AlertCircle, Lock, Info, Calendar } from "lucide-react";
import { format } from "date-fns";
interface UserProfile {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  username: string | null;
  desempenho: string;
  ativo: boolean;
  role_id: string | null;
  roles?: {
    nome: string;
  };
}
interface Projeto {
  id: string;
  nome: string;
  status: string;
  cor: string;
  progresso: number;
}
interface Atividade {
  id: string;
  nome: string;
  status: string;
  prioridade: string;
  data_fim: string | null;
  projeto: {
    nome: string;
    cor: string;
  };
  jaConfirmada: boolean;
  progresso_manual?: number;
}
export default function Perfil() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [atividadesAndamento, setAtividadesAndamento] = useState<Atividade[]>([]);
  const [atividadesConcluidas, setAtividadesConcluidas] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedAtividade, setSelectedAtividade] = useState<Atividade | null>(null);
  const [observacao, setObservacao] = useState("");
  const [filtroProjetoId, setFiltroProjetoId] = useState<string>("todos");
  const [filtroProjetoAndamento, setFiltroProjetoAndamento] = useState<string>("todos");
  const [filtroProjetoConcluidas, setFiltroProjetoConcluidas] = useState<string>("todos");

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar perfil do usuário
      const {
        data: profileData
      } = await supabase.from("profiles").select("*, roles(nome)").eq("id", user.id).single();
      setProfile(profileData);

      // Buscar projetos onde o usuário é membro ou responsável por atividades
      const {
        data: projetosMembros
      } = await supabase.from("projeto_membros").select(`
          projeto_id,
          projetos(id, nome, status, cor)
        `).eq("user_id", user.id);

      // Buscar projetos onde o usuário é responsável por atividades
      const {
        data: projetosAtividades
      } = await supabase.from("atividades").select(`
          projeto_id,
          projetos(id, nome, status, cor)
        `).eq("responsavel_id", user.id);

      // Combinar e remover duplicados
      const projetosUnicos = new Map();
      if (projetosMembros) {
        projetosMembros.forEach((pm: any) => {
          if (pm.projetos) {
            projetosUnicos.set(pm.projetos.id, pm.projetos);
          }
        });
      }
      if (projetosAtividades) {
        projetosAtividades.forEach((pa: any) => {
          if (pa.projetos && !projetosUnicos.has(pa.projetos.id)) {
            projetosUnicos.set(pa.projetos.id, pa.projetos);
          }
        });
      }
      const projetosData = Array.from(projetosUnicos.values()).map(projeto => ({
        projeto_id: projeto.id,
        projetos: projeto
      }));
      if (projetosData) {
        const projetosFormatados = await Promise.all(projetosData.map(async (pm: any) => {
          // Calcular progresso baseado nas atividades
          const {
            data: atividadesProj
          } = await supabase.from("atividades").select("status").eq("projeto_id", pm.projetos.id);
          const total = atividadesProj?.length || 0;
          const concluidas = atividadesProj?.filter((a: any) => a.status === "concluida").length || 0;
          const progresso = total > 0 ? Math.round(concluidas / total * 100) : 0;
          return {
            id: pm.projetos.id,
            nome: pm.projetos.nome,
            status: pm.projetos.status,
            cor: pm.projetos.cor,
            progresso
          };
        }));
        setProjetos(projetosFormatados);
      }

      // Buscar atividades pendentes de todos os projetos relacionados ao usuário
      const projetoIds = Array.from(projetosUnicos.keys());
      if (projetoIds.length > 0) {
        const {
          data: atividadesData
        } = await supabase.from("atividades").select(`
            id,
            nome,
            status,
            prioridade,
            data_fim,
            responsavel_id,
            projeto_id,
            projetos(nome, cor)
          `).in("projeto_id", projetoIds).eq("responsavel_id", user.id).eq("status", "pendente");
        if (atividadesData) {
          // Verificar quais já foram confirmadas pelo usuário
          const {
            data: confirmacoes
          } = await supabase.from("atividade_confirmacoes").select("atividade_id").eq("user_id", user.id);
          const idsConfirmadas = confirmacoes?.map(c => c.atividade_id) || [];

          // Todas as atividades onde o usuário é responsável
          const atividadesFormatadas = atividadesData.map((a: any) => ({
            id: a.id,
            nome: a.nome,
            status: a.status,
            prioridade: a.prioridade,
            data_fim: a.data_fim,
            projeto: a.projetos,
            jaConfirmada: idsConfirmadas.includes(a.id)
          }));
          setAtividades(atividadesFormatadas);
        }

        // Buscar atividades em andamento
        const {
          data: atividadesAndamentoData
        } = await supabase.from("atividades").select(`
            id,
            nome,
            status,
            prioridade,
            data_fim,
            responsavel_id,
            projeto_id,
            progresso_manual,
            projetos(nome, cor)
          `).in("projeto_id", projetoIds).eq("responsavel_id", user.id).eq("status", "em_andamento");
        
        if (atividadesAndamentoData) {
          const atividadesAndamentoFormatadas = atividadesAndamentoData.map((a: any) => ({
            id: a.id,
            nome: a.nome,
            status: a.status,
            prioridade: a.prioridade,
            data_fim: a.data_fim,
            projeto: a.projetos,
            progresso_manual: a.progresso_manual || 0,
            jaConfirmada: false
          }));
          setAtividadesAndamento(atividadesAndamentoFormatadas);
        }

        // Buscar atividades concluídas (aprovadas pelos gestores)
        const {
          data: confirmacoesAprovadas
        } = await supabase.from("atividade_confirmacoes").select(`
            atividade_id,
            aprovado_em,
            atividades(
              id,
              nome,
              status,
              prioridade,
              data_fim,
              responsavel_id,
              projeto_id,
              projetos(nome, cor)
            )
          `).eq("user_id", user.id).eq("status", "aprovado").in("atividade_id", projetoIds.length > 0 ? [] : []);
        
        // Buscar todas as atividades do usuário que tenham confirmação aprovada
        const {
          data: atividadesComConfirmacao
        } = await supabase.from("atividades").select(`
            id,
            nome,
            status,
            prioridade,
            data_fim,
            responsavel_id,
            projeto_id,
            progresso_manual,
            projetos(nome, cor)
          `).in("projeto_id", projetoIds).eq("responsavel_id", user.id);
        
        if (atividadesComConfirmacao) {
          // Buscar confirmações aprovadas para essas atividades
          const atividadeIds = atividadesComConfirmacao.map(a => a.id);
          const {
            data: confirmacoesAprovadasUser
          } = await supabase.from("atividade_confirmacoes").select("atividade_id, aprovado_em").eq("user_id", user.id).eq("status", "aprovado").in("atividade_id", atividadeIds);
          
          const idsAprovadas = confirmacoesAprovadasUser?.map(c => c.atividade_id) || [];
          
          const atividadesConcluidasFormatadas = atividadesComConfirmacao.filter((a: any) => idsAprovadas.includes(a.id)).map((a: any) => ({
            id: a.id,
            nome: a.nome,
            status: a.status,
            prioridade: a.prioridade,
            data_fim: a.data_fim,
            projeto: a.projetos,
            progresso_manual: a.progresso_manual || 100,
            jaConfirmada: true
          }));
          setAtividadesConcluidas(atividadesConcluidasFormatadas);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleConfirmarAtividade = (atividade: Atividade) => {
    setSelectedAtividade(atividade);
    setObservacao("");
    setConfirmDialogOpen(true);
  };
  const handleIniciarAtividade = async (atividadeId: string) => {
    try {
      const {
        error
      } = await supabase.from("atividades").update({
        status: "em_andamento"
      }).eq("id", atividadeId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Atividade iniciada com sucesso!"
      });

      // Recarregar todos os dados
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível iniciar a atividade",
        variant: "destructive"
      });
    }
  };
  const confirmarAtividadeDefinitivo = async () => {
    if (!selectedAtividade) return;
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: confirmacao,
        error
      } = await supabase.from("atividade_confirmacoes").insert({
        atividade_id: selectedAtividade.id,
        user_id: user.id,
        observacao: observacao || null
      }).select().single();
      if (error) throw error;

      // Notificar gestores via edge function
      try {
        await supabase.functions.invoke("notificar-confirmacao", {
          body: {
            confirmacao_id: confirmacao.id,
            atividade_id: selectedAtividade.id,
            usuario_id: user.id
          }
        });
      } catch (notifError) {
        console.error("Erro ao notificar gestores:", notifError);
        // Não bloqueia o fluxo se a notificação falhar
      }
      toast({
        title: "Sucesso",
        description: "Atividade confirmada! Os gestores foram notificados para análise."
      });

      // Recarregar todos os dados
      await fetchData();
      
      setConfirmDialogOpen(false);
      setSelectedAtividade(null);
      setObservacao("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível confirmar a atividade",
        variant: "destructive"
      });
    }
  };
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }
    setLoadingPassword(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso"
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingPassword(false);
    }
  };
  const getDesempenhoColor = (desempenho: string) => {
    switch (desempenho) {
      case "muito_bom":
        return "bg-green-50 text-green-700 border-green-200";
      case "bom":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "regular":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "mau":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };
  const getDesempenhoLabel = (desempenho: string) => {
    switch (desempenho) {
      case "muito_bom":
        return "Muito Bom";
      case "bom":
        return "Bom";
      case "regular":
        return "Regular";
      case "mau":
        return "Mau";
      default:
        return desempenho;
    }
  };
  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "alta":
        return "bg-red-50 text-red-700 border-red-200";
      case "media":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "baixa":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluida":
        return "bg-green-50 text-green-700 border-green-200";
      case "em_andamento":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "pendente":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "planejamento":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "concluido":
        return "bg-green-50 text-green-700 border-green-200";
      case "pausado":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="min-h-screen bg-muted/30">
      <PageHeader icon={User} title="Meu Perfil" subtitle="Gerencie suas informações pessoais e configurações" />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar - Perfil */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {/* Profile Card */}
            <Card className="border shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-32 w-32 ring-4 ring-primary/10">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                        {profile?.nome?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md" title="Editar foto">
                      <User className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-foreground">{profile?.nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {profile?.roles?.nome || "Colaborador"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Performance Metrics */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Métricas de Desempenho
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Avaliação Geral</span>
                    <Badge variant="outline" className={`text-xs font-semibold ${getDesempenhoColor(profile?.desempenho || 'bom')}`}>
                      {getDesempenhoLabel(profile?.desempenho || 'bom')}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total de Atividades</span>
                      <span className="font-semibold text-foreground">
                        {atividades.length + atividadesAndamento.length + atividadesConcluidas.length}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Concluídas</span>
                      <span className="font-semibold text-green-600">
                        {atividadesConcluidas.length}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Em Andamento</span>
                      <span className="font-semibold text-yellow-600">
                        {atividadesAndamento.length}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Pendentes</span>
                      <span className="font-semibold text-blue-600">
                        {atividades.filter(a => !a.jaConfirmada).length}
                      </span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Taxa de Conclusão</span>
                      <span className="font-semibold text-foreground">
                        {atividades.length + atividadesAndamento.length + atividadesConcluidas.length > 0
                          ? Math.round((atividadesConcluidas.length / (atividades.length + atividadesAndamento.length + atividadesConcluidas.length)) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={
                        atividades.length + atividadesAndamento.length + atividadesConcluidas.length > 0
                          ? (atividadesConcluidas.length / (atividades.length + atividadesAndamento.length + atividadesConcluidas.length)) * 100
                          : 0
                      } 
                      className="h-1.5" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Projetos Ativos</span>
                      <span className="font-semibold text-foreground">{projetos.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Tabs */}
          <div className="lg:col-span-9">
            <Card className="border shadow-sm">
              <CardContent className="p-0">
                <Tabs defaultValue="personal" className="w-full">
                  <div className="border-b px-6 pt-6">
                    <TabsList className="bg-transparent border-0 h-auto p-0 w-full justify-start gap-8">
                      <TabsTrigger value="personal" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0 pb-3 shadow-none text-sm font-medium text-muted-foreground data-[state=active]:text-foreground">
                        Detalhes Pessoais
                      </TabsTrigger>
                      <TabsTrigger value="password" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0 pb-3 shadow-none text-sm font-medium text-muted-foreground data-[state=active]:text-foreground">
                        Alterar Senha
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Personal Details Tab */}
                  <TabsContent value="personal" className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-normal text-foreground">
                          Nome
                        </Label>
                        <Input id="firstName" defaultValue={profile?.nome || ''} className="border-input" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-normal text-foreground">
                          Username
                        </Label>
                        <Input id="username" defaultValue={profile?.username || ''} placeholder="@username" className="border-input" />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="email" className="text-sm font-normal text-foreground">
                          Email
                        </Label>
                        <Input id="email" defaultValue={profile?.email || ''} className="border-input" disabled />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role" className="text-sm font-normal text-foreground">
                          Função
                        </Label>
                        <Input id="role" defaultValue={profile?.roles?.nome || 'N/A'} className="border-input" disabled />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-sm font-normal text-foreground">
                          Status
                        </Label>
                        <Input id="status" defaultValue={profile?.ativo ? "Ativo" : "Inativo"} className="border-input" disabled />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button variant="outline">Cancelar</Button>
                      <Button>Salvar Alterações</Button>
                    </div>
                  </TabsContent>

                  {/* Change Password Tab */}
                  <TabsContent value="password" className="p-6 space-y-6">
                    <form onSubmit={handlePasswordChange} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className="text-sm font-normal text-foreground">
                          Senha Atual
                        </Label>
                        <Input id="currentPassword" type="password" placeholder="Digite a senha atual" className="border-input" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword" className="text-sm font-normal text-foreground">
                            Nova Senha
                          </Label>
                          <Input id="newPassword" type="password" placeholder="Digite a nova senha" className="border-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-sm font-normal text-foreground">
                            Confirmar Senha
                          </Label>
                          <Input id="confirmPassword" type="password" placeholder="Confirme a nova senha" className="border-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        </div>
                      </div>

                      <div className="bg-muted/50 border border-border rounded-lg p-4">
                        <h4 className="text-sm font-medium text-foreground mb-2">Requisitos da Senha:</h4>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Mínimo de 6 caracteres</li>
                          <li>Deve conter letras maiúsculas e minúsculas</li>
                          <li>Inclua pelo menos um número</li>
                        </ul>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => {
                        setNewPassword("");
                        setConfirmPassword("");
                      }}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={loadingPassword}>
                          {loadingPassword ? "Atualizando..." : "Atualizar Senha"}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog de Confirmação de Atividade */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Confirmar Conclusão de Atividade
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p>
                Você está prestes a confirmar a conclusão de:{" "}
                <span className="font-semibold text-foreground">
                  {selectedAtividade?.nome}
                </span>
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="observacao">Observação (Opcional)</Label>
                <Textarea id="observacao" placeholder="Adicione notas ou comentários relevantes..." value={observacao} onChange={e => setObservacao(e.target.value)} className="min-h-[100px]" />
              </div>

              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Os gestores serão notificados para revisar e aprovar sua confirmação.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarAtividadeDefinitivo}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}