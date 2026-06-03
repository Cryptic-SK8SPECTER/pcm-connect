import { useState, useEffect } from "react";
import { Plus, Search, Mail, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "@/hooks/useTranslations";

const Equipas = () => {
  const { toast } = useToast();
  const t = useTranslations();
  const [searchTerm, setSearchTerm] = useState("");
  const [equipas, setEquipas] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: ""
  });

  useEffect(() => {
    fetchEquipas();
  }, []);

  const fetchEquipas = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('equipas')
        .select(`
          *,
          equipa_membros(
            profiles(id, nome, email)
          ),
          projeto_equipas(
            projetos(nome)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEquipas(data || []);
    } catch (error) {
      console.error('Erro ao carregar equipas:', error);
      toast({
        title: t.common.error,
        description: t.teams.errorLoading,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await (supabase as any)
        .from('equipas')
        .insert([{
          nome: formData.nome,
          descricao: formData.descricao
        }]);

      if (error) throw error;

      toast({
        title: t.common.success,
        description: t.teams.teamCreated,
      });

      setIsDialogOpen(false);
      setFormData({
        nome: "",
        descricao: ""
      });
      fetchEquipas();
    } catch (error) {
      console.error('Erro ao criar equipa:', error);
      toast({
        title: t.common.error,
        description: t.teams.errorCreating,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.teams.title}</h1>
          <p className="text-muted-foreground">{t.teams.subtitle}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t.teams.newTeam}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.teams.createNewTeam}</DialogTitle>
              <DialogDescription>
                {t.teams.fillTeamData}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">{t.teams.teamNameLabel}</Label>
                <Input 
                  id="nome" 
                  placeholder={t.teams.teamNamePlaceholder}
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="descricao">{t.teams.descriptionLabel}</Label>
                <Textarea 
                  id="descricao" 
                  placeholder={t.teams.descriptionPlaceholder}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t.teams.cancel}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t.teams.creating : t.teams.createTeam}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.teams.searchTeams}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-6">
        {equipas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">{t.teams.noTeamFound}</p>
              <Button type="button" onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.teams.createFirstTeam}
              </Button>
            </CardContent>
          </Card>
        ) : (
          equipas.map((equipa) => (
            <Card key={equipa.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{equipa.nome}</CardTitle>
                    {equipa.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">{equipa.descricao}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {equipa.projeto_equipas?.length || 0} {equipa.projeto_equipas?.length === 1 ? t.teams.projectSingular : t.teams.projects}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {equipa.equipa_membros?.length || 0} {t.teams.members}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {equipa.projeto_equipas && equipa.projeto_equipas.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t.teams.projectsLabel}</p>
                    <div className="flex flex-wrap gap-2">
                      {equipa.projeto_equipas.map((pe: any, idx: number) => (
                        <Badge key={idx} variant="outline">
                          {pe.projetos?.nome || 'N/A'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {equipa.equipa_membros && equipa.equipa_membros.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">{t.teams.membersLabel}</p>
                    <div className="space-y-3">
                      {equipa.equipa_membros.map((membro: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {membro.profiles ? getInitials(membro.profiles.nome) : '??'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {membro.profiles?.nome || 'N/A'}
                            </p>
                            {membro.profiles?.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span>{membro.profiles.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Equipas;
