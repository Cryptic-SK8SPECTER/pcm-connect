import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslations } from "@/hooks/useTranslations";
import { PageHeader } from "@/components/PageHeader";

interface User {
  id: string;
  nome: string;
  email: string;
  username?: string;
  ativo: boolean;
  role_id?: string;
  created_at: string;
}

interface Role {
  id: string;
  nome: string;
  descricao?: string;
}

export default function Usuarios() {
  const t = useTranslations();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<{ id: string; status: boolean } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    role_id: "",
    ativo: true,
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(t.settings.errorLoadingUsers);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("nome");

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error(t.settings.errorLoadingRoles);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nome: user.nome,
        email: user.email,
        username: user.username || "",
        password: "",
        confirmPassword: "",
        role_id: user.role_id || "",
        ativo: user.ativo,
      });
    } else {
      setEditingUser(null);
      setFormData({
        nome: "",
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
        role_id: "",
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from("profiles")
          .update({
            nome: formData.nome,
            email: formData.email,
            username: formData.username,
            role_id: formData.role_id || null,
            ativo: formData.ativo,
          })
          .eq("id", editingUser.id);

        if (error) throw error;
        toast.success(t.settings.userUpdated);
        // Optimistic UI update to reflect changes immediately
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  nome: formData.nome,
                  email: formData.email,
                  username: formData.username || undefined,
                  role_id: formData.role_id || undefined,
                  ativo: formData.ativo,
                }
              : u
          )
        );
      } else {
        // Create new user via Edge Function (doesn't auto-login)
        if (!formData.password) {
          toast.error("Password é obrigatória para novos utilizadores");
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          toast.error("As senhas não coincidem");
          return;
        }

        // Call edge function to create user using Admin API
        const { data, error } = await supabase.functions.invoke('criar-usuario', {
          body: {
            email: formData.email,
            password: formData.password,
            nome: formData.nome,
            username: formData.username,
            role_id: formData.role_id,
            ativo: formData.ativo,
          }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success(t.settings.userCreated);
      }

      setDialogOpen(false);
      await fetchUsers();
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast.error(error.message);
    }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    setUserToToggle({ id: userId, status: currentStatus });
    setConfirmDialogOpen(true);
  };

  const confirmToggleUserStatus = async () => {
    if (!userToToggle) return;

    const { id: userId, status: currentStatus } = userToToggle;
    const action = currentStatus ? "desativar" : "ativar";

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ativo: !currentStatus })
        .eq("id", userId);

      if (error) throw error;
      toast.success(`Utilizador ${currentStatus ? "desativado" : "ativado"} com sucesso`);
      fetchUsers();
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      toast.error(`Erro ao ${action} utilizador`);
    } finally {
      setConfirmDialogOpen(false);
      setUserToToggle(null);
    }
  };

  // Paginação
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={t.settings.users}
        subtitle={t.settings.usersDescription}
      />

      <Card>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold">{t.settings.users}</h3>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} size="sm" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.settings.newUser}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md z-50 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? t.settings.editUser : t.settings.newUser}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser ? "Editar informações do utilizador" : "Criar novo utilizador no sistema"}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome">{t.settings.userName}</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome completo"
                      readOnly={false}
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">{t.settings.userEmail}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      disabled={!!editingUser}
                      autoComplete="off"
                    />
                  </div>

                  <div>
                    <Label htmlFor="username">{t.settings.username}</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="username"
                      readOnly={false}
                      autoComplete="off"
                    />
                  </div>

                  {!editingUser && (
                    <>
                      <div>
                        <Label htmlFor="password">{t.settings.password}</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="role">{t.settings.userRole}</Label>
                    <Select
                      value={formData.role_id}
                      onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.settings.noRole} />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="ativo">{t.settings.userStatus}</Label>
                    <Switch
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      {t.common.cancel}
                    </Button>
                    <Button onClick={handleSaveUser}>
                      {t.common.save}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Mobile view - cards */}
          <div className="block md:hidden space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))
            ) : currentUsers.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{user.nome}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      user.ativo
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {user.ativo ? t.common.active : t.common.inactive}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {roles.find((r) => r.id === user.role_id)?.nome || t.settings.noRole}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleUserStatus(user.id, user.ativo)}
                    >
                      <UserX className={`h-4 w-4 ${!user.ativo ? "text-green-600" : ""}`} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view - table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.settings.userName}</TableHead>
                  <TableHead>{t.settings.userEmail}</TableHead>
                  <TableHead>{t.settings.username}</TableHead>
                  <TableHead>{t.settings.userRole}</TableHead>
                  <TableHead>{t.settings.userStatus}</TableHead>
                  <TableHead className="text-right">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.nome}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.username || "-"}</TableCell>
                    <TableCell>
                      {roles.find((r) => r.id === user.role_id)?.nome || t.settings.noRole}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          user.ativo
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {user.ativo ? t.common.active : t.common.inactive}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleUserStatus(user.id, user.ativo)}
                          title={user.ativo ? "Desativar utilizador" : "Ativar utilizador"}
                        >
                          <UserX className={`h-4 w-4 ${!user.ativo ? "text-green-600" : ""}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {userToToggle?.status ? "desativar" : "ativar"} este utilizador?
              {userToToggle?.status && " O utilizador não poderá mais aceder ao sistema."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToToggle(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggleUserStatus}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
