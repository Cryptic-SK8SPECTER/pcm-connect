import { Home, FolderKanban, CheckSquare, BarChart3, Settings, BookOpen, Brain, User, LogOut, Users } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import logo from "@/assets/pcm-connect-logo.png";
import { useTranslations } from "@/hooks/useTranslations";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  
  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const t = useTranslations();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome, role_id, roles(nome)')
            .eq('id', user.id)
            .single();
          
          setUserName(profile?.nome || user.email || "");
          setUserRole(profile?.roles?.nome || "");
        }
      } finally {
        setIsLoadingRole(false);
      }
    };
    
    loadUserData();
  }, []);
  const menuItems = [{
    title: t.sidebar.dashboard,
    url: "/dashboard",
    icon: Home
  }, {
    title: "Dashboard",
    url: "/meu-desempenho",
    icon: BarChart3,
    roleSpecific: "Colaborador"
  }, {
    title: t.sidebar.projects,
    url: "/projetos",
    icon: FolderKanban
  }, {
    title: t.sidebar.activities,
    url: "/atividades",
    icon: CheckSquare
  }, {
    title: t.sidebar.subactivities,
    url: "/subatividades",
    icon: CheckSquare
  }, {
    title: t.sidebar.intelligentEvaluation,
    url: "/relatorios",
    icon: BarChart3
  }, {
    title: t.sidebar.automaticAnalysis,
    url: "/analise-automatica",
    icon: Brain
  }, {
    title: t.sidebar.users,
    url: "/usuarios",
    icon: Users
  }, {
    title: t.sidebar.settings,
    url: "/configuracoes",
    icon: Settings
  }, {
    title: t.sidebar.manual,
    url: "/manual",
    icon: BookOpen
  }];
  
  // Filtrar itens do menu baseado no role
  const filteredMenuItems = userRole === 'Colaborador' 
    ? menuItems.filter(item => 
        item.url === '/meu-desempenho' ||
        item.url === '/projetos' || 
        item.url === '/atividades' ||
        item.url === '/subatividades' ||
        item.url === '/configuracoes'
      )
    : menuItems.filter(item => !item.roleSpecific || item.roleSpecific !== 'Colaborador');
  
  return <Sidebar className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/20 p-6">
        <div className="flex items-center justify-center gap-3 border-2 border-white rounded-lg p-3">
          
          <div className="text-center">
            <h1 className="text-xl font-bold text-sidebar-foreground">PCM-CONNECT</h1>
            <p className="text-sidebar-foreground/70 text-xs">{t.sidebar.projectManagement}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col overflow-hidden">
        <SidebarGroup className="flex-1 flex flex-col overflow-hidden">
          <SidebarGroupContent className="flex-1 flex flex-col px-3 py-4 overflow-y-auto scrollbar-hide">
            <SidebarMenu className="flex flex-col space-y-1">
              {isLoadingRole ? (
                // Mostrar skeleton loading
                Array.from({ length: 6 }).map((_, index) => (
                  <SidebarMenuItem key={index}>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg">
                      <div className="h-5 w-5 bg-white/20 rounded animate-pulse" />
                      <div className="h-4 w-32 bg-white/20 rounded animate-pulse" />
                    </div>
                  </SidebarMenuItem>
                ))
              ) : (
                filteredMenuItems.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        onClick={handleMenuClick}
                        className={({
                          isActive
                        }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? "bg-[#0D9488] text-white font-semibold border-l-4 border-white pl-3" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
          
          <SidebarGroupContent className="px-3 pb-4 mt-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-white/70 hover:bg-white/5 hover:text-white w-full">
                    <LogOut className="h-5 w-5" />
                    <span>Sair</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/20 p-4 mt-0">
        <button onClick={() => { handleMenuClick(); navigate('/perfil'); }} className="flex items-center gap-3 w-full text-left hover:bg-white/5 rounded-lg p-2 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-white/70">{userRole}</p>
          </div>
        </button>
      </SidebarFooter>
    </Sidebar>;
}