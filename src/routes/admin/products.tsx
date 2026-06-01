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
import { Plus, Package, Edit, Trash2, Upload, Loader2, Image as ImageIcon } from "lucide-react";
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
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    market_value: 0,
    category: "",
    images: [] as string[]
  });

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
      const fileExt = file.name.split(".").pop();
      const fileName = `product-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("site-assets")
        .getPublicUrl(filePath);

      setFormData({ ...formData, images: [...formData.images, publicUrl] });
      toast.success("Imagem carregada com sucesso!");
    } catch (error) {
      console.error("Error uploading product image:", error);
      toast.error("Erro ao carregar imagem");
    } finally {
      setUploading(false);
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
                            <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
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
