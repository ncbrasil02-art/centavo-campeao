import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { AdminSubNavbar } from "@/components/AdminSubNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Gavel, Calendar, Clock, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/auctions")({
  component: AdminAuctions,
});

function AdminAuctions() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAuction, setEditingAuction] = useState<any>(null);
  const [formData, setFormData] = useState({
    product_id: "",
    start_time: "",
    end_time: "",
    status: "scheduled",
    robot_enabled: true,
    timer_duration: 15
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [auctionsRes, productsRes] = await Promise.all([
        supabase.from("auctions").select("*, product:products(*)").order("created_at", { ascending: false }),
        supabase.from("products").select("*")
      ]);

      if (auctionsRes.error) throw auctionsRes.error;
      if (productsRes.error) throw productsRes.error;

      setAuctions(auctionsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const startTime = new Date(formData.start_time);
      const timerDuration = formData.timer_duration;
      
      // Se end_time não foi definido manualmente, ou é novo leilão, podemos sugerir o start + timer
      let endTime = new Date(formData.end_time);
      if (!formData.end_time) {
        endTime = new Date(startTime.getTime() + (timerDuration * 1000));
      }

      const payload = {
        ...formData,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      };

      if (editingAuction) {
        const { error } = await supabase
          .from("auctions")
          .update(payload)
          .eq("id", editingAuction.id);
        if (error) throw error;
        toast.success("Leilão atualizado");
      } else {
        const { error } = await supabase
          .from("auctions")
          .insert([payload]);
        if (error) throw error;
        toast.success("Leilão criado");
      }

      setIsDialogOpen(false);
      setEditingAuction(null);
      fetchData();
    } catch (error) {
      console.error("Error saving auction:", error);
      toast.error("Erro ao salvar leilão");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este leilão?")) return;
    try {
      const { error } = await supabase.from("auctions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Leilão excluído");
      fetchData();
    } catch (error) {
      console.error("Error deleting auction:", error);
      toast.error("Erro ao excluir leilão");
    }
  }

  function handleEdit(auction: any) {
    setEditingAuction(auction);
    setFormData({
      product_id: auction.product_id,
      start_time: format(new Date(auction.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(new Date(auction.end_time), "yyyy-MM-dd'T'HH:mm"),
      status: auction.status,
      robot_enabled: auction.robot_enabled,
      timer_duration: auction.timer_duration || 15
    });
    setIsDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <AdminSubNavbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Gerenciar <span className="text-primary">Leilões</span>
            </h1>
            <p className="text-white/40">Controle todos os leilões ativos e agendados</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingAuction(null);
              setFormData({ product_id: "", start_time: "", end_time: "", status: "scheduled", robot_enabled: true, timer_duration: 15 });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                <Plus className="w-4 h-4 mr-2" /> Novo Leilão
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic italic">
                  {editingAuction ? "Editar" : "Novo"} <span className="text-primary">Leilão</span>
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <Select 
                    value={formData.product_id} 
                    onValueChange={(v) => setFormData({...formData, product_id: v})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-white/10 text-white">
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input 
                      type="datetime-local" 
                      value={formData.start_time} 
                      onChange={e => setFormData({...formData, start_time: e.target.value})}
                      className="bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input 
                      type="datetime-local" 
                      value={formData.end_time} 
                      onChange={e => setFormData({...formData, end_time: e.target.value})}
                      className="bg-white/5 border-white/10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cronômetro (segundos)</Label>
                  <Input 
                    type="number" 
                    value={formData.timer_duration} 
                    onChange={e => setFormData({...formData, timer_duration: parseInt(e.target.value) || 15})}
                    className="bg-white/5 border-white/10"
                    min="1"
                    required
                  />
                  <p className="text-[10px] text-white/40">Tempo inicial e tempo resetado a cada lance</p>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(v) => setFormData({...formData, status: v})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-white/10 text-white">
                      <SelectItem value="scheduled">Agendado</SelectItem>
                      <SelectItem value="live">Ativo</SelectItem>
                      <SelectItem value="finished">Finalizado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Switch 
                    checked={formData.robot_enabled} 
                    onCheckedChange={v => setFormData({...formData, robot_enabled: v})}
                  />
                  <Label>Participação de Robôs</Label>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full bg-primary font-bold">
                    {editingAuction ? "Salvar Alterações" : "Criar Leilão"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5">
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Produto</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Início</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Fim</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Lances</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Status</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-white/40">Carregando...</TableCell></TableRow>
              ) : auctions.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-white/40">Nenhum leilão encontrado</TableCell></TableRow>
              ) : (
                auctions.map((auction) => (
                  <TableRow key={auction.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
                          {auction.product?.images?.[0] && (
                            <img src={auction.product.images[0]} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="font-bold">{auction.product?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white/60">
                      {format(new Date(auction.start_time), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {format(new Date(auction.end_time), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-bold text-primary">
                        <Gavel className="w-3 h-3" /> {auction.bid_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={auction.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/20 text-primary" onClick={() => handleEdit(auction)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/20 text-red-500" onClick={() => handleDelete(auction.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    live: "bg-green-500/10 text-green-500 border-green-500/20",
    finished: "bg-white/10 text-white/40 border-white/10",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20"
  };
  
  const labels = {
    scheduled: "Agendado",
    live: "Ativo",
    finished: "Finalizado",
    cancelled: "Cancelado"
  };

  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}