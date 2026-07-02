import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Gavel, Mail, Lock, User, Phone, MapPin, Hash, Camera, Info, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import { TENANT_ID } from "@/lib/tenant";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendSignupConfirmationEmail,
} from "@/lib/auth-emails.functions";

const authSearchSchema = z.object({
  register: z.union([z.string(), z.boolean()]).optional(),
  redirect: z.string().optional(),
  offer: z.string().optional(),
  reset: z.union([z.string(), z.boolean()]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => authSearchSchema.parse(search),
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      throw redirect({
        to: "/",
      });
    }
  },
  component: AuthPage,
});

const PREDEFINED_AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=George",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Buster",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Cookie",
];

function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(PREDEFINED_AVATARS[0]);
  const [uploading, setUploading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const { site_name, logo_url, logo_height } = useSettings();
  
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [activeTab, setActiveTab] = useState(search.reset === "true" || search.reset === true ? "reset" : search.register === "true" || search.register === true ? "register" : "login");

  useEffect(() => {
    console.log("AuthPage loaded with tab:", activeTab, "search:", search);
    if (search.offer === "welcome_bids") {
      toast.info("Oferta Especial!", {
        description: "Complete seu cadastro agora e ganhe 50% de desconto no seu primeiro pacote de lances!",
        duration: 10000,
      });
    }
  }, [search.offer, activeTab, search]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para fazer o upload.');
      }
      toast.error("Upload de foto disponível apenas após o login. Escolha um dos avatares abaixo por enquanto.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username,
            cpf,
            phone,
            gender,
            avatar_url: avatarUrl,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Cadastro realizado com sucesso!");
        if (data.session) {
          navigate({ to: "/" });
        } else {
          toast.info("Por favor, verifique seu e-mail para ativar a conta.");
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      toast.success("Bem-vindo de volta!");
      const redirectPath = search.redirect || "/";
      navigate({ to: redirectPath.startsWith('http') ? "/" : (redirectPath as any) });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      if (error) throw error;
      toast.success("E-mail de recuperação enviado!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso!");
      setActiveTab("login");
      navigate({ to: "/auth", search: { reset: undefined } as any });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    try {
      if (provider === "google") {
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin + "/",
        });
        if (result?.error) throw result.error;
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'facebook',
          options: {
            redirectTo: window.location.origin + "/",
          }
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const renderLogo = () => {
    const fallback = (
      <div className="flex items-center gap-2">
        <Gavel className="h-10 w-10 text-primary" />
        <span className="text-3xl font-bold tracking-tighter text-white">
          {site_name.split(' ')[0]}<span className="text-primary">{site_name.split(' ').slice(1).join('')}</span>
        </span>
      </div>
    );

    if (!logo_url) return fallback;

    return (
      <img 
        src={logo_url} 
        alt={site_name} 
        style={{ height: `${logo_height || 40}px` }} 
        className="object-contain" 
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] -z-10"></div>
      
      <Link to="/" className="flex items-center gap-2 mb-8 group">
        {renderLogo()}
      </Link>

      <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-xl relative">
        <div className="absolute -top-3 right-4 bg-primary/20 text-primary text-[8px] px-2 py-0.5 rounded-full border border-primary/30 uppercase font-black tracking-widest z-50">Versão 2.1 Atualizada</div>
        
        <CardHeader>
          <CardTitle className="text-2xl text-center">Acesse sua conta</CardTitle>
          <CardDescription className="text-center text-white/60">Participe dos melhores leilões do Brasil</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
              {search.reset === "true" && <TabsTrigger value="reset">Nova Senha</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="reset">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                    <Input 
                      id="new-password" 
                      type="password" 
                      placeholder="Sua nova senha" 
                      className="pl-10 bg-white/5 border-white/10 placeholder:text-primary/50" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      required 
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                  {loading ? "Atualizando..." : "Salvar nova senha"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                    <Input id="email" type="email" placeholder="seu@email.com" className="pl-10 bg-white/5 border-white/10 placeholder:text-primary/50" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Senha</Label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button type="button" className="text-xs text-primary hover:underline">Esqueci minha senha</button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-900 border-white/10 text-white">
                        <DialogHeader>
                          <DialogTitle>Recuperar Conta</DialogTitle>
                          <DialogDescription className="text-white/60">
                            Insira seu e-mail para receber um link de recuperação de senha.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleForgotPassword} className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="reset-email">E-mail</Label>
                            <Input id="reset-email" type="email" placeholder="seu@email.com" className="bg-white/5 border-white/10" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                          </div>
                          <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Enviando..." : "Enviar link de recuperação"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                    <Input id="password" type="password" placeholder="••••••••" className="pl-10 bg-white/5 border-white/10 placeholder:text-primary/50" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar na plataforma"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="flex flex-col items-center gap-4 mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <Label className="font-bold text-primary uppercase text-xs tracking-widest">Escolha seu Avatar</Label>
                  <div className="flex flex-wrap justify-center gap-3">
                    {PREDEFINED_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        className={`rounded-full p-1 transition-all ${avatarUrl === url ? "ring-2 ring-primary scale-110" : "opacity-60 hover:opacity-100"}`}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={url} />
                          <AvatarFallback><User /></AvatarFallback>
                        </Avatar>
                      </button>
                    ))}
                  </div>
                  <div className="text-center">
                    <Label htmlFor="avatar-upload" className="cursor-pointer text-[10px] text-primary flex items-center gap-1 hover:underline">
                      <Camera className="h-3 w-3" /> Ou envie sua foto (após o login)
                    </Label>
                    <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                      <Input id="reg-name" placeholder="João Silva" className="pl-10 bg-white/5 border-white/10 placeholder:text-primary/50" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-user">Nickname</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                      <Input id="reg-user" placeholder="joao123" className="pl-10 bg-white/5 border-white/10 placeholder:text-primary/50" value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reg-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                    <Input id="reg-email" type="email" placeholder="seu@email.com" className="pl-10 bg-white/5 border-white/10 placeholder:text-primary/50" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-cpf">CPF</Label>
                    <Input id="reg-cpf" placeholder="000.000.000-00" className="bg-white/5 border-white/10 placeholder:text-primary/50" value={cpf} onChange={e => setCpf(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Telefone</Label>
                    <Input id="reg-phone" placeholder="(00) 00000-0000" className="bg-white/5 border-white/10 placeholder:text-primary/50" value={phone} onChange={e => setPhone(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-gender">Gênero</Label>
                  <Select value={gender} onValueChange={setGender} required>
                    <SelectTrigger id="reg-gender" className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Selecione seu gênero" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-white/10 text-white">
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                      <SelectItem value="not_specified">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-pass">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                    <Input id="reg-pass" type="password" placeholder="••••••••" className="pl-10 bg-white/5 border-white/10 placeholder:text-primary/50" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </div>
                
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                  {loading ? "Cadastrando..." : "Criar conta grátis"}
                </Button>
                <p className="text-[10px] text-center text-white/40">Ao se cadastrar, você ganha 5 lances grátis para testar a plataforma.</p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t border-white/5 pt-6">
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#1a1a1a] px-2 text-white/40">Ou continue com</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white flex items-center gap-2" onClick={() => handleSocialLogin("google")}>
              <LogIn className="h-4 w-4" /> Google
            </Button>
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white flex items-center gap-2" onClick={() => handleSocialLogin("facebook")}>
              <LogIn className="h-4 w-4" /> Facebook
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}