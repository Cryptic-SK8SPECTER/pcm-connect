import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { DashboardCard } from "@/components/DashboardCard";
import { CheckSquare, Clock, TrendingUp, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AtividadeStats {
  total: number;
  concluidas: number;
  emAndamento: number;
  atrasadas: number;
  taxaConclusao: number;
}

export default function MeuDesempenho() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AtividadeStats>({
    total: 0,
    concluidas: 0,
    emAndamento: 0,
    atrasadas: 0,
    taxaConclusao: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchDesempenho();
  }, []);

  const fetchDesempenho = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar atividades do usuário
      const { data: atividades } = await supabase
        .from("atividades")
        .select("*, projetos(nome)")
        .eq("responsavel_id", user.id)
        .order("created_at", { ascending: false });

      if (atividades) {
        const total = atividades.length;
        const concluidas = atividades.filter(a => a.status === "concluida").length;
        const emAndamento = atividades.filter(a => a.status === "em_andamento").length;
        const atrasadas = atividades.filter(a => {
          if (a.data_fim && a.status !== "concluida") {
            return new Date(a.data_fim) < new Date();
          }
          return false;
        }).length;
        
        const taxaConclusao = total > 0 ? Math.round((concluidas / total) * 100) : 0;

        setStats({
          total,
          concluidas,
          emAndamento,
          atrasadas,
          taxaConclusao
        });

        setRecentActivities(atividades.slice(0, 5));
      }
    } catch (error) {
      console.error("Erro ao buscar desempenho:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluida":
        return "text-green-600 bg-green-50";
      case "em_andamento":
        return "text-blue-600 bg-blue-50";
      case "pendente":
        return "text-yellow-600 bg-yellow-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "concluida":
        return "Concluída";
      case "em_andamento":
        return "Em Andamento";
      case "pendente":
        return "Pendente";
      default:
        return status;
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Meu Desempenho" 
        subtitle="Acompanhe suas métricas e atividades"
      />

      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Total de Atividades"
            value={stats.total}
            icon={CheckSquare}
          />
          <DashboardCard
            title="Concluídas"
            value={stats.concluidas}
            icon={Award}
            trend={{ value: `${stats.taxaConclusao}%`, isPositive: true }}
          />
          <DashboardCard
            title="Em Andamento"
            value={stats.emAndamento}
            icon={Clock}
          />
          <DashboardCard
            title="Atrasadas"
            value={stats.atrasadas}
            icon={TrendingUp}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Taxa de Conclusão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso geral</span>
                <span className="font-medium">{stats.taxaConclusao}%</span>
              </div>
              <Progress value={stats.taxaConclusao} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma atividade encontrada
                </p>
              ) : (
                recentActivities.map((atividade) => (
                  <div
                    key={atividade.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{atividade.nome}</h4>
                      <p className="text-sm text-muted-foreground">
                        {atividade.projetos?.nome}
                      </p>
                      {atividade.data_fim && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Prazo: {new Date(atividade.data_fim).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        atividade.status
                      )}`}
                    >
                      {getStatusLabel(atividade.status)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
