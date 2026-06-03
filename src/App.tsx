import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { LocaleProvider } from "./context/LocaleProvider";
import Index from "./pages/Index";
import Projetos from "./pages/Projetos";
import ProjetoDetalhes from "./pages/ProjetoDetalhes";
import AtividadeDetalhes from "./pages/AtividadeDetalhes";
import Atividades from "./pages/Atividades";
import Subatividades from "./pages/Subatividades";
import Relatorios from "./pages/Relatorios";
import AnaliseAutomatica from "./pages/AnaliseAutomatica";
import Usuarios from "./pages/Usuarios";
import Configuracoes from "./pages/Configuracoes";
import Manual from "./pages/Manual";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Perfil from "./pages/Perfil";
import MeuDesempenho from "./pages/MeuDesempenho";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session) {
        // Redirect to /auth without full reload
        window.history.replaceState(null, "", "/auth");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.history.replaceState(null, "", "/auth");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) return null;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocaleProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={
              <ProtectedLayout>
                <SidebarProvider defaultOpen={true}>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col min-w-0">
                      <AppHeader />
                      <main className="flex-1 p-3 sm:p-4 md:p-6 bg-background overflow-x-hidden">
                        <Routes>
                          <Route path="/dashboard" element={<Index />} />
                          <Route path="/meu-desempenho" element={<MeuDesempenho />} />
                          <Route path="/projetos" element={<Projetos />} />
                          <Route path="/projetos/:id" element={<ProjetoDetalhes />} />
                          <Route path="/atividades/:id" element={<AtividadeDetalhes />} />
                          <Route path="/atividades" element={<Atividades />} />
                          <Route path="/subatividades" element={<Subatividades />} />
                          <Route path="/relatorios" element={<Relatorios />} />
                          <Route path="/analise-automatica" element={<AnaliseAutomatica />} />
                          <Route path="/usuarios" element={<Usuarios />} />
                          <Route path="/configuracoes" element={<Configuracoes />} />
                          <Route path="/manual" element={<Manual />} />
                          <Route path="/perfil" element={<Perfil />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedLayout>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LocaleProvider>
  </QueryClientProvider>
);

export default App;
