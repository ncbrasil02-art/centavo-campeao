import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Gavel, Mail, Lock, User, Phone, MapPin, Hash } from "lucide-react";

export const Route = createFileRoute("/auth")({
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

function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
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
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Cadastro realizado com sucesso!");
        // If session is created (auto-confirm is on), redirect to home
        if (data.session) {
          navigate({ to: "/" });
        } else {
          // Tell user to check email if auto-confirm is not instant or they need to verify
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
      navigate({ to: "/" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] -z-10"></div>
      
      <Link to="/" className="flex items-center gap-2 mb-8 group">
        <Gavel className="h-10 w-10 text-primary transition-transform group-hover:rotate-12" />
        <span className="text-3xl font-bold tracking-tighter text-white">
          LANCE<span className="text-primary">CERTO</span>
        </span>
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
                  <Label htmlFor="password">Senha</Label>
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
            <Button variant="outline" className="border-white/10 hover:bg-white/5">Google</Button>
            <Button variant="outline" className="border-white/10 hover:bg-white/5">Facebook</Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
