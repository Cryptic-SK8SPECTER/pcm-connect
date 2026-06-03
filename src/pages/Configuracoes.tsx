import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, Users, Shield, Settings, Bell, Briefcase, Loader2, Trash2, Edit2, Plus, DollarSign } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/hooks/useTranslations";
import { useLocale } from "@/context/LocaleProvider";
interface Role {
  id: string;
  nome: string;
  descricao: string;
  permissoes: string[];
}
interface User {
  id: string;
  nome: string;
  email: string;
  username?: string;
  ativo: boolean;
  role_id?: string;
}
interface SystemPreferences {
  idioma: string;
  moeda: string;
  notificacoes_email: boolean;
  notificacoes_sistema: boolean;
  notificacoes_sms: boolean;
  two_factor_enabled: boolean;
}
interface ExchangeRate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate_to_mzn: number;
  updated_by?: string;
}
export default function Configuracoes() {
  const {
    toast
  } = useToast();
  const t = useTranslations();
  const {
    setLocale
  } = useLocale();
  const [loading, setLoading] = useState(false);

  // States for collapsibles
  const [openSections, setOpenSections] = useState<{
    [key: string]: boolean;
  }>({
    users: false,
    security: false,
    preferences: false,
    notifications: false,
    roles: false,
    exchange: false
  });

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [preferences, setPreferences] = useState<SystemPreferences>({
    idioma: 'pt',
    moeda: 'MZN',
    notificacoes_email: true,
    notificacoes_sistema: true,
    notificacoes_sms: false,
    two_factor_enabled: false
  });
  const [isPrivileged, setIsPrivileged] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingExchange, setEditingExchange] = useState<ExchangeRate | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({
    nome: "",
    email: "",
    username: "",
    password: "",
    role_id: ""
  });
  const [roleForm, setRoleForm] = useState({
    nome: "",
    descricao: "",
    permissoes: ""
  });
  const [exchangeForm, setExchangeForm] = useState({
    currency_code: "",
    currency_name: "",
    rate_to_mzn: ""
  });
  useEffect(() => {
    fetchData();
  }, []);
  const fetchPrivilege = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const {
          data: profile
        } = await supabase.from("profiles").select("role_id, roles(nome)").eq("id", user.id).single();
        const roleName = (profile as any)?.roles?.nome;
        setUserRole(roleName);
        const isAdminOrGestor = roleName === "Administrador" || roleName === "Gestor";
        setIsPrivileged(isAdminOrGestor);
        return {
          isPrivileged: isAdminOrGestor,
          userId: user.id
        };
      }
      return {
        isPrivileged: false,
        userId: null
      };
    } catch (error) {
      console.error("Error fetching privilege:", error);
      return {
        isPrivileged: false,
        userId: null
      };
    }
  };
  const fetchData = async () => {
    const privilege = await fetchPrivilege();
    await Promise.all([fetchUsers(privilege.isPrivileged, privilege.userId), fetchRoles(), fetchPreferences(), fetchExchangeRates()]);
  };
  const fetchUsers = async (privileged?: boolean, userId?: string | null) => {
    try {
      const isUserPrivileged = privileged !== undefined ? privileged : isPrivileged;
      const currentUser = userId !== undefined ? userId : currentUserId;
      if (isUserPrivileged) {
        const {
          data,
          error
        } = await supabase.from("profiles").select("id, nome, email, username, ativo, role_id");
        if (error) throw error;
        setUsers(data || []);
      } else if (currentUser) {
        const {
          data,
          error
        } = await supabase.from("profiles").select("id, nome, email, username, ativo, role_id").eq("id", currentUser);
        if (error) throw error;
        setUsers(data || []);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: t.common.error,
        description: error.message || t.settings.errorLoadingUsers,
        variant: "destructive"
      });
    }
  };
  const fetchRoles = async () => {
    const {
      data,
      error
    } = await supabase.from("roles").select("*");
    if (error) {
      toast({
        title: t.common.error,
        description: t.settings.errorLoadingRoles,
        variant: "destructive"
      });
    } else {
      setRoles((data || []).map((r: any) => ({
        ...r,
        permissoes: Array.isArray(r.permissoes) ? r.permissoes : []
      })));
    }
  };
  const fetchPreferences = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;
    const {
      data,
      error
    } = await supabase.from("system_preferences").select("*").eq("user_id", user.id).maybeSingle();
    if (error && error.code !== 'PGRST116') {
      toast({
        title: t.common.error,
        description: t.settings.errorLoadingPreferences,
        variant: "destructive"
      });
    } else if (data) {
      setPreferences({
        idioma: data.idioma,
        moeda: data.moeda,
        notificacoes_email: data.notificacoes_email,
        notificacoes_sistema: data.notificacoes_sistema,
        notificacoes_sms: data.notificacoes_sms,
        two_factor_enabled: data.two_factor_enabled
      });
      localStorage.setItem('app_locale', data.idioma);
      document.documentElement.lang = data.idioma;
    }
  };
  const handleSaveUser = async () => {
    setLoading(true);
    try {
      if (editingUser) {
        // Update existing user
        const {
          error
        } = await supabase.from("profiles").update({
          nome: userForm.nome,
          email: userForm.email,
          username: userForm.username,
          role_id: userForm.role_id || null
        }).eq("id", editingUser.id);
        if (error) throw error;
        toast({
          title: t.common.success,
          description: t.settings.userUpdated
        });
      } else {
        // Create new user requires auth.signUp
        const {
          data,
          error
        } = await supabase.auth.signUp({
          email: userForm.email,
          password: userForm.password,
          options: {
            data: {
              nome: userForm.nome,
              username: userForm.username
            }
          }
        });
        if (error) throw error;

        // Update role if specified
        if (data.user && userForm.role_id) {
          await supabase.from("profiles").update({
            role_id: userForm.role_id
          }).eq("id", data.user.id);
        }
        toast({
          title: t.common.success,
          description: t.settings.userCreated
        });
      }
      setUserDialogOpen(false);
      setUserForm({
        nome: "",
        email: "",
        username: "",
        password: "",
        role_id: ""
      });
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({
        title: t.common.error,
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t.settings.confirmDeleteUser)) return;
    setLoading(true);
    try {
      const {
        error
      } = await supabase.from("profiles").update({
        ativo: false
      }).eq("id", userId);
      if (error) throw error;
      toast({
        title: t.common.success,
        description: t.settings.userDeactivated
      });
      fetchUsers();
    } catch (err: any) {
      toast({
        title: t.common.error,
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSaveRole = async () => {
    setLoading(true);
    try {
      const permissoes = roleForm.permissoes.split(",").map(p => p.trim()).filter(Boolean);
      if (editingRole) {
        const {
          error
        } = await supabase.from("roles").update({
          nome: roleForm.nome,
          descricao: roleForm.descricao,
          permissoes: JSON.stringify(permissoes)
        }).eq("id", editingRole.id);
        if (error) throw error;
        toast({
          title: t.common.success,
          description: t.settings.roleUpdated
        });
      } else {
        const {
          error
        } = await supabase.from("roles").insert({
          nome: roleForm.nome,
          descricao: roleForm.descricao,
          permissoes: JSON.stringify(permissoes)
        });
        if (error) throw error;
        toast({
          title: t.common.success,
          description: t.settings.roleCreated
        });
      }
      setRoleDialogOpen(false);
      setRoleForm({
        nome: "",
        descricao: "",
        permissoes: ""
      });
      setEditingRole(null);
      fetchRoles();
    } catch (err: any) {
      toast({
        title: t.common.error,
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteRole = async (roleId: string) => {
    if (!confirm(t.settings.confirmDeleteRole)) return;
    setLoading(true);
    try {
      const {
        error
      } = await supabase.from("roles").delete().eq("id", roleId);
      if (error) throw error;
      toast({
        title: t.common.success,
        description: t.settings.roleDeleted
      });
      fetchRoles();
    } catch (err: any) {
      toast({
        title: t.common.error,
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t.common.error);
      const {
        error
      } = await supabase.from("system_preferences").upsert({
        user_id: user.id,
        ...preferences
      }, {
        onConflict: 'user_id'
      });
      if (error) throw error;

      // Update locale context immediately for instant reflection
      setLocale(preferences.idioma as "pt" | "en" | "es");
      localStorage.setItem('app_locale', preferences.idioma);
      document.documentElement.lang = preferences.idioma;
      toast({
        title: t.common.success,
        description: t.settings.preferencesUpdated
      });
    } catch (err: any) {
      toast({
        title: t.common.error,
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  const getRoleName = (roleId?: string) => {
    return roles.find(r => r.id === roleId)?.nome || t.settings.noRole;
  };
  const fetchExchangeRates = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("exchange_rates").select("*").eq("ativo", true).order("currency_code");
      if (error) throw error;
      setExchangeRates(data || []);
    } catch (error: any) {
      console.error("Error fetching exchange rates:", error);
      toast({
        title: t.common.error,
        description: t.settings.errorLoadingExchange,
        variant: "destructive"
      });
    }
  };
  const handleSaveExchangeRate = async () => {
    setLoading(true);
    try {
      const rate = parseFloat(exchangeForm.rate_to_mzn);
      if (isNaN(rate) || rate <= 0) {
        throw new Error(t.settings.invalidRate);
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (editingExchange) {
        const {
          error
        } = await supabase.from("exchange_rates").update({
          currency_name: exchangeForm.currency_name,
          rate_to_mzn: rate,
          updated_by: user?.id
        }).eq("id", editingExchange.id);
        if (error) throw error;
        toast({
          title: t.common.success,
          description: t.settings.exchangeRateUpdated
        });
      } else {
        const {
          error
        } = await supabase.from("exchange_rates").insert({
          currency_code: exchangeForm.currency_code.toUpperCase(),
          currency_name: exchangeForm.currency_name,
          rate_to_mzn: rate,
          updated_by: user?.id
        });
        if (error) throw error;
        toast({
          title: t.common.success,
          description: t.settings.exchangeRateCreated
        });
      }
      setExchangeDialogOpen(false);
      setExchangeForm({
        currency_code: "",
        currency_name: "",
        rate_to_mzn: ""
      });
      setEditingExchange(null);
      fetchExchangeRates();
    } catch (err: any) {
      toast({
        title: t.common.error,
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteExchangeRate = async (id: string) => {
    if (!confirm(t.settings.confirmDeactivateExchange)) return;
    setLoading(true);
    try {
      const {
        error
      } = await supabase.from("exchange_rates").update({ ativo: false }).eq("id", id);
      if (error) throw error;
      toast({
        title: t.common.success,
        description: t.settings.exchangeRateDeactivated
      });
      fetchExchangeRates();
    } catch (err: any) {
      toast({
        title: t.common.error,
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchAutomaticExchangeRate = async () => {
    if (!exchangeForm.currency_code || exchangeForm.currency_code.length !== 3) {
      toast({
        title: t.settings.attention,
        description: t.settings.enterCurrencyCode,
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      // Usando API gratuita exchangerate-api.com
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${exchangeForm.currency_code.toUpperCase()}`);
      if (!response.ok) {
        throw new Error(t.settings.currencyNotFound);
      }
      const data = await response.json();

      // Verificar se MZN está disponível nas taxas
      if (!data.rates.MZN) {
        throw new Error(t.settings.mznRateNotAvailable);
      }

      // A API retorna quanto vale 1 unidade da moeda em MZN
      const rateToMZN = data.rates.MZN;
      setExchangeForm({
        ...exchangeForm,
        rate_to_mzn: rateToMZN.toFixed(2)
      });
      toast({
        title: t.common.success,
        description: `${t.settings.rateUpdatedTo}: 1 ${exchangeForm.currency_code.toUpperCase()} = ${rateToMZN.toFixed(2)} MZN`
      });
    } catch (err: any) {
      toast({
        title: t.common.error,
        description: err.message || t.settings.errorFetchingRate,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{t.settings.title}</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">{t.settings.subtitle}</p>
      </div>

      <div className="space-y-3 sm:space-y-4">

        {/* Segurança - apenas para privilegiados */}
        {isPrivileged && (
          <Card>
            <Collapsible open={openSections.security} onOpenChange={() => toggleSection('security')}>
            <CollapsibleTrigger asChild>
              
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t.settings.twoFactor}</Label>
                    <p className="text-sm text-muted-foreground">{t.settings.twoFactorDescription}</p>
                  </div>
                  <Switch checked={preferences.two_factor_enabled} onCheckedChange={val => setPreferences({
                  ...preferences,
                  two_factor_enabled: val
                })} />
                </div>
                <Button onClick={handleSavePreferences} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.settings.saveSettings}
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
        )}

        {/* Preferências do Sistema - todos podem ver */}
        <Card>
          <Collapsible open={openSections.preferences} onOpenChange={() => toggleSection('preferences')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t.settings.systemPreferences}</CardTitle>
                      <CardDescription>
                        {userRole === 'Colaborador' 
                          ? t.settings.languagePreferences 
                          : t.settings.languageCurrencyPreferences}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.preferences ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                      <div>
                        <Label>{t.settings.language}</Label>
                        <Select value={preferences.idioma} onValueChange={val => setPreferences({
                  ...preferences,
                  idioma: val
                })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pt">{t.settings.portuguese}</SelectItem>
                            <SelectItem value="en">{t.settings.english}</SelectItem>
                            <SelectItem value="es">{t.settings.spanish}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {userRole !== 'Colaborador' && (
                        <div>
                          <Label>{t.settings.currency}</Label>
                          <Select value={preferences.moeda} onValueChange={val => setPreferences({
                            ...preferences,
                            moeda: val
                          })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MZN">Metical (MZN)</SelectItem>
                              <SelectItem value="USD">Dólar (USD)</SelectItem>
                              <SelectItem value="ZAR">Rand (ZAR)</SelectItem>
                              <SelectItem value="EUR">Euro (EUR)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                <Button onClick={handleSavePreferences} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.common.save}
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Notificações - todos podem ver */}
        <Card>
          <Collapsible open={openSections.notifications} onOpenChange={() => toggleSection('notifications')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors rounded-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t.settings.notifications}</CardTitle>
                      <CardDescription>{t.settings.notificationsDescription}</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.notifications ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t.settings.emailNotifications}</Label>
                  <Switch checked={preferences.notificacoes_email} onCheckedChange={val => setPreferences({
                  ...preferences,
                  notificacoes_email: val
                })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t.settings.systemNotifications}</Label>
                  <Switch checked={preferences.notificacoes_sistema} onCheckedChange={val => setPreferences({
                  ...preferences,
                  notificacoes_sistema: val
                })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>{t.settings.smsNotifications}</Label>
                  <Switch checked={preferences.notificacoes_sms} onCheckedChange={val => setPreferences({
                  ...preferences,
                  notificacoes_sms: val
                })} />
                </div>
                <Button onClick={handleSavePreferences} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.settings.saveSettings}
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Taxas de Câmbio - apenas para privilegiados */}
        {isPrivileged && (
          <Card>
            <Collapsible open={openSections.exchange} onOpenChange={() => toggleSection('exchange')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t.settings.exchangeRates}</CardTitle>
                      <CardDescription>{t.settings.exchangeRatesDescription}</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.exchange ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <Dialog open={exchangeDialogOpen} onOpenChange={setExchangeDialogOpen}>
                  <DialogTrigger asChild>
                    
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingExchange ? t.settings.editRate : t.settings.newRate}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>{t.settings.currencyCode}</Label>
                        <Input value={exchangeForm.currency_code} onChange={e => setExchangeForm({
                        ...exchangeForm,
                        currency_code: e.target.value
                      })} placeholder={t.settings.currencyCodeExample} maxLength={3} disabled={!!editingExchange} />
                      </div>
                      <div>
                        <Label>{t.settings.currencyName}</Label>
                        <Input value={exchangeForm.currency_name} onChange={e => setExchangeForm({
                        ...exchangeForm,
                        currency_name: e.target.value
                      })} placeholder={t.settings.currencyNameExample} />
                      </div>
                      <div>
                        <Label>{t.settings.rateToMzn}</Label>
                        <div className="flex gap-2">
                          <Input type="number" step="0.01" value={exchangeForm.rate_to_mzn} onChange={e => setExchangeForm({
                          ...exchangeForm,
                          rate_to_mzn: e.target.value
                        })} placeholder={t.settings.rateExample} />
                          <Button type="button" variant="outline" onClick={fetchAutomaticExchangeRate} disabled={loading || !exchangeForm.currency_code || exchangeForm.currency_code.length !== 3} className="whitespace-nowrap">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.settings.fetchRate}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.settings.howMuchInMzn} {exchangeForm.currency_code || t.settings.currencyLabel.toLowerCase()} {t.settings.inMeticais}
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSaveExchangeRate} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t.common.save}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.settings.code}</TableHead>
                      <TableHead>{t.settings.currencyLabel}</TableHead>
                      <TableHead>{t.settings.rateLabel}</TableHead>
                      <TableHead>{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangeRates.map(rate => <TableRow key={rate.id}>
                        <TableCell className="font-medium">{rate.currency_code}</TableCell>
                        <TableCell>{rate.currency_name}</TableCell>
                        <TableCell>{rate.rate_to_mzn.toFixed(2)} MZN</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => {
                          setEditingExchange(rate);
                          setExchangeForm({
                            currency_code: rate.currency_code,
                            currency_name: rate.currency_name,
                            rate_to_mzn: rate.rate_to_mzn.toString()
                          });
                          setExchangeDialogOpen(true);
                        }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteExchangeRate(rate.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
        )}

        {/* Perfis de Acesso - apenas para privilegiados */}
        {isPrivileged && (
          <Card>
            <Collapsible open={openSections.roles} onOpenChange={() => toggleSection('roles')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t.settings.roles}</CardTitle>
                      <CardDescription>{t.settings.rolesDescription}</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.roles ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                    setEditingRole(null);
                    setRoleForm({
                      nome: "",
                      descricao: "",
                      permissoes: ""
                    });
                  }}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t.settings.newRole}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingRole ? t.settings.editRole : t.settings.newRole}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>{t.settings.userName}</Label>
                        <Input value={roleForm.nome} onChange={e => setRoleForm({
                        ...roleForm,
                        nome: e.target.value
                      })} />
                      </div>
                      <div>
                        <Label>{t.settings.description}</Label>
                        <Textarea value={roleForm.descricao} onChange={e => setRoleForm({
                        ...roleForm,
                        descricao: e.target.value
                      })} />
                      </div>
                      <div>
                        <Label>{t.settings.permissionsSeparated}</Label>
                        <Input value={roleForm.permissoes} onChange={e => setRoleForm({
                        ...roleForm,
                        permissoes: e.target.value
                      })} placeholder={t.settings.permissionsPlaceholder} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSaveRole} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t.common.save}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.settings.userName}</TableHead>
                      <TableHead>{t.settings.description}</TableHead>
                      <TableHead>{t.settings.permissions}</TableHead>
                      <TableHead>{t.common.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map(role => <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.nome}</TableCell>
                        <TableCell>{role.descricao}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {role.permissoes.map((perm, idx) => <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                                {perm}
                              </span>)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => {
                          setEditingRole(role);
                          setRoleForm({
                            nome: role.nome,
                            descricao: role.descricao || "",
                            permissoes: role.permissoes.join(", ")
                          });
                          setRoleDialogOpen(true);
                        }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteRole(role.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
        )}
      </div>
    </div>;
}