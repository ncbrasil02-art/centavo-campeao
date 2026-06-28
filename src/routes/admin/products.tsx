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
import { Plus, Package, Edit, Trash2, Upload, Loader2, Image as ImageIcon, Download } from "lucide-react";
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

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [mlUrl, setMlUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    market_value: 0,
    category: "",
    images: [] as string[]
  });

  async function uploadImagesToStorage(urls: string[]): Promise<string[]> {
    const uploaded: string[] = [];
    const picks = (urls || []).slice(0, 6);
    for (let i = 0; i < picks.length; i++) {
      const url = picks[i];
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        const ctype = blob.type || "image/jpeg";
        const ext = (ctype.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
        const rand = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${i}`;
        const filePath = `products/${rand}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("site-assets")
          .upload(filePath, blob, { cacheControl: "3600", upsert: true, contentType: ctype });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("site-assets").getPublicUrl(filePath);
        uploaded.push(publicUrl);
      } catch (err) {
        console.warn("Falha ao copiar imagem, mantendo URL original:", url, err);
        uploaded.push(url);
      }
    }
    return uploaded;
  }

  async function handleImportFromML(imagesOnly = false) {
    if (!mlUrl.trim()) {
      toast.error("Cole o link do produto");
      return;
    }
    if (!/\/p(\/|$|\?)/i.test(mlUrl)) {
      toast.error("Link inválido. Use o link direto do produto (termina em /p)");
      return;
    }
    setImporting(true);
    try {
      const { importFromMagalu } = await import("@/lib/magalu-import.functions");
      const result = await importFromMagalu({ data: { url: mlUrl.trim() } });
      const uploaded = await uploadImagesToStorage(result.images || []);

      if (imagesOnly) {
        setFormData((prev) => ({ ...prev, images: uploaded }));
        toast.success(`${uploaded.length} imagens importadas`);
      } else {
        setFormData({
          name: result.name,
          description: result.description,
          market_value: result.price,
          category: result.category,
          images: uploaded,
        });
        toast.success(`Importado: ${result.name || "produto"} (${uploaded.length} imagens)`);
      }
    } catch (e: any) {
      console.error("Import error:", e);
      toast.error(`Erro ao importar: ${e?.message || "desconhecido"}`);
    } finally {
      setImporting(false);
    }
  }


  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error(`Erro ao carregar produtos: ${error.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Selecione um arquivo de imagem válido.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Imagem muito grande (máx. 5MB).");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Faça login como administrador.");

      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const rand = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
      const filePath = `products/${rand}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("site-assets")
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, images: [...prev.images, publicUrl] }));
      toast.success("Imagem carregada com sucesso!");
    } catch (error: any) {
      console.error("Error uploading product image:", error);
      toast.error(`Erro ao carregar imagem: ${error?.message || "Erro desconhecido"}`);
    } finally {
      setUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        market_value: Number(formData.market_value),
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("Produto/Lote atualizado");
      } else {
        const { error } = await supabase
          .from("products")
          .insert([payload]);
        if (error) throw error;
        toast.success("Produto/Lote criado");
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      setFormData({ name: "", description: "", market_value: 0, category: "", images: [] });
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Erro ao salvar produto");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Produto excluído");
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Este produto não pode ser excluído pois está em uso em um leilão.");
    }
  }

  function handleEdit(product: any) {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      market_value: product.market_value,
      category: product.category || "",
      images: product.images || []
    });
    setIsDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-background text-white">
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Gerenciar <span className="text-primary">Lotes (Produtos)</span>
            </h1>
            <p className="text-white/40">Cadastre os itens que serão leiloados na plataforma</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingProduct(null);
              setFormData({ name: "", description: "", market_value: 0, category: "", images: [] });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs">
                <Plus className="w-4 h-4 mr-2" /> Novo Lote
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic italic">
                  {editingProduct ? "Editar" : "Novo"} <span className="text-primary">Lote</span>
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                {!editingProduct && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <Label className="text-xs uppercase font-black tracking-wider text-primary">
                      Importar Produto (lojas VTEX)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Cole o link do produto (ex: compracerta.com.br/.../p)"

                        value={mlUrl}
                        onChange={(e) => setMlUrl(e.target.value)}
                        className="bg-white/5 border-white/10 text-xs"
                        disabled={importing}
                      />

                      <Button
                        type="button"
                        onClick={handleImportFromML}
                        disabled={importing}
                        className="bg-primary font-bold text-xs whitespace-nowrap"
                      >
                        {importing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-1" /> Importar
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-white/40">
                      Importa título, preço, descrição e até 6 imagens automaticamente.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Produto</Label>
                    <Input 
                      placeholder="Ex: iPhone 15 Pro" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input 
                      placeholder="Ex: Smartphones" 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea 
                    placeholder="Detalhes técnicos, estado do produto, etc."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="bg-white/5 border-white/10 min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor de Mercado (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={formData.market_value}
                    onChange={e => setFormData({...formData, market_value: parseFloat(e.target.value) || 0})}
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <Label>Imagens do Produto</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setFormData({...formData, images: formData.images.filter((_, i) => i !== idx)})}
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    <div className="relative aspect-square">
                      <input
                        type="file"
                        id="product-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <label 
                        htmlFor="product-upload" 
                        className="w-full h-full rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-white/5"
                      >
                        {uploading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        ) : (
                          <>
                            <Plus className="w-6 h-6 text-white/20" />
                            <span className="text-[10px] uppercase font-black text-white/20 mt-1">Add</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full bg-primary font-bold text-xs">
                    {editingProduct ? "Salvar Alterações" : "Cadastrar Lote"}
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
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Categoria</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Valor de Mercado</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-white/40">Carregando...</TableCell></TableRow>
              ) : products.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-white/40">Nenhum produto cadastrado</TableCell></TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const img = e.currentTarget;
                                img.style.display = "none";
                                const parent = img.parentElement;
                                if (parent && !parent.querySelector("[data-fallback]")) {
                                  const div = document.createElement("div");
                                  div.setAttribute("data-fallback", "true");
                                  div.className = "w-full h-full flex items-center justify-center text-white/10";
                                  div.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                                  parent.appendChild(div);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/10">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold">{product.name}</span>
                          <span className="text-[10px] text-white/40 uppercase tracking-widest truncate max-w-[200px]">{product.description}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-white/60">
                        {product.category || "Geral"}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      R$ {Number(product.market_value).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/20 text-primary" onClick={() => handleEdit(product)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/20 text-red-500" onClick={() => handleDelete(product.id)}>
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
