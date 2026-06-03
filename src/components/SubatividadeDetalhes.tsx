import { useState, useEffect } from "react";
import { Upload, MessageSquare, Edit, Trash2, FileText, Download, CheckCircle2, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubatividadeDetalhesProps {
  subatividade: any;
  atividadeResponsavelId: string | null;
  onUpdate: () => void;
}

export const SubatividadeDetalhes = ({ subatividade, atividadeResponsavelId, onUpdate }: SubatividadeDetalhesProps) => {
  const { toast } = useToast();
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [anexos, setAnexos] = useState<any[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [confirmacao, setConfirmacao] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [editForm, setEditForm] = useState({
    nome: subatividade.nome,
    descricao: subatividade.descricao || "",
    data_prevista: subatividade.data_prevista || "",
    progresso_manual: subatividade.progresso_manual ?? 0,
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchComentariosEAnexos();
      fetchConfirmacao();
    }
  }, [subatividade.id, currentUserId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchConfirmacao = async () => {
    try {
      const { data } = await (supabase as any)
        .from('subatividade_confirmacoes')
        .select('*')
        .eq('subatividade_id', subatividade.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setConfirmacao(data);
    } catch (error: any) {
      console.error('Erro ao carregar confirmação:', error);
    }
  };

  const fetchComentariosEAnexos = async () => {
    try {
      const { data: comentariosData } = await (supabase as any)
        .from('subatividade_comentarios')
        .select('*')
        .eq('subatividade_id', subatividade.id)
        .order('created_at', { ascending: false });

      setComentarios(comentariosData || []);

      const { data: anexosData } = await (supabase as any)
        .from('subatividade_anexos')
        .select('*')
        .eq('subatividade_id', subatividade.id)
        .order('created_at', { ascending: false });

      setAnexos(anexosData || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleAdicionarComentario = async () => {
    if (!novoComentario.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await (supabase as any)
        .from('subatividade_comentarios')
        .insert([{
          subatividade_id: subatividade.id,
          comentario: novoComentario,
          created_by: user.id
        }]);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Comentário adicionado!" });
      setNovoComentario("");
      fetchComentariosEAnexos();
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
          .from('subatividade-anexos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('subatividade-anexos')
          .getPublicUrl(fileName);

        const { error: insertError } = await (supabase as any)
          .from('subatividade_anexos')
          .insert([{
            subatividade_id: subatividade.id,
            nome_arquivo: file.name,
            url: publicUrl,
            tipo_arquivo: file.type,
            tamanho: file.size,
            created_by: user.id
          }]);

        if (insertError) throw insertError;
      }

      toast({ title: "Sucesso", description: "Anexos enviados!" });
      fetchComentariosEAnexos();
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
      
      await supabase.storage
        .from('subatividade-anexos')
        .remove([fileName]);

      const { error } = await (supabase as any)
        .from('subatividade_anexos')
        .delete()
        .eq('id', anexoId);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Anexo removido!" });
      fetchComentariosEAnexos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível remover o anexo.",
        variant: "destructive",
      });
    }
  };

  const handleEditSubatividade = async () => {
    try {
      const { error } = await (supabase as any)
        .from('subatividades')
        .update({
          nome: editForm.nome,
          descricao: editForm.descricao,
        })
        .eq('id', subatividade.id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Sub-rubrica atualizada!" });
      setIsEditDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível atualizar.",
        variant: "destructive",
      });
    }
  };

  const handleSubmeterSubatividade = async () => {
    try {
      if (!currentUserId) throw new Error("Usuário não autenticado");

      const { error } = await (supabase as any)
        .from('subatividade_confirmacoes')
        .insert([{
          subatividade_id: subatividade.id,
          user_id: currentUserId,
          status: 'pendente'
        }]);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Sub-rubrica submetida para aprovação!" });
      fetchConfirmacao();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível submeter.",
        variant: "destructive",
      });
    }
  };

  const handleAprovarSubatividade = async () => {
    try {
      if (!currentUserId || !confirmacao) return;

      const { error: updateConfirmacaoError } = await (supabase as any)
        .from('subatividade_confirmacoes')
        .update({
          status: 'aprovado',
          aprovado_por: currentUserId,
          aprovado_em: new Date().toISOString()
        })
        .eq('id', confirmacao.id);

      if (updateConfirmacaoError) throw updateConfirmacaoError;

      const { error: updateSubatividadeError } = await (supabase as any)
        .from('subatividades')
        .update({
          concluida: true,
          data_conclusao: new Date().toISOString()
        })
        .eq('id', subatividade.id);

      if (updateSubatividadeError) throw updateSubatividadeError;

      toast({ title: "Sucesso", description: "Sub-rubrica aprovada!" });
      fetchConfirmacao();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível aprovar.",
        variant: "destructive",
      });
    }
  };

  const handleRejeitarSubatividade = async () => {
    try {
      if (!currentUserId || !confirmacao || !motivoRejeicao.trim()) {
        toast({
          title: "Erro",
          description: "Motivo de rejeição é obrigatório.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await (supabase as any)
        .from('subatividade_confirmacoes')
        .update({
          status: 'rejeitado',
          aprovado_por: currentUserId,
          aprovado_em: new Date().toISOString(),
          motivo_rejeicao: motivoRejeicao
        })
        .eq('id', confirmacao.id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Sub-rubrica rejeitada!" });
      setIsRejectDialogOpen(false);
      setMotivoRejeicao("");
      fetchConfirmacao();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível rejeitar.",
        variant: "destructive",
      });
    }
  };

  const handleConcluirSubatividade = async () => {
    try {
      const { error } = await (supabase as any)
        .from('subatividades')
        .update({
          concluida: true,
          data_conclusao: new Date().toISOString()
        })
        .eq('id', subatividade.id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Sub-rubrica concluída!" });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível concluir.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4 pl-8 border-l-2 border-border ml-4">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{subatividade.nome}</h3>
          {confirmacao && (
            <>
              {confirmacao.status === 'pendente' && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Aguardando aprovação
                </Badge>
              )}
              {confirmacao.status === 'aprovado' && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Aprovado
                </Badge>
              )}
              {confirmacao.status === 'rejeitado' && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  Rejeitado
                </Badge>
              )}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Sub-rubrica</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={editForm.nome}
                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={editForm.descricao}
                    onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                  />
                </div>
                <Button onClick={handleEditSubatividade}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Botões baseados no estado */}
          {!subatividade.concluida && (
            <>
              {/* Responsável da subatividade pode submeter */}
              {currentUserId === subatividade.responsavel_id && !confirmacao && (
                <Button onClick={handleSubmeterSubatividade} variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Submeter
                </Button>
              )}

              {/* Responsável da subatividade pode resubmeter se foi rejeitado */}
              {currentUserId === subatividade.responsavel_id && confirmacao?.status === 'rejeitado' && (
                <Button onClick={handleSubmeterSubatividade} variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Resubmeter
                </Button>
              )}

              {/* Responsável da atividade principal pode aprovar/rejeitar */}
              {currentUserId === atividadeResponsavelId && confirmacao?.status === 'pendente' && (
                <>
                  <Button onClick={handleAprovarSubatividade} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                  <Button 
                    onClick={() => setIsRejectDialogOpen(true)} 
                    size="sm" 
                    variant="outline" 
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Motivo de rejeição */}
      {confirmacao?.status === 'rejeitado' && confirmacao.motivo_rejeicao && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-red-900">Motivo da rejeição:</p>
            <p className="text-sm text-red-700 mt-1">{confirmacao.motivo_rejeicao}</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de rejeição */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Sub-rubrica</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, indique o motivo da rejeição:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={motivoRejeicao}
            onChange={(e) => setMotivoRejeicao(e.target.value)}
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMotivoRejeicao("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRejeitarSubatividade}
              className="bg-red-600 hover:bg-red-700"
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {subatividade.descricao && (
        <p className="text-sm text-muted-foreground">{subatividade.descricao}</p>
      )}

      {/* Anexos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Anexos ({anexos.length})</CardTitle>
            <label htmlFor={`file-upload-sub-${subatividade.id}`}>
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Adicionar
                </span>
              </Button>
            </label>
            <input
              id={`file-upload-sub-${subatividade.id}`}
              type="file"
              className="hidden"
              onChange={handleUploadAnexo}
            />
          </div>
        </CardHeader>
        <CardContent>
          {anexos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum anexo</p>
          ) : (
            <div className="space-y-2">
              {anexos.map((anexo) => (
                <div key={anexo.id} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{anexo.nome_arquivo}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(anexo.tamanho)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(anexo.url, '_blank')}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAnexo(anexo.id, anexo.url)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
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
          <CardTitle className="text-sm">Comentários ({comentarios.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Textarea
              placeholder="Adicionar comentário..."
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <Button onClick={handleAdicionarComentario} size="sm" disabled={!novoComentario.trim()}>
              <MessageSquare className="h-3 w-3 mr-2" />
              Adicionar
            </Button>
          </div>
          {comentarios.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              {comentarios.map((comentario) => (
                <div key={comentario.id} className="p-2 rounded bg-secondary/30">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-xs font-medium">{comentario.profiles?.nome || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comentario.created_at).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                  <p className="text-xs">{comentario.comentario}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
