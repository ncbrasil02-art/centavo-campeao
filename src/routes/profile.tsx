import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { User, Mail, Phone, MapPin, Hash, ShieldCheck, Wallet, LogOut, Camera } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFallbackAvatarUrl } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/profile" as any)({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({
        to: "/auth" as any,
      });
    }
  },
  component: ProfilePage,
});

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    
    if (data) {
      setProfile(data);
      setUsername(data.username || "");
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setGender(data.gender || "not_specified");
    }
    setLoading(false);
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          full_name: fullName,
          phone,
          gender,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);

      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" as any });
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <div className="animate-pulse text-primary font-black uppercase tracking-[0.3em]">Carregando seu universo...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-muted/30 p-8 rounded-[32px] border border-border">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-primary/20 shadow-2xl">
                  <AvatarImage src={profile?.avatar_url || getFallbackAvatarUrl(profile?.username)} />
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl font-black">
                    {profile?.username?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </button>
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground italic uppercase tracking-tighter">
                  {profile?.username || "Usuário"}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="font-bold text-primary">{profile?.bid_balance || 0} Lances Disponíveis</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-2xl" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="bg-white/5 border-white/10 rounded-[32px] overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl font-black uppercase italic tracking-tight">Editar <span className="text-primary">Perfil</span></CardTitle>
                  <CardDescription>Mantenha seus dados atualizados para garantir seus arremates.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="username">Nickname</Label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                          <Input id="username" className="pl-10 bg-white/5 border-white/10" value={username} onChange={e => setUsername(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Nome Completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                          <Input id="full_name" className="pl-10 bg-white/5 border-white/10" value={fullName} onChange={e => setFullName(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                          <Input id="phone" className="pl-10 bg-white/5 border-white/10" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gênero</Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger className="bg-white/5 border-white/10">
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
                    </div>
                    
                    <Button type="submit" className="w-full md:w-auto px-8 bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                      {loading ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-primary/10 border-primary/20 rounded-[32px]">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase italic text-primary">Status da Conta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-sm font-medium text-white/60">Verificação</span>
                    <Badge className="bg-green-500 text-white font-black text-[10px] uppercase">Verificado</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-sm font-medium text-white/60">Tipo</span>
                    <span className="text-sm font-black text-primary italic uppercase tracking-widest">Premium</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 rounded-[32px]">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase italic">Meus <span className="text-primary">Estatísticas</span></CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                      <div className="text-2xl font-black text-primary italic">0</div>
                      <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Arremates</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                      <div className="text-2xl font-black text-primary italic">0</div>
                      <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Lances Dados</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
