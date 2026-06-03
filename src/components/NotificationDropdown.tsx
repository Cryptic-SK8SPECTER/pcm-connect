import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  link: string | null;
  created_at: string;
}

export function NotificationDropdown() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotificacoes();
    
    // Configurar realtime para novas notificações
    const channel = supabase
      .channel('notificacoes-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `user_id=eq.${supabase.auth.getUser().then(u => u.data.user?.id)}`
        },
        (payload) => {
          console.log('Nova notificação recebida:', payload);
          setNotificacoes(prev => [payload.new as Notificacao, ...prev]);
          
          // Mostrar toast para nova notificação
          toast({
            title: (payload.new as any).titulo,
            description: (payload.new as any).mensagem,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotificacoes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotificacoes(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLida = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("id", id);

      if (error) throw error;

      setNotificacoes(prev =>
        prev.map(n => n.id === id ? { ...n, lida: true } : n)
      );
    } catch (error: any) {
      console.error("Erro ao marcar notificação:", error);
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("user_id", user.id)
        .eq("lida", false);

      if (error) throw error;

      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      toast({ title: "Todas as notificações foram marcadas como lidas" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar as notificações",
        variant: "destructive",
      });
    }
  };

  const handleNotificacaoClick = async (notif: Notificacao) => {
    // Marcar como lida
    if (!notif.lida) {
      await marcarComoLida(notif.id);
    }

    // Navegar se tiver link
    if (notif.link) {
      navigate(notif.link);
      setOpen(false);
    }
  };

  const deleteNotificacao = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      const { error } = await supabase
        .from("notificacoes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setNotificacoes(prev => prev.filter(n => n.id !== id));
      toast({ title: "Notificação removida" });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a notificação",
        variant: "destructive",
      });
    }
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "confirmacao_atividade":
        return "🎯";
      case "aprovacao":
        return "✅";
      case "rejeicao":
        return "❌";
      default:
        return "📢";
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {naoLidas > 9 ? "9+" : naoLidas}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-[400px] max-w-[95vw] bg-card border-border shadow-xl z-50"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Notificações</h3>
            {naoLidas > 0 && (
              <Badge variant="secondary" className="ml-1">
                {naoLidas}
              </Badge>
            )}
          </div>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={marcarTodasComoLidas}
              className="h-8 text-xs gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px] bg-background">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              Carregando...
            </div>
          ) : notificacoes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notificacoes.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificacaoClick(notif)}
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer group relative ${
                    !notif.lida ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">
                      {getTipoIcon(notif.tipo)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium text-foreground ${!notif.lida ? "font-semibold" : ""}`}>
                          {notif.titulo}
                        </p>
                        {!notif.lida && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notif.mensagem}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(notif.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => deleteNotificacao(notif.id, e)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notificacoes.length > 0 && (
          <div className="p-2 border-t border-border bg-muted/30">
            <Button
              variant="ghost"
              className="w-full text-xs"
              onClick={() => {
                navigate("/perfil");
                setOpen(false);
              }}
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
