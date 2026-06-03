import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { CheckCircle, BarChart3, Users, FileText, Zap, Shield, Phone, Mail, MapPin, Loader2 } from "lucide-react";
import pcmLogo from "@/assets/pcm-connect-logo.png";
import teamBg from "@/assets/team-collaboration-bg.jpg";
import constructionSite from "@/assets/construction-site.jpg";
import maintenanceWork from "@/assets/maintenance-work.jpg";
import projectPlanning from "@/assets/project-planning.jpg";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChatBot } from "@/components/ChatBot";
import { AnimatedSection } from "@/components/AnimatedSection";
import { LocationMap } from "@/components/LocationMap";

const Landing = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });

  const carouselImages = [teamBg, constructionSite, maintenanceWork, projectPlanning];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = await supabase.functions.invoke('enviar-contacto', {
        body: formData
      });
      if (error) throw error;
      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contacto em breve."
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: ""
      });
    } catch (error) {
      toast({
        title: "Erro ao enviar",
        description: "Por favor, tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const features = [{
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Gestão de Projetos",
    description: "Controle completo de projetos, atividades e subatividades em tempo real"
  }, {
    icon: <Users className="h-6 w-6" />,
    title: "Colaboração em Equipa",
    description: "Trabalhe em conjunto com sua equipa de forma eficiente e organizada"
  }, {
    icon: <FileText className="h-6 w-6" />,
    title: "Relatórios Automáticos",
    description: "Gere relatórios detalhados e análises automatizadas dos seus projetos"
  }, {
    icon: <Zap className="h-6 w-6" />,
    title: "Análise com IA",
    description: "Utilize inteligência artificial para otimizar seus processos e decisões"
  }, {
    icon: <Shield className="h-6 w-6" />,
    title: "Segurança Avançada",
    description: "Seus dados protegidos com as melhores práticas de segurança"
  }, {
    icon: <CheckCircle className="h-6 w-6" />,
    title: "Controle Financeiro",
    description: "Gerencie orçamentos, faturas e análise financeira em um só lugar"
  }];
  return <div className="min-h-screen bg-background">
      <ChatBot />
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-white">PCM-CONNECT</span>
          </div>
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            <a href="#home" className="text-white font-medium hover:text-primary transition-colors border-b-2 border-primary pb-1 text-sm lg:text-base">
              HOME
            </a>
            <a href="#about" className="text-white font-medium hover:text-primary transition-colors text-sm lg:text-base">
              SOBRE
            </a>
            <a href="#services" className="text-white font-medium hover:text-primary transition-colors text-sm lg:text-base">
              SERVIÇOS
            </a>
            <a href="#contact" className="text-white font-medium hover:text-primary transition-colors text-sm lg:text-base">
              CONTACTO
            </a>
          </nav>
          <Button size="sm" onClick={() => navigate("/auth")} className="md:hidden bg-primary text-white text-xs">
            ENTRAR
          </Button>
        </div>
      </header>

      

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Carousel Background */}
        {carouselImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ))}
        <div className="container mx-auto px-4 relative z-10">
          <AnimatedSection className="max-w-4xl mx-auto text-center space-y-8">
            
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
              <span className="text-primary">GESTÃO</span> COMPLETA DE{" "}
              <span className="block mt-2">PROJETOS</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto font-light">
              A plataforma completa para gerir seus projetos, equipas e finanças de forma eficiente e inteligente
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-6 text-lg rounded-full">
                ACESSAR A PLATAFORMA
              </Button>
            </div>
          </AnimatedSection>
        </div>
        
        {/* Navigation Dots */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 z-10">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                index === currentImageIndex
                  ? 'bg-primary border-primary scale-125'
                  : 'border-white/50 hover:border-white/80'
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="about" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Sobre
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para gerir seus projetos com eficiência e qualidade
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <AnimatedSection key={index} delay={index * 100}>
                <div className="bg-background border border-border rounded-lg p-6 hover:shadow-lg transition-shadow h-full">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>


      {/* Contact Section */}
      <section id="contact" className="py-24 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              ENTRE EM <span className="text-primary">CONTACTO</span>
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Estamos aqui para ajudar. Entre em contacto connosco para qualquer questão ou solicitação.
            </p>
            <div className="w-32 h-1.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50 mx-auto mt-6 rounded-full" />
          </AnimatedSection>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
            {/* Contact Info - Left Side */}
            <AnimatedSection className="space-y-8" delay={100}>
              <div>
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Contacte-nos</span>
                <h3 className="text-3xl md:text-4xl font-bold text-foreground mt-3 leading-tight">
                  Estamos abertos para<br />falar consigo.
                </h3>
              </div>

              <div className="space-y-6">
                <a 
                  href="https://maps.app.goo.gl/aCar8F3DME64uFYx6" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 group"
                >
                  <div className="p-4 rounded-full bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-foreground font-medium">Afecc Gloria Hotel, Maputo</p>
                    <span className="text-sm font-semibold text-primary uppercase tracking-wider hover:underline">Ver Mapa</span>
                  </div>
                </a>

                <a 
                  href="mailto:info@pcm-connect.com"
                  className="flex items-start gap-4 group"
                >
                  <div className="p-4 rounded-full bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-foreground font-medium">info@pcm-connect.com</p>
                    <span className="text-sm font-semibold text-primary uppercase tracking-wider hover:underline">Enviar Email</span>
                  </div>
                </a>

                <a 
                  href="tel:+258841234567"
                  className="flex items-start gap-4 group"
                >
                  <div className="p-4 rounded-full bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-foreground font-medium">+258 84 123 4567</p>
                    <span className="text-sm font-semibold text-primary uppercase tracking-wider hover:underline">Ligar Agora</span>
                  </div>
                </a>
              </div>
            </AnimatedSection>

            {/* Contact Form - Right Side */}
            <AnimatedSection delay={200} className="bg-gradient-to-br from-background to-muted/20 rounded-2xl border border-border/50 p-10 shadow-2xl">
              <h3 className="text-xl font-bold text-foreground mb-6">Envie-nos uma Mensagem</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Input 
                      placeholder="Nome Completo *" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      required 
                      className="bg-background/50 border-border/50 focus:border-primary h-12 rounded-xl transition-all" 
                    />
                  </div>
                  <div>
                    <Input 
                      type="email" 
                      placeholder="Email *" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      required 
                      className="bg-background/50 border-border/50 focus:border-primary h-12 rounded-xl transition-all" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Input 
                      placeholder="Assunto *" 
                      required 
                      className="bg-background/50 border-border/50 focus:border-primary h-12 rounded-xl transition-all" 
                    />
                  </div>
                  <div>
                    <Input 
                      type="tel" 
                      placeholder="Telefone *" 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      className="bg-background/50 border-border/50 focus:border-primary h-12 rounded-xl transition-all" 
                    />
                  </div>
                </div>

                <div>
                  <Textarea 
                    placeholder="Sua Mensagem *" 
                    value={formData.message} 
                    onChange={e => setFormData({...formData, message: e.target.value})} 
                    required 
                    rows={6} 
                    className="bg-background/50 border-border/50 focus:border-primary resize-none rounded-xl transition-all" 
                  />
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={loading} 
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold px-12 h-12 rounded-xl shadow-lg transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar Agora
                      <Mail className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Nossa <span className="text-primary">Localização</span>
            </h2>
            <p className="text-muted-foreground">
              Visite-nos no Afecc Gloria Hotel, Maputo
            </p>
          </AnimatedSection>
          <AnimatedSection delay={100}>
            <div className="max-w-5xl mx-auto h-[400px] rounded-xl border border-border overflow-hidden shadow-lg">
              <LocationMap 
                lat={-25.9655} 
                lng={32.5832} 
                zoom={15}
                popupText="<strong>PCM-CONNECT</strong><br/>Afecc Gloria Hotel<br/>AV DA MARGINAL N 4441, Maputo"
              />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-muted/50 to-muted border-t border-border">
        <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-16">
          <AnimatedSection className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 mb-8 sm:mb-12">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold text-primary">PCM-CONNECT</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Plataforma completa para gestão de projetos, equipas e finanças. Transforme a forma como gere os seus projetos.
              </p>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>info@pcm-connect.com</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>+258 84 123 4567</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
            <div className="group">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">Links Rápidos</h3>
              <div className="w-0 group-hover:w-12 h-1 bg-gradient-to-r from-primary via-primary to-primary/30 rounded-full mb-4 shadow-[0_0_8px_hsl(var(--primary)/0.5)] transition-all duration-300" />
            </div>
              <ul className="space-y-3">
                <li>
                  <a href="#about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Sobre Nós
                  </a>
                </li>
                <li>
                  <a href="#services" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Serviços
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Contacto
                  </a>
                </li>
                <li>
                  <a href="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Login
                  </a>
                </li>
              </ul>
            </div>

            {/* Product */}
            <div>
            <div className="group">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">Produto</h3>
              <div className="w-0 group-hover:w-12 h-1 bg-gradient-to-r from-primary via-primary to-primary/30 rounded-full mb-4 shadow-[0_0_8px_hsl(var(--primary)/0.5)] transition-all duration-300" />
            </div>
              <ul className="space-y-3">
                <li>
                  <a href="#about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Funcionalidades
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Novidades
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Integrações
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Roadmap
                  </a>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
            <div className="group">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">Newsletter</h3>
              <div className="w-0 group-hover:w-12 h-1 bg-gradient-to-r from-primary via-primary to-primary/30 rounded-full mb-4 shadow-[0_0_8px_hsl(var(--primary)/0.5)] transition-all duration-300" />
            </div>
              <p className="text-sm text-muted-foreground mb-4">
                Receba atualizações e novidades exclusivas.
              </p>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="Seu email"
                  className="bg-background/50 border-border"
                />
                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold">
                  Subscrever
                </Button>
              </div>
              <div className="flex gap-4 mt-6">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </AnimatedSection>

          {/* Bottom Bar */}
          <div className="border-t border-border pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} PCM Connect. Todos os direitos reservados.
              </p>
              <div className="flex gap-6">
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Política de Privacidade
                </a>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Termos de Serviço
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default Landing;