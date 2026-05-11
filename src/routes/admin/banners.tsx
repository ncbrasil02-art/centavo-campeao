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
import { Plus, Image as ImageIcon, Edit, Trash2, Layout, ExternalLink, Power, Upload, Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/banners")({
  component: AdminBanners,
});

function AdminBanners() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    image_url: "",
    link_url: "",
    order_index: 0,
    active: true
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  async function fetchBanners() {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast.error("Erro ao carregar banners");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        order_index: Number(formData.order_index),
      };

      if (editingBanner) {
        const { error } = await supabase
          .from("banners")
          .update(payload)
          .eq("id", editingBanner.id);
        if (error) throw error;
        toast.success("Banner atualizado");
      } else {
        const { error } = await supabase
          .from("banners")
          .insert([payload]);
        if (error) throw error;
        toast.success("Banner criado");
      }

      setIsDialogOpen(false);
      setEditingBanner(null);
      setFormData({ title: "", subtitle: "", image_url: "", link_url: "", order_index: 0, active: true });
      fetchBanners();
    } catch (error) {
      console.error("Error saving banner:", error);
      toast.error("Erro ao salvar banner");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este banner?")) return;
    try {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
      toast.success("Banner excluído");
      fetchBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast.error("Erro ao excluir banner");
    }
  }

  async function toggleActive(banner: any) {
    try {
      const { error } = await supabase
        .from("banners")
        .update({ active: !banner.active })
        .eq("id", banner.id);
      
      if (error) throw error;
      fetchBanners();
    } catch (error) {
      console.error("Error toggling banner:", error);
      toast.error("Erro ao alterar status");
    }
  }

  function handleEdit(banner: any) {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      image_url: banner.image_url,
      link_url: banner.link_url || "",
      order_index: banner.order_index,
      active: banner.active
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
              Banners <span className="text-primary">Rotativos</span>
            </h1>
            <p className="text-white/40">Gerencie os banners de destaque da página inicial</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingBanner(null);
              setFormData({ title: "", subtitle: "", image_url: "", link_url: "", order_index: 0, active: true });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                <Plus className="w-4 h-4 mr-2" /> Novo Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic italic">
                  {editingBanner ? "Editar" : "Novo"} <span className="text-primary">Banner</span>
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtítulo</Label>
                    <Input 
                      value={formData.subtitle}
                      onChange={e => setFormData({...formData, subtitle: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>URL da Imagem</Label>
                  <Input 
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Link de Destino</Label>
                    <Input 
                      placeholder="/auctions/..."
                      value={formData.link_url}
                      onChange={e => setFormData({...formData, link_url: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ordem</Label>
                    <Input 
                      type="number"
                      value={formData.order_index}
                      onChange={e => setFormData({...formData, order_index: parseInt(e.target.value) || 0})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch 
                    checked={formData.active} 
                    onCheckedChange={v => setFormData({...formData, active: v})}
                  />
                  <Label>Banner Ativo</Label>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full bg-primary font-bold">
                    {editingBanner ? "Salvar Alterações" : "Criar Banner"}
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
                <TableHead className="text-white/40 font-bold uppercase text-[10px] w-[100px]">Ordem</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Banner</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Link</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Status</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-white/40">Carregando...</TableCell></TableRow>
              ) : banners.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-white/40">Nenhum banner encontrado</TableCell></TableRow>
              ) : (
                banners.map((banner) => (
                  <TableRow key={banner.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="font-bold text-primary">#{banner.order_index}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-12 rounded bg-white/5 overflow-hidden border border-white/10">
                          <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold">{banner.title || "Sem título"}</span>
                          <span className="text-[10px] text-white/40">{banner.subtitle}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {banner.link_url && (
                        <a href={banner.link_url} target="_blank" className="flex items-center gap-1 text-primary hover:underline text-xs">
                          {banner.link_url} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`h-7 px-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${banner.active ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}
                        onClick={() => toggleActive(banner)}
                      >
                        {banner.active ? "Ativo" : "Inativo"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/20 text-primary" onClick={() => handleEdit(banner)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/20 text-red-500" onClick={() => handleDelete(banner.id)}>
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