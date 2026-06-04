import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { REAL_PERSON_PHOTOS } from "@/lib/constants";
import { Check } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Users, 
  Search, 
  UserPlus, 
  Edit2, 
  Shield, 
  Bot, 
  Wallet, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFallbackAvatarUrl } from "@/lib/constants";
import { toast } from "sonner";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({
    username: "",
    avatar_url: "",
    is_bot: false,
    is_admin: false
  });
  const usersPerPage = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, searchTerm]);

  async function fetchUsers() {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("*", { count: 'exact' });

    if (searchTerm) {
      query = query.or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * usersPerPage, page * usersPerPage - 1);

    if (error) {
      toast.error("Erro ao carregar usuários");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }

  const handleUpdateRole = async (userId: string, field: 'is_bot' | 'is_admin', value: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value } as any)
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao atualizar perfil");
    } else {
      toast.success("Perfil atualizado com sucesso!");
      fetchUsers();
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username || "",
      avatar_url: user.avatar_url || "",
      is_bot: !!user.is_bot,
      is_admin: !!user.is_admin
    });
    setIsEditUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userFormData.username.trim()) {
      toast.error("Nome de usuário obrigatório");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        username: userFormData.username,
        avatar_url: userFormData.avatar_url,
        is_bot: userFormData.is_bot,
        is_admin: userFormData.is_admin
      })
      .eq("id", editingUser.id);

    if (error) {
      toast.error("Erro ao salvar usuário");
    } else {
      toast.success("Usuário atualizado!");
      setIsEditUserDialogOpen(false);
      fetchUsers();
    }
  };

  const handleAddCredits = async (userId: string) => {
    const amount = prompt("Quantos lances deseja adicionar?", "10");
    if (!amount) return;

    const numAmount = parseInt(amount);
    if (isNaN(numAmount)) {
      toast.error("Valor inválido");
      return;
    }

    const { data, error } = await supabase.rpc('increment_bid_balance', {
      p_user_id: userId,
      p_amount: numAmount
    });

    if (error || (data && !(data as any).success)) {
      toast.error((data as any)?.message || "Erro ao adicionar créditos");
    } else {
      // Record transaction
      await supabase.from("transactions").insert({
        user_id: userId,
        amount: 0,
        type: 'bonus',
        description: `Créditos adicionados pelo administrador: ${numAmount} lances`,
        status: 'completed'
      });

      toast.success(`${numAmount} lances adicionados!`);
      fetchUsers();
    }
  };

  return (
    <div className="min-h-screen bg-background text-white">
      
      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter">Gestão de <span className="text-primary">Usuários</span></h1>
            </div>
            <p className="text-white/40">Controle total sobre participantes, saldos e permissões.</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input 
                placeholder="Buscar usuário..." 
                className="pl-10 bg-white/5 border-white/10 h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button className="bg-white/10 hover:bg-white/20 border border-white/10 text-white" disabled>
              <Filter className="w-4 h-4 mr-2" /> Filtrar
            </Button>
          </div>
        </div>

        {/* User's own profile quick actions */}
        <div className="mb-8">
          {users.find(u => u.is_admin && !u.is_bot) && (
            <Card className="bg-primary/5 border-primary/20 overflow-hidden backdrop-blur-md">
              <CardHeader className="py-4 border-b border-primary/10">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Seu Perfil Administrativo
                </CardTitle>
              </CardHeader>
              <CardContent className="py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                {users.filter(u => u.is_admin && !u.is_bot).map(me => (
                  <div key={me.id} className="flex items-center gap-4 w-full justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border-2 border-primary/20">
                        <AvatarImage src={me.avatar_url || getFallbackAvatarUrl(me.username)} />
                        <AvatarFallback className="bg-primary/20 text-primary">{me.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-black text-lg">{me.username} <span className="text-[10px] bg-primary text-black px-1.5 py-0.5 rounded-sm ml-2">VOCÊ</span></p>
                        <p className="text-sm text-white/40">Saldo atual: <span className="text-primary font-bold">{me.bid_balance || 0} lances</span></p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleAddCredits(me.id)}
                      className="bg-primary hover:bg-primary/90 text-black font-black"
                    >
                      <Wallet className="w-4 h-4 mr-2" /> RECARREGAR MEU SALDO
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
          <CardHeader className="border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Listagem de Participantes</CardTitle>
              <CardDescription>Mostrando {users.length} usuários registrados.</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="border-white/10" disabled>
              <UserPlus className="w-4 h-4 mr-2" /> Novo Usuário
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60 font-bold">Usuário</TableHead>
                  <TableHead className="text-white/60 font-bold">Saldo</TableHead>
                  <TableHead className="text-white/60 font-bold">Status/Papel</TableHead>
                  <TableHead className="text-white/60 font-bold">Cadastro</TableHead>
                  <TableHead className="text-white/60 font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 animate-pulse">Buscando base de dados...</TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 text-white/20">Nenhum usuário encontrado.</TableCell></TableRow>
                ) : users.map((u) => (
                  <TableRow key={u.id} className="border-white/10 hover:bg-white/5 transition-colors group">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-white/10">
                          <AvatarImage src={u.avatar_url || getFallbackAvatarUrl(u.username)} />
                          <AvatarFallback className="bg-primary/20 text-primary">{u.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-white group-hover:text-primary transition-colors">{u.username}</span>
                          <span className="text-[10px] text-white/40 uppercase tracking-widest">{u.full_name}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                          <Wallet className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-black text-lg">{u.bid_balance || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {u.is_admin && <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-black uppercase"><Shield className="w-3 h-3 mr-1" /> Admin</Badge>}
                        {u.is_bot && <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] font-black uppercase"><Bot className="w-3 h-3 mr-1" /> Robô</Badge>}
                        {!u.is_admin && !u.is_bot && <Badge className="bg-white/5 text-white/40 border-white/10 text-[9px] font-black uppercase">Usuário</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-white/40">{new Date(u.created_at).toLocaleDateString('pt-BR')}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-white/40 hover:text-white">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10 text-white w-48">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem onClick={() => handleEditUser(u)} className="hover:bg-primary/20 hover:text-primary cursor-pointer">
                            <Edit2 className="w-4 h-4 mr-2" /> Editar / Escolher Avatar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddCredits(u.id)} className="hover:bg-primary/20 hover:text-primary cursor-pointer">
                            <Wallet className="w-4 h-4 mr-2" /> Adicionar Lances
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(u.id, 'is_bot', !u.is_bot)} className="hover:bg-primary/20 hover:text-primary cursor-pointer">
                            <Bot className="w-4 h-4 mr-2" /> {u.is_bot ? "Remover Robô" : "Tornar Robô"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(u.id, 'is_admin', !u.is_admin)} className="hover:bg-primary/20 hover:text-primary cursor-pointer text-red-400">
                            <Shield className="w-4 h-4 mr-2" /> {u.is_admin ? "Remover Admin" : "Tornar Admin"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <div className="p-4 border-t border-white/5 bg-white/5 flex items-center justify-between">
            <span className="text-xs text-white/40">Página {page}</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 border-white/10 bg-white/5" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 border-white/10 bg-white/5" 
                onClick={() => setPage(p => p + 1)}
                disabled={users.length < usersPerPage}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Modal de Edição / Avatar */}
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
          <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[450px] rounded-[32px] overflow-hidden p-0">
            <div className="bg-primary/20 p-8 flex flex-col items-center border-b border-white/5">
              <Avatar className="h-24 w-24 border-4 border-primary shadow-2xl mb-4">
                <AvatarImage src={userFormData.avatar_url || getFallbackAvatarUrl(userFormData.username)} />
                <AvatarFallback className="bg-zinc-900 text-primary text-3xl font-black italic">
                  {userFormData.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">
                Editar <span className="text-primary">{userFormData.is_bot ? "Robô" : "Usuário"}</span>
              </DialogTitle>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-white/40">Nickname / Nome do Robô</Label>
                <Input 
                  value={userFormData.username}
                  onChange={e => setUserFormData({...userFormData, username: e.target.value})}
                  className="bg-white/5 border-white/10 h-12 text-lg font-bold rounded-xl"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-white/40">Escolher Avatar</Label>
                <div className="grid grid-cols-5 gap-3 h-40 overflow-y-auto pr-2 scrollbar-hide">
                  {REAL_PERSON_PHOTOS.slice(0, 25).map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => setUserFormData({...userFormData, avatar_url: photo})}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${userFormData.avatar_url === photo ? 'border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.5)] scale-110 z-10' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <img src={photo} className="w-full h-full object-cover" alt={`Avatar ${i}`} />
                      {userFormData.avatar_url === photo && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="h-6 w-6 text-primary" strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full h-14 bg-primary text-primary-foreground text-lg font-black uppercase italic tracking-tighter rounded-2xl shadow-[0_10px_30px_rgba(var(--color-primary),0.3)] hover:scale-[1.02] transition-all"
                onClick={handleSaveUser}
              >
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
