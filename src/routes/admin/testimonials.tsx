import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, User, Edit, Trash2, Star, MessageSquare, Video, Image as ImageIcon, Eye } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/testimonials")({
  component: AdminTestimonials,
});

function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    avatar_url: "",
    rating: 5,
    active: true
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  async function fetchTestimonials() {
    try {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      toast.error("Erro ao carregar depoimentos");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        rating: Number(formData.rating),
      };

      if (editingTestimonial) {
        const { error } = await supabase
          .from("testimonials")
          .update(payload)
          .eq("id", editingTestimonial.id);
        if (error) throw error;
        toast.success("Depoimento atualizado");
      } else {
        const { error } = await supabase
          .from("testimonials")
          .insert([payload]);
        if (error) throw error;
        toast.success("Depoimento criado");
      }

      setIsDialogOpen(false);
      setEditingTestimonial(null);
      setFormData({ name: "", content: "", avatar_url: "", rating: 5, active: true });
      fetchTestimonials();
    } catch (error) {
      console.error("Error saving testimonial:", error);
      toast.error("Erro ao salvar depoimento");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este depoimento?")) return;
    try {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
      toast.success("Depoimento excluído");
      fetchTestimonials();
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      toast.error("Erro ao excluir depoimento");
    }
  }

  function handleEdit(t: any) {
    setEditingTestimonial(t);
    setFormData({
      name: t.name,
      content: t.content,
      avatar_url: t.avatar_url || "",
      rating: t.rating,
      active: t.active
    });
    setIsDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-background text-white">
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Gerenciar <span className="text-primary">Depoimentos</span>
            </h1>
            <p className="text-white/40">Exiba o que os ganhadores estão falando da plataforma</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingTestimonial(null);
              setFormData({ name: "", content: "", avatar_url: "", rating: 5, active: true });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                <Plus className="w-4 h-4 mr-2" /> Novo Depoimento
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic italic">
                  {editingTestimonial ? "Editar" : "Novo"} <span className="text-primary">Depoimento</span>
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Cliente</Label>
                  <Input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Depoimento</Label>
                  <Textarea 
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="bg-white/5 border-white/10 min-h-[100px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Avaliação (1-5)</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="5"
                      value={formData.rating}
                      onChange={e => setFormData({...formData, rating: parseInt(e.target.value) || 5})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Avatar URL (Opcional)</Label>
                    <Input 
                      placeholder="https://..."
                      value={formData.avatar_url}
                      onChange={e => setFormData({...formData, avatar_url: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch 
                    checked={formData.active} 
                    onCheckedChange={v => setFormData({...formData, active: v})}
                  />
                  <Label>Visível no site</Label>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full bg-primary font-bold">
                    {editingTestimonial ? "Salvar Alterações" : "Criar Depoimento"}
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
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Cliente</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Depoimento</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Mídia</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Avaliação</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Status</TableHead>

                <TableHead className="text-white/40 font-bold uppercase text-[10px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-white/40">Carregando...</TableCell></TableRow>
              ) : testimonials.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-white/40">Nenhum depoimento encontrado</TableCell></TableRow>
              ) : (
                testimonials.map((t) => (
                  <TableRow key={t.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 overflow-hidden flex-shrink-0 border border-white/10 flex items-center justify-center">
                          {t.avatar_url ? (
                            <img src={t.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-white/20" />
                          )}
                        </div>
                        <span className="font-bold">{t.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-xs text-white/60 line-clamp-2 italic">"{t.content}"</p>
                    </TableCell>
                    <TableCell>
                      {t.media_url ? (
                        <div className="flex items-center gap-2">
                          {t.media_type === 'video' ? (
                            <Video className="w-4 h-4 text-primary" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-primary" />
                          )}
                          <a href={t.media_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline">Ver Mídia</a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/20">Apenas Texto</span>
                      )}
                    </TableCell>
                    <TableCell>

                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < t.rating ? "fill-yellow-500 text-yellow-500" : "text-white/10"}`} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${t.active ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-white/10 text-white/40 border-white/10"}`}>
                        {t.active ? "Ativo" : "Oculto"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/20 text-primary" onClick={() => handleEdit(t)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/20 text-red-500" onClick={() => handleDelete(t.id)}>
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