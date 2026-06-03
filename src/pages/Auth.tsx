import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/pcm-connect-logo.png";
import teamBg from "@/assets/team-collaboration-bg.jpg";
import { useTranslations } from "@/hooks/useTranslations";

const schema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }).max(255),
  password: z.string().min(6, { message: "Mínimo 6 caracteres" }).max(128)
});

export default function Auth() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  useEffect(() => {
    // Only redirect after successful auth events; keep login visible even if a session exists
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) {
        // Defer profile fetch to avoid blocking auth callback
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role_id, roles(nome)')
            .eq('id', session.user.id)
            .single();
          
          const roleName = (profile as any)?.roles?.nome;
          
          // Redirect colaboradores to /projetos, others to /dashboard
          if (roleName === 'Colaborador') {
            navigate("/projetos");
          } else {
            navigate("/dashboard");
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const translateAuthError = (errorMessage: string): string => {
    const errorTranslations: Record<string, string> = {
      "Invalid login credentials": "Credenciais de login inválidas",
      "Email not confirmed": "Email não confirmado. Verifique sua caixa de entrada.",
      "Invalid email or password": "Email ou senha inválidos",
      "User not found": "Usuário não encontrado",
      "Too many requests": "Muitas tentativas. Aguarde alguns minutos.",
      "Network request failed": "Erro de conexão. Verifique sua internet.",
      "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres",
      "Unable to validate email address: invalid format": "Formato de email inválido",
    };
    
    for (const [key, value] of Object.entries(errorTranslations)) {
      if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    return "Erro ao fazer login. Tente novamente.";
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = schema.safeParse({ email, password });
      if (!parsed.success) {
        toast({ title: t.common.error, description: parsed.error.issues[0].message, variant: "destructive" });
        return;
      }
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      const errorMessage = translateAuthError(err.message || "");
      toast({ title: t.common.error, description: errorMessage, variant: "destructive" });
    } finally { 
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const emailSchema = z.string().trim().email({ message: "Email inválido" }).max(255);
      const parsed = emailSchema.safeParse(email);
      if (!parsed.success) {
        toast({ title: t.common.error, description: parsed.error.issues[0].message, variant: "destructive" });
        return;
      }
      setLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      if (error) throw error;
      toast({ title: t.common.success, description: "Email de redefinição de senha enviado. Verifique sua caixa de entrada." });
      setIsPasswordReset(false);
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message || "Erro ao enviar email de redefinição", variant: "destructive" });
    } finally { 
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center font-poppins relative">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={teamBg} 
          alt="Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Centered Login Form */}
      <div className="relative z-10 w-full max-w-md px-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8 animate-fade-in">
            {/* Login Title */}
            <h1 className="text-2xl font-bold text-[#089DB4] text-center mb-8 mt-3 tracking-wide">
              {isPasswordReset ? "REDEFINIR SENHA" : "LOGIN"}
            </h1>

            {/* Form */}
            <form onSubmit={isPasswordReset ? resetPassword : signIn} className="space-y-6">
              {/* Email/Username Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Email
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full h-12 pl-4 pr-12 border-b-2 border-gray-300 bg-transparent focus:border-[#089DB4] transition-colors rounded-none border-t-0 border-x-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={loading}
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#089DB4]" />
                </div>
              </div>

              {/* Password Field */}
              {!isPasswordReset && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                    Senha
                  </label>
                  <div className="relative">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha"
                      className="w-full h-12 pl-4 pr-12 border-b-2 border-gray-300 bg-transparent focus:border-[#089DB4] transition-colors rounded-none border-t-0 border-x-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={loading}
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#089DB4]" />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-[#089DB4] hover:bg-[#077A8E] text-white font-semibold rounded-full text-lg shadow-lg transition-all duration-200 mt-8"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isPasswordReset ? "Enviando..." : t.auth.signingIn}
                  </>
                ) : (
                  isPasswordReset ? "Enviar Email" : "Login"
                )}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 flex justify-end space-x-4 text-sm">
              <button
                onClick={() => setIsPasswordReset(!isPasswordReset)}
                className="text-[#089DB4] hover:text-[#077A8E] font-medium transition-colors"
              >
                {isPasswordReset ? "Voltar" : "Esquece a senha?"}
              </button>
            </div>
          </div>

          {/* Copyright Footer */}
          <div className="text-center mt-6">
            <p className="text-sm font-medium text-white drop-shadow-lg">
              © 2025 PCM-Connect. Sistema de Gestão de Projetos.
            </p>
          </div>
      </div>
    </div>
  );
}
