import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
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
import { Gavel, Mail, Lock, User, Phone, MapPin, Hash, Camera, Info } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      register: (search.register as string) || "false",
      redirect: (search.redirect as string) || "/",
      offer: (search.offer as string) || "",
      reset: (search.reset as string) || "false",
    };
  },
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
  const { site_name, logo_url, logo_height } = useSettings();
  
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  const [activeTab, setActiveTab] = useState(search.register === "true" ? "register" : "login");

  useEffect(() => {
    if (search.offer === "welcome_bids") {
      toast.info("Oferta Especial!", {
        description: "Complete seu cadastro agora e ganhe 50% de desconto no seu primeiro pacote de lances!",
        duration: 10000,
      });
    }
  }, [search.offer]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para fazer o upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${Math.random()}.${fileExt}`;

      // We need to be logged in to upload to 'avatars' bucket based on our policies
      // But we are on the register page. 
      // Alternative: store it temporarily or use a public bucket if possible.
      // Since public buckets are blocked, let's just stick to predefined avatars for now during registration
      // Or we can tell the user they can change their photo after logging in.
      
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

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    try {
      if (provider === "google") {
        // Try managed first, fall back to direct
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] -z-10"></div>
      
      <Link to="/" className="flex items-center gap-2 mb-8 group">
        {logo_url ? (
          <img src={logo_url} alt={site_name} style={{ height: `${logo_height || 40}px` }} className="object-contain" />
        ) : (
          <>
            <Gavel className="h-10 w-10 text-primary transition-transform group-hover:rotate-12" />
            <span className="text-3xl font-bold tracking-tighter text-white">
              {site_name.split(' ')[0]}<span className="text-primary">{site_name.split(' ').slice(1).join('')}</span>
            </span>
          </>
        )}
      </Link>

      <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Acesse sua conta</CardTitle>
          <CardDescription className="text-center text-white/60">Participe dos melhores leilões do Brasil</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
            </TabsList>
            
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
                <div className="flex flex-col items-center gap-4 mb-6">
                  <Label>Escolha seu Avatar</Label>
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
                    <Label htmlFor="avatar-upload" className="cursor-pointer text-xs text-primary flex items-center gap-1 hover:underline">
                      <Camera className="h-3 w-3" /> Ou envie sua foto
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
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={() => handleSocialLogin("google")}>
              Google
            </Button>
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={() => handleSocialLogin("facebook")}>
              Facebook
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}