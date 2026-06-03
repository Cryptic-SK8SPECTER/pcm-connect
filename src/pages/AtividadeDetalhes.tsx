import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, MessageSquare, CheckCircle2, Edit, Trash2, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SubatividadeDetalhes } from "@/components/SubatividadeDetalhes";

const AtividadeDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [atividade, setAtividade] = useState<any>(null);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [anexos, setAnexos] = useState<any[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [projetoId, setProjetoId] = useState<string | null>(null);
  const [projeto, setProjeto] = useState<any>(null);
  const [progresso, setProgresso] = useState<number>(0);
  const [isEditingProgresso, setIsEditingProgresso] = useState(false);
  const [expandedSubatividades, setExpandedSubatividades] = useState<Set<string>>(new Set());
  const [totalGasto, setTotalGasto] = useState<number>(0);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (id && userRole) {
      fetchAtividadeDetalhes();
    }
  }, [id, userRole]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("role_id, roles(nome)")
        .eq("id", user.id)
        .single();
      
      const roleName = (profile as any)?.roles?.nome;
      setUserRole(roleName);
    } catch (error) {
      console.error("Erro ao buscar role:", error);
    }
  };

  const fetchAtividadeDetalhes = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: atividadeData, error: atividadeError } = await (supabase as any)
        .from('atividades')
        .select(`
          *,
          profiles(id, nome, email),
          subatividades(*)
        `)
        .eq('id', id)
        .single();

      if (atividadeError) throw atividadeError;

      // Se for colaborador, verificar se é responsável pela atividade
      if (userRole === 'Colaborador' && user && atividadeData.responsavel_id !== user.id) {
        toast({
          title: "Acesso Negado",
          description: "Você só pode visualizar detalhes das atividades onde é responsável.",
          variant: "destructive"
        });
        navigate('/atividades');
        return;
      }

      setAtividade(atividadeData);
      setProjetoId(atividadeData.projeto_id);

      // Fetch projeto para obter a moeda
      const { data: projetoData, error: projetoError } = await (supabase as any)
        .from('projetos')
        .select('moeda')
        .eq('id', atividadeData.projeto_id)
        .single();

      if (!projetoError && projetoData) {
        setProjeto(projetoData);
      }

      // Calcular progresso baseado em subatividades ou progresso manual
      if (atividadeData.progresso_manual !== null) {
        setProgresso(atividadeData.progresso_manual);
      } else if (atividadeData.subatividades && atividadeData.subatividades.length > 0) {
        const concluidasCount = atividadeData.subatividades.filter((s: any) => s.concluida).length;
        setProgresso(Math.round((concluidasCount / atividadeData.subatividades.length) * 100));
      }

      // Fetch comentários with proper foreign key reference
      const { data: comentariosData, error: comentariosError } = await (supabase as any)
        .from('atividade_comentarios')
        .select('*')
        .eq('atividade_id', id)
        .order('created_at', { ascending: false });

      if (comentariosError) throw comentariosError;
      setComentarios(comentariosData || []);

      // Fetch anexos with proper foreign key reference
      const { data: anexosData, error: anexosError } = await (supabase as any)
        .from('atividade_anexos')
        .select('*')
        .eq('atividade_id', id)
        .order('created_at', { ascending: false });

      if (anexosError) throw anexosError;
      setAnexos(anexosData || []);

      // Fetch faturas aprovadas para calcular total gasto
      const { data: faturasData, error: faturasError } = await (supabase as any)
        .from('faturas')
        .select('valor')
        .eq('atividade_id', id)
        .eq('status', 'aprovada');

      if (!faturasError && faturasData) {
        const total = faturasData.reduce((acc: number, fatura: any) => acc + Number(fatura.valor), 0);
        setTotalGasto(total);
      }

    } catch (error: any) {
      console.error('Erro ao carregar detalhes:', error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível carregar os detalhes da tarefa.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdicionarComentario = async () => {
    if (!novoComentario.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await (supabase as any)
        .from('atividade_comentarios')
        .insert([{
          atividade_id: id,
          comentario: novoComentario,
          created_by: user.id
        }]);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Comentário adicionado!" });
      setNovoComentario("");
      fetchAtividadeDetalhes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível adicionar comentário.",
        variant: "destructive",
      });
    }
  };

  const handleUploadAnexo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('atividade-anexos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('atividade-anexos')
          .getPublicUrl(fileName);

        const { error: insertError } = await (supabase as any)
          .from('atividade_anexos')
          .insert([{
            atividade_id: id,
            nome_arquivo: file.name,
            url: publicUrl,
            tipo_arquivo: file.type,
            tamanho: file.size,
            created_by: user.id
          }]);

        if (insertError) throw insertError;
      }

      toast({ title: "Sucesso", description: "Anexos enviados com sucesso!" });
      fetchAtividadeDetalhes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível enviar os anexos.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAnexo = async (anexoId: string, url: string) => {
    try {
      const fileName = url.split('/').slice(-2).join('/');
      
      const { error: storageError } = await supabase.storage
        .from('atividade-anexos')
        .remove([fileName]);

      if (storageError) throw storageError;

      const { error: dbError } = await (supabase as any)
        .from('atividade_anexos')
        .delete()
        .eq('id', anexoId);

      if (dbError) throw dbError;

      toast({ title: "Sucesso", description: "Anexo removido!" });
      fetchAtividadeDetalhes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível remover o anexo.",
        variant: "destructive",
      });
    }
  };

  const handleSalvarProgresso = async () => {
    try {
      const { error } = await (supabase as any)
        .from('atividades')
        .update({ progresso_manual: progresso })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Progresso atualizado!" });
      setIsEditingProgresso(false);
      fetchAtividadeDetalhes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível atualizar o progresso.",
        variant: "destructive",
      });
    }
  };

  const handleConcluirSubatividade = async (subatividadeId: string, concluida: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('subatividades')
        .update({
          concluida: !concluida,
          data_conclusao: !concluida ? new Date().toISOString() : null
        })
        .eq('id', subatividadeId);

      if (error) throw error;
      fetchAtividadeDetalhes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a sub-rubrica.",
        variant: "destructive",
      });
    }
  };

  const handleConcluirAtividade = async () => {
    try {
      const { error } = await (supabase as any)
        .from('atividades')
        .update({
          status: 'concluida',
          progresso_manual: 100
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Tarefa concluída!" });
      fetchAtividadeDetalhes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível concluir a tarefa.",
        variant: "destructive",
      });
    }
  };

  const toggleSubatividade = (subId: string) => {
    const newExpanded = new Set(expandedSubatividades);
    if (newExpanded.has(subId)) {
      newExpanded.delete(subId);
    } else {
      newExpanded.add(subId);
    }
    setExpandedSubatividades(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: string } = {
      pendente: "bg-gray-100 text-gray-800",
      em_andamento: "bg-blue-100 text-blue-800",
      concluida: "bg-green-100 text-green-800",
      cancelada: "bg-red-100 text-red-800",
    };
    const labels: { [key: string]: string } = {
      pendente: "Pendente",
      em_andamento: "Em Andamento",
      concluida: "Concluída",
      cancelada: "Cancelada",
    };
    return { class: variants[status] || "bg-gray-100 text-gray-800", label: labels[status] || status };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-6 w-full max-w-4xl p-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!atividade) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Tarefa não encontrada</p>
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  const statusInfo = getStatusBadge(atividade.status);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projetos/${projetoId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full flex-shrink-0" 
            style={{ backgroundColor: atividade.cor || '#10B981' }}
          />
          <h1 className="text-3xl font-bold text-foreground">{atividade.nome}</h1>
        </div>
        <div className="flex gap-2">
          <Badge className={statusInfo.class}>{statusInfo.label}</Badge>
          {atividade.status !== 'concluida' && (
            <Button onClick={handleConcluirAtividade} variant="default">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Submeter
            </Button>
          )}
        </div>
      </div>

      {/* Informações Principais */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Tarefa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {atividade.descricao && (
            <div>
              <Label className="text-sm font-medium">Descrição</Label>
              <p className="text-sm text-muted-foreground mt-1">{atividade.descricao}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {atividade.data_inicio && (
              <div>
                <Label className="text-sm font-medium">Data de Início</Label>
                <p className="text-sm text-muted-foreground">{new Date(atividade.data_inicio).toLocaleDateString('pt-PT')}</p>
              </div>
            )}
            {atividade.data_fim && (
              <div>
                <Label className="text-sm font-medium">Data de Fim</Label>
                <p className="text-sm text-muted-foreground">{new Date(atividade.data_fim).toLocaleDateString('pt-PT')}</p>
              </div>
            )}
          </div>
          {atividade.profiles && (
            <div>
              <Label className="text-sm font-medium">Responsável</Label>
              <p className="text-sm text-muted-foreground">{atividade.profiles.nome}</p>
            </div>
          )}
          <div>
            <Label className="text-sm font-medium">Prioridade</Label>
            <p className="text-sm text-muted-foreground capitalize">{atividade.prioridade}</p>
          </div>
          {atividade.orcamento && atividade.orcamento > 0 && (
            <div className="pt-4 border-t space-y-2">
              <Label className="text-sm font-medium">Resumo Financeiro</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Orçamento</p>
                  <p className="text-lg font-semibold">{Number(atividade.orcamento).toLocaleString('pt-MZ')} {projeto?.moeda || 'MZN'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Gasto</p>
                  <p className="text-lg font-semibold">{totalGasto.toLocaleString('pt-MZ')} {projeto?.moeda || 'MZN'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`text-lg font-semibold ${(Number(atividade.orcamento) - totalGasto) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(Number(atividade.orcamento) - totalGasto).toLocaleString('pt-MZ')} {projeto?.moeda || 'MZN'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progresso */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Progresso</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditingProgresso(!isEditingProgresso)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Ajustar Manualmente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {atividade?.orcamento ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{((totalGasto / atividade.orcamento) * 100).toFixed(1)}%</span>
                <span className="text-sm text-muted-foreground">
                  Total gasto: {totalGasto.toFixed(2)} / {atividade.orcamento} {projeto?.moeda || 'MZN'}
                </span>
              </div>
              <Progress value={(totalGasto / atividade.orcamento) * 100} className="h-3" />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Sem orçamento definido para calcular o avanço
            </div>
          )}
          {isEditingProgresso && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Ajustar Progresso: {progresso}%</Label>
                <Slider
                  value={[progresso]}
                  onValueChange={(value) => setProgresso(value[0])}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSalvarProgresso}>Salvar</Button>
                <Button variant="outline" onClick={() => setIsEditingProgresso(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Atividades */}
      {atividade.subatividades && atividade.subatividades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Atividades ({atividade.subatividades.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {atividade.subatividades.map((sub: any) => (
                <Collapsible
                  key={sub.id}
                  open={expandedSubatividades.has(sub.id)}
                  onOpenChange={() => toggleSubatividade(sub.id)}
                >
                  <div className="rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-start gap-3 p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConcluirSubatividade(sub.id, sub.concluida);
                          }}
                        >
                          <CheckCircle2 className={`h-5 w-5 ${sub.concluida ? 'text-green-600 fill-green-600' : 'text-muted-foreground'}`} />
                        </Button>
                        <div className="flex-1 text-left">
                          <p className={`font-medium ${sub.concluida ? 'line-through text-muted-foreground' : ''}`}>
                            {sub.nome}
                          </p>
                          {sub.data_conclusao && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Concluída em {new Date(sub.data_conclusao).toLocaleDateString('pt-PT')}
                            </p>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SubatividadeDetalhes 
                        subatividade={sub} 
                        atividadeResponsavelId={atividade?.responsavel_id || null}
                        onUpdate={fetchAtividadeDetalhes}
                      />
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anexos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Anexos ({anexos.length})</CardTitle>
            <label htmlFor="file-upload">
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Adicionar Anexo
                </span>
              </Button>
            </label>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleUploadAnexo}
              multiple
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            />
          </div>
        </CardHeader>
        <CardContent>
          {anexos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum anexo adicionado</p>
          ) : (
            <div className="space-y-2">
              {anexos.map((anexo) => (
                <div key={anexo.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{anexo.nome_arquivo}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(anexo.tamanho)} • {new Date(anexo.created_at).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(anexo.url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAnexo(anexo.id, anexo.url)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comentários */}
      <Card>
        <CardHeader>
          <CardTitle>Comentários ({comentarios.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Adicione um comentário, justificativa ou atualização..."
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              rows={3}
            />
            <Button onClick={handleAdicionarComentario} disabled={!novoComentario.trim()}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Adicionar Comentário
            </Button>
          </div>
          {comentarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum comentário adicionado</p>
          ) : (
            <div className="space-y-3 pt-4 border-t">
              {comentarios.map((comentario) => (
                <div key={comentario.id} className="p-4 rounded-lg bg-secondary/30">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{comentario.profiles?.nome || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comentario.created_at).toLocaleDateString('pt-PT')} às{' '}
                        {new Date(comentario.created_at).toLocaleTimeString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm">{comentario.comentario}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AtividadeDetalhes;
