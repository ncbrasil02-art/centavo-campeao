import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
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

export const Route = createFileRoute("/admin/phrases")({
  component: AdminPhrases,
});

function AdminPhrases() {
  const [phrases, setPhrases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPhrase, setEditingAuction] = useState<any>(null);
  
  const initialFormData = {
    type: "hero",
    text: "",
    active: true
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchPhrases();
  }, []);

  async function fetchPhrases() {
    try {
      const { data, error } = await supabase
        .from("app_phrases")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhrases(data || []);
    } catch (error) {
      console.error("Error fetching phrases:", error);
      toast.error("Erro ao carregar frases");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!formData.text) {
        toast.error("O texto da frase é obrigatório");
        return;
      }

      if (editingPhrase) {
        const { error } = await supabase
          .from("app_phrases")
          .update(formData)
          .eq("id", editingPhrase.id);
        
        if (error) throw error;
        toast.success("Frase atualizada");
      } else {
        const { error } = await supabase
          .from("app_phrases")
          .insert([formData]);
        
        if (error) throw error;
        toast.success("Frase criada com sucesso!");
      }

      setIsDialogOpen(false);
      setEditingAuction(null);
      setFormData(initialFormData);
      fetchPhrases();
    } catch (error: any) {
      console.error("Error saving phrase:", error);
      toast.error(`Erro ao salvar: ${error.message}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta frase?")) return;
    try {
      const { error } = await supabase.from("app_phrases").delete().eq("id", id);
      if (error) throw error;
      toast.success("Frase excluída");
      fetchPhrases();
    } catch (error) {
      console.error("Error deleting phrase:", error);
      toast.error("Erro ao excluir frase");
    }
  }

  function handleEdit(phrase: any) {
    setEditingAuction(phrase);
    setFormData({
      type: phrase.type,
      text: phrase.text,
      active: phrase.active
    });
    setIsDialogOpen(true);
  }

  async function toggleActive(phrase: any) {
    try {
      const { error } = await supabase
        .from("app_phrases")
        .update({ active: !phrase.active })
        .eq("id", phrase.id);
      
      if (error) throw error;
      fetchPhrases();
    } catch (error) {
      toast.error("Erro ao alterar status");
    }
  }

  return (
    <div className="min-h-screen bg-background text-white">
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Gerenciar <span className="text-primary">Frases</span>
            </h1>
            <p className="text-white/40">Controle as frases do topo e incentivos dos cards</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingAuction(null);
              setFormData(initialFormData);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                <Plus className="w-4 h-4 mr-2" /> Nova Frase
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic">
                  {editingPhrase ? "Editar" : "Nova"} <span className="text-primary">Frase</span>
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Frase</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData({...formData, type: v})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-white/10 text-white">
                      <SelectItem value="hero">Topo (Hero Section)</SelectItem>
                      <SelectItem value="incentive">Incentivo (Auction Cards)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Texto da Frase</Label>
                  <Input 
                    value={formData.text} 
                    onChange={e => setFormData({...formData, text: e.target.value})}
                    placeholder="Ex: Arremate produtos incríveis por centavos!"
                    className="bg-white/5 border-white/10"
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch 
                    checked={formData.active} 
                    onCheckedChange={v => setFormData({...formData, active: v})}
                  />
                  <Label>Ativa</Label>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full bg-primary font-bold">
                    {editingPhrase ? "Salvar Alterações" : "Criar Frase"}
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
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Tipo</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Texto</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Status</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-white/40">Carregando...</TableCell></TableRow>
              ) : phrases.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-white/40">Nenhuma frase encontrada</TableCell></TableRow>
              ) : (
                phrases.map((phrase) => (
                  <TableRow key={phrase.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell>
                      <Badge variant="outline" className={phrase.type === 'hero' ? 'border-blue-500/30 text-blue-400' : 'border-amber-500/30 text-amber-400'}>
                        {phrase.type === 'hero' ? 'TOPO' : 'INCENTIVO'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-md truncate">
                      {phrase.text}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(phrase)}>
                        {phrase.active ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-white/20" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/20 text-primary" onClick={() => handleEdit(phrase)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/20 text-red-500" onClick={() => handleDelete(phrase.id)}>
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
