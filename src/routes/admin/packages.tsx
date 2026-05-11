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
import { Plus, Wallet, Edit, Trash2, Package } from "lucide-react";
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

export const Route = createFileRoute("/admin/packages")({
  component: AdminPackages,
});

function AdminPackages() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    bid_amount: 0,
    price: 0,
    image_url: ""
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  async function fetchPackages() {
    try {
      const { data, error } = await supabase
        .from("bid_packages")
        .select("*")
        .order("price", { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast.error("Erro ao carregar pacotes");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        bid_amount: Number(formData.bid_amount),
        price: Number(formData.price),
      };

      if (editingPackage) {
        const { error } = await supabase
          .from("bid_packages")
          .update(payload)
          .eq("id", editingPackage.id);
        if (error) throw error;
        toast.success("Pacote atualizado");
      } else {
        const { error } = await supabase
          .from("bid_packages")
          .insert([payload]);
        if (error) throw error;
        toast.success("Pacote criado");
      }

      setIsDialogOpen(false);
      setEditingPackage(null);
      setFormData({ name: "", bid_amount: 0, price: 0, image_url: "" });
      fetchPackages();
    } catch (error) {
      console.error("Error saving package:", error);
      toast.error("Erro ao salvar pacote");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este pacote?")) return;
    try {
      const { error } = await supabase.from("bid_packages").delete().eq("id", id);
      if (error) throw error;
      toast.success("Pacote excluído");
      fetchPackages();
    } catch (error) {
      console.error("Error deleting package:", error);
      toast.error("Erro ao excluir pacote");
    }
  }

  function handleEdit(pkg: any) {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      bid_amount: pkg.bid_amount,
      price: pkg.price,
      image_url: pkg.image_url || ""
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
              Pacotes de <span className="text-primary">Lances</span>
            </h1>
            <p className="text-white/40">Gerencie as opções de compra de créditos para os usuários</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingPackage(null);
              setFormData({ name: "", bid_amount: 0, price: 0, image_url: "" });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                <Plus className="w-4 h-4 mr-2" /> Novo Pacote
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic italic">
                  {editingPackage ? "Editar" : "Novo"} <span className="text-primary">Pacote</span>
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Pacote</Label>
                  <Input 
                    placeholder="Ex: Pacote Bronze" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade de Lances</Label>
                    <Input 
                      type="number" 
                      value={formData.bid_amount}
                      onChange={e => setFormData({...formData, bid_amount: parseInt(e.target.value) || 0})}
                      className="bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      className="bg-white/5 border-white/10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>URL da Imagem (Opcional)</Label>
                  <Input 
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                    className="bg-white/5 border-white/10"
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full bg-primary font-bold">
                    {editingPackage ? "Salvar Alterações" : "Criar Pacote"}
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
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Pacote</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Lances</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Preço</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-white/40">Carregando...</TableCell></TableRow>
              ) : packages.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-white/40">Nenhum pacote encontrado</TableCell></TableRow>
              ) : (
                packages.map((pkg) => (
                  <TableRow key={pkg.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                          <Package className="w-5 h-5" />
                        </div>
                        <span className="font-bold">{pkg.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {pkg.bid_amount} Lances
                    </TableCell>
                    <TableCell className="font-bold text-green-500">
                      R$ {Number(pkg.price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/20 text-primary" onClick={() => handleEdit(pkg)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/20 text-red-500" onClick={() => handleDelete(pkg.id)}>
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