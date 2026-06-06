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
import { Plus, Image as ImageIcon, Edit, Trash2, Layout, ExternalLink, Power, Upload, Loader2, Calendar, Play } from "lucide-react";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    active: true,
    start_at: "",
    end_at: "",
    media_type: "image",
    transition_duration: 5,
    loop_count: 1
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const fileExt = file.name.split(".").pop();
      const fileName = `${isVideo ? 'video' : 'banner'}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("site-assets")
        .getPublicUrl(filePath);

      setFormData({ 
        ...formData, 
        image_url: publicUrl,
        media_type: isVideo ? 'video' : 'image'
      });
      toast.success(`${isVideo ? 'Vídeo' : 'Imagem'} carregado com sucesso!`);
    } catch (error) {
      console.error("Error uploading banner:", error);
      toast.error("Erro ao carregar arquivo");
    } finally {
      setUploading(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        order_index: Number(formData.order_index),
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
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
      setFormData({ 
        title: "", 
        subtitle: "", 
        image_url: "", 
        link_url: "", 
        order_index: 0, 
        active: true, 
        start_at: "", 
        end_at: "",
        media_type: "image",
        transition_duration: 5,
        loop_count: 1
      });
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
      active: banner.active,
      start_at: banner.start_at ? format(new Date(banner.start_at), "yyyy-MM-dd'T'HH:mm") : "",
      end_at: banner.end_at ? format(new Date(banner.end_at), "yyyy-MM-dd'T'HH:mm") : "",
      media_type: banner.media_type || "image",
      transition_duration: banner.transition_duration || 5
    });
    setIsDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-background text-white">
      
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
              setFormData({ 
                title: "", 
                subtitle: "", 
                image_url: "", 
                link_url: "", 
                order_index: 0, 
                active: true, 
                start_at: "", 
                end_at: "",
                media_type: "image",
                transition_duration: 5
              });
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
                
                <div className="space-y-4">
                  <Label>Arquivo do Banner (Imagem ou Vídeo)</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-12 rounded bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                      {formData.image_url ? (
                        formData.media_type === 'video' ? (
                          <div className="flex flex-col items-center justify-center">
                            <Play className="w-4 h-4 text-primary" />
                            <span className="text-[8px] text-white/40">MP4</span>
                          </div>
                        ) : (
                          <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <ImageIcon className="w-6 h-6 text-white/20" />
                      )}
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="file"
                        id="banner-upload"
                        className="hidden"
                        accept="image/*,video/mp4,video/webm,video/ogg"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <Button
                        asChild
                        variant="outline"
                        className="w-full border-white/10 hover:bg-white/5 text-white"
                        disabled={uploading}
                      >
                        <label htmlFor="banner-upload" className="cursor-pointer">
                          {uploading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando...</>
                          ) : (
                            <><Upload className="w-4 h-4 mr-2" /> Upload de Mídia</>
                          )}
                        </label>
                      </Button>
                    </div>
                  </div>
                  <Input 
                    placeholder="Ou cole a URL do arquivo aqui..."
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                    className="bg-white/5 border-white/10"
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Mídia</Label>
                      <select 
                        value={formData.media_type}
                        onChange={e => setFormData({...formData, media_type: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="image" className="bg-zinc-900">Imagem</option>
                        <option value="video" className="bg-zinc-900">Vídeo</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Duração (segundos)</Label>
                      <Input 
                        type="number"
                        value={formData.transition_duration}
                        onChange={e => setFormData({...formData, transition_duration: parseInt(e.target.value) || 5})}
                        className="bg-white/5 border-white/10"
                        min={1}
                      />
                    </div>
                  </div>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-primary" /> Início (Agendado)
                    </Label>
                    <Input 
                      type="datetime-local"
                      value={formData.start_at}
                      onChange={e => setFormData({...formData, start_at: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-primary" /> Fim (Agendado)
                    </Label>
                    <Input 
                      type="datetime-local"
                      value={formData.end_at}
                      onChange={e => setFormData({...formData, end_at: e.target.value})}
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
                banners.map((banner) => {
                  const now = new Date();
                  const isScheduled = banner.start_at || banner.end_at;
                  const isLive = banner.active && 
                    (!banner.start_at || new Date(banner.start_at) <= now) &&
                    (!banner.end_at || new Date(banner.end_at) >= now);

                  return (
                    <TableRow key={banner.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                      <TableCell className="font-bold text-primary">#{banner.order_index}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-12 rounded bg-white/5 overflow-hidden border border-white/10 flex items-center justify-center">
                            {banner.media_type === 'video' ? (
                              <div className="flex flex-col items-center justify-center">
                                <Play className="w-3 h-3 text-primary" />
                                <span className="text-[8px] text-white/40">VÍDEO</span>
                              </div>
                            ) : (
                              <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold">{banner.title || "Sem título"}</span>
                            <span className="text-[10px] text-white/40">{banner.subtitle}</span>
                            <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5">
                              {banner.media_type === 'video' ? 'Vídeo' : 'Imagem'} • {banner.transition_duration || 5}s
                            </span>
                            {isScheduled && (
                              <span className="text-[9px] text-primary flex items-center gap-1 mt-1 font-bold uppercase tracking-widest">
                                <Calendar className="w-2 h-2" />
                                {banner.start_at && format(new Date(banner.start_at), "dd/MM HH:mm")} 
                                {banner.end_at && ` → ${format(new Date(banner.end_at), "dd/MM HH:mm")}`}
                              </span>
                            )}
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
                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`h-7 px-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${banner.active ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}
                            onClick={() => toggleActive(banner)}
                          >
                            {banner.active ? "Ativado" : "Desativado"}
                          </Button>
                          {banner.active && (
                            <span className={`text-[8px] font-black uppercase tracking-tighter text-center ${isLive ? 'text-green-500' : 'text-yellow-500'}`}>
                              {isLive ? '• No Ar' : '• Agendado'}
                            </span>
                          )}
                        </div>
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}