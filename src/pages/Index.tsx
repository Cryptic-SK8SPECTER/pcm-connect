import { FolderKanban, CheckSquare, Users, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "@/hooks/useTranslations";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const t = useTranslations();
  
  // Buscar estatísticas reais
  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['dashboard-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select('status');
      if (error) throw error;
      return data;
    }
  });

  const { data: activitiesData, isLoading: loadingActivities } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atividades')
        .select('status, progresso_manual');
      if (error) throw error;
      return data;
    }
  });

  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['dashboard-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('ativo')
        .eq('ativo', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: recentProjectsData, isLoading: loadingRecentProjects } = useQuery({
    queryKey: ['dashboard-recent-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projetos')
        .select(`
          id,
          nome,
          data_fim,
          status,
          orcamento,
          atividades(
            id,
            status, 
            progresso_manual,
            orcamento
          )
        `)
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      
      // Buscar faturas para cada projeto
      const projectsWithFinances = await Promise.all(
        (data || []).map(async (projeto) => {
          const { data: faturas } = await supabase
            .from('faturas')
            .select('valor, status')
            .eq('projeto_id', projeto.id)
            .in('status', ['aprovada', 'pendente', 'fora_orcamento']);
          
          const totalGasto = faturas?.reduce((sum, f) => sum + Number(f.valor || 0), 0) || 0;
          
          return {
            ...projeto,
            totalGasto
          };
        })
      );
      
      return projectsWithFinances;
    }
  });

  const { data: recentActivitiesData, isLoading: loadingRecentActivities } = useQuery({
    queryKey: ['dashboard-recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atividades')
        .select(`
          id,
          nome,
          progresso_manual,
          projeto_id,
          projetos(
            nome,
            projeto_equipas(
              equipas(
                nome
              )
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      
      return data?.map(atividade => ({
        nome: atividade.nome,
        progresso: atividade.progresso_manual || 0,
        projeto: atividade.projetos?.nome || 'N/A',
        equipa: atividade.projetos?.projeto_equipas?.[0]?.equipas?.nome || '-'
      })) || [];
    }
  });

  // Calcular estatísticas
  const activeProjectsCount = projectsData?.filter(p => p.status === 'em_progresso').length || 0;
  const totalProjects = projectsData?.length || 0;
  const pendingActivitiesCount = activitiesData?.filter(a => a.status === 'pendente').length || 0;
  const completedActivitiesCount = activitiesData?.filter(a => a.status === 'concluida').length || 0;
  const totalActivities = activitiesData?.length || 0;
  const completionRate = totalActivities > 0 
    ? Math.round((completedActivitiesCount / totalActivities) * 100) 
    : 0;
  const membersCount = membersData?.length || 0;

  const stats = [
    {
      title: t.dashboard.activeProjects,
      value: loadingProjects ? "..." : totalProjects,
      subtitle: `${activeProjectsCount} ${t.common.active.toLowerCase()}`,
      icon: FolderKanban,
    },
    {
      title: t.dashboard.pendingActivities,
      value: loadingActivities ? "..." : pendingActivitiesCount,
      subtitle: `${completedActivitiesCount} ${t.dashboard.completed}`,
      icon: CheckSquare,
    },
    {
      title: t.teams.members,
      value: loadingMembers ? "..." : membersCount,
      subtitle: `${t.common.active} ${t.dashboard.inSystem}`,
      icon: Users,
    },
    {
      title: t.dashboard.completionRate,
      value: loadingActivities ? "..." : `${completionRate}%`,
      subtitle: t.activities.title,
      icon: TrendingUp,
    },
  ];

  const recentProjects = recentProjectsData?.map(projeto => {
    const orcamento = Number(projeto.orcamento || 0);
    const totalGasto = Number(projeto.totalGasto || 0);
    
    // Calcular progresso baseado no saldo disponível (total gasto vs orçamento)
    const progress = orcamento > 0 
      ? Math.min(Math.round((totalGasto / orcamento) * 100), 100)
      : 0;
    
    const deadline = projeto.data_fim 
      ? new Date(projeto.data_fim).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
      : t.dashboard.noDeadline;
    
    const today = new Date();
    const dataFim = projeto.data_fim ? new Date(projeto.data_fim) : null;
    const isAtRisk = dataFim && dataFim < today && projeto.status !== 'concluido';
    
    return {
      name: projeto.nome,
      progress,
      deadline,
      status: isAtRisk ? 'at-risk' : 'on-time',
      orcamento,
      totalGasto
    };
  }) || [];

  const recentActivities = recentActivitiesData || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">{t.dashboard.subtitle}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <DashboardCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t.dashboard.recentProjects}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentProjects.map((project, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{project.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{project.deadline}</p>
                      {project.status === "at-risk" && (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                          {t.dashboard.atRisk}
                        </span>
                      )}
                    </div>
                    {project.orcamento > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.dashboard.spent}: {project.totalGasto.toLocaleString('pt-MZ')} / {project.orcamento.toLocaleString('pt-MZ')} MZN
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t.dashboard.recentRubrics}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingRecentActivities ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : recentActivities.length > 0 ? (
              recentActivities.map((atividade, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{atividade.nome}</p>
                      <div className="flex flex-col gap-1 mt-1">
                        <p className="text-xs text-muted-foreground">
                          <Users className="h-3 w-3 inline mr-1" />
                          {atividade.equipa}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.dashboard.project}: {atividade.projeto}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{atividade.progresso}%</span>
                  </div>
                  <Progress value={atividade.progresso} className="h-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t.dashboard.noActivitiesFound}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
