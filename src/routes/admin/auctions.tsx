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
import { Plus, Gavel, Calendar, Clock, Edit, Trash2, CheckCircle, XCircle, Power, Upload, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, Bell } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NotificationDialog } from "@/components/admin/NotificationDialog";
import { useTimeSync } from "@/hooks/useTimeSync";

export const Route = createFileRoute("/admin/auctions")({
  component: AdminAuctions,
});

function AdminAuctions() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAuction, setEditingAuction] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const auctionsPerPage = 50; 
  const { formatBrasiliaTime } = useTimeSync();

  
  const [uploading, setUploading] = useState(false);
  
  const initialFormData = {
    product_id: "",
    new_product_name: "",
    new_product_description: "",
    new_product_market_value: 0,
    new_product_images: [] as string[],
    is_new_product: false,
    start_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_time: "",
    status: "scheduled",
    robot_enabled: true,
    timer_duration: 15,
    is_finalizing: false,
    target_winner: "random" as "robot" | "user" | "random",
    modality: "default",
    min_balance_required: 0,
    robot_min_delay: 1,
    robot_max_delay: 5,
    robot_bid_chance: 0.3,
    robot_active: true,
    robot_start_after: 0,
    robot_stop_after: 30
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [page, statusFilter, searchTerm]);


  async function fetchData() {
    setLoading(true);
    try {
      let query = supabase
        .from("auctions")
        .select("*, product:products(*)")
        .order("status", { ascending: true })
        .order("start_time", { ascending: true })
        .range((page - 1) * auctionsPerPage, page * auctionsPerPage - 1);
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchTerm) {
        // Search in products table via join might be tricky in PostgREST without specific setup
        // But since we have product:products(*) it might work if we use dot notation or just fetch and filter
        // Actually, let's just do client-side search for now as it's easier and the admin won't have millions of auctions
        // OR better: search by product name using ilike on the joined table if supported.
        // For now, let's stick to client-side filter but maybe increase the limit.
      }

      const [auctionsRes, productsRes] = await Promise.all([
        query,
        supabase.from("products").select("*").limit(100)
      ]);


      if (auctionsRes.error) throw auctionsRes.error;
      if (productsRes.error) throw productsRes.error;

      setAuctions(auctionsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(`Erro ao carregar dados: ${error.message || "Erro desconhecido"}`);
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

      setFormData(prev => ({ 
        ...prev, 
        new_product_images: [...prev.new_product_images, publicUrl] 
      }));
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
    const loadingToast = toast.loading("Salvando leilão...");
    try {
      let finalProductId = formData.product_id;

      // Handle new product creation if enabled
      if (formData.is_new_product && !editingAuction) {
        if (!formData.new_product_name) {
          toast.dismiss(loadingToast);
          toast.error("Nome do produto é obrigatório");
          return;
        }

        const { data: newProduct, error: productError } = await supabase
          .from("products")
          .insert([{
            name: formData.new_product_name,
            description: formData.new_product_description,
            market_value: formData.new_product_market_value,
            images: formData.new_product_images
          }])
          .select()
          .single();

        if (productError) {
          toast.dismiss(loadingToast);
          toast.error(`Erro ao criar produto: ${productError.message}`);
          return;
        }
        
        finalProductId = newProduct.id;
      }

      if (!finalProductId) {
        toast.dismiss(loadingToast);
        toast.error("Selecione um produto ou cadastre um novo");
        return;
      }

      const startTime = new Date(formData.start_time);
      if (isNaN(startTime.getTime())) {
        toast.error("Data de início inválida");
        return;
      }

      const timerDuration = formData.timer_duration;
      
      let endTime;
      if (formData.end_time) {
        endTime = new Date(formData.end_time).toISOString();
      } else {
        endTime = new Date(startTime.getTime() + (timerDuration * 1000)).toISOString();
      }

      const payload = {
        product_id: finalProductId,
        start_time: startTime.toISOString(),
        end_time: endTime,
        status: formData.status,
        robot_enabled: formData.robot_enabled,
        timer_duration: formData.timer_duration,
        target_winner: formData.target_winner,
        is_finalizing: formData.is_finalizing,
        modality: formData.modality,
        min_balance_required: formData.min_balance_required
      };

      let auctionId = editingAuction?.id;

      if (editingAuction) {
        const { error } = await supabase
          .from("auctions")
          .update(payload)
          .eq("id", editingAuction.id);
        
        if (error) {
          toast.error(`Erro ao atualizar: ${error.message}`);
          return;
        }
      } else {
        const { data: newAuction, error } = await supabase
          .from("auctions")
          .insert([{ 
            ...payload,
            current_price: 0.00,
            bid_count: 0

          }])
          .select()
          .single();
        
        if (error) {
          toast.dismiss(loadingToast);
          toast.error(`Erro ao criar leilão: ${error.message}`);
          return;
        }
        auctionId = newAuction.id;
      }

      // Update robot settings
      if (auctionId) {
        const { error: robotError } = await supabase
          .from("robot_settings")
          .upsert({
            auction_id: auctionId,
            min_delay: formData.robot_min_delay,
            max_delay: formData.robot_max_delay,
            bid_chance: formData.robot_bid_chance,
            active: formData.robot_active,
            start_after_minutes: formData.robot_start_after,
            stop_after_minutes: formData.robot_stop_after
          }, { onConflict: 'auction_id' });
        
        if (robotError) {
          console.error("Error updating robot settings:", robotError);
        }
      }

      toast.dismiss(loadingToast);
      toast.success(editingAuction ? "Leilão atualizado!" : "Leilão criado!");
      setIsDialogOpen(false);
      setEditingAuction(null);
      setFormData(initialFormData);
      fetchData();
    } catch (error: any) {
      console.error("Error saving auction:", error);
      toast.dismiss(loadingToast);
      toast.error(`Erro inesperado: ${error.message || "Erro desconhecido"}`);
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

  async function handleEdit(auction: any) {
    setEditingAuction(auction);
    
    // Fetch robot settings for this auction
    const { data: robotSettings } = await supabase
      .from("robot_settings")
      .select("*")
      .eq("auction_id", auction.id)
      .maybeSingle();

    setFormData({
      product_id: auction.product_id,
      new_product_name: "",
      new_product_description: "",
      new_product_market_value: 0,
      new_product_images: [],
      is_new_product: false,
      start_time: format(new Date(auction.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: auction.end_time ? format(new Date(auction.end_time), "yyyy-MM-dd'T'HH:mm") : "",
      status: auction.status,
      robot_enabled: auction.robot_enabled,
      timer_duration: auction.timer_duration || 15,
      is_finalizing: auction.is_finalizing || false,
      target_winner: auction.target_winner || "random",
      modality: auction.modality || "default",
      min_balance_required: auction.min_balance_required || 0,
      robot_min_delay: robotSettings?.min_delay || 1,
      robot_max_delay: robotSettings?.max_delay || 5,
      robot_bid_chance: typeof robotSettings?.bid_chance === 'string' ? parseFloat(robotSettings.bid_chance) : (robotSettings?.bid_chance || 0.3),
      robot_active: robotSettings?.active ?? true,
      robot_start_after: robotSettings?.start_after_minutes || 0,
      robot_stop_after: robotSettings?.stop_after_minutes || 30
    });
    setIsDialogOpen(true);
  }

  async function handleConfirmWinner(auctionId: string) {
    const loadingToast = toast.loading("Confirmando ganhador...");
    try {
      const { data, error } = await supabase.rpc('confirm_auction_winner', {
        p_auction_id: auctionId
      });
      if (error) throw error;
      const result = data as any;
      if (result.success) {
        toast.success(result.message);
        fetchData();
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao confirmar ganhador");
    } finally {
      toast.dismiss(loadingToast);
    }
  }
  
  async function handleFinishAuction(auctionId: string) {
    const loadingToast = toast.loading("Finalizando leilão...");
    try {
      const { error } = await supabase
        .from("auctions")
        .update({ status: 'finished' })
        .eq("id", auctionId);
      
      if (error) throw error;
      toast.success("Leilão finalizado com sucesso!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar leilão");
    } finally {
      toast.dismiss(loadingToast);
    }
  }

  const toggleFinalize = async (auction: any) => {
    try {
      const { error } = await supabase
        .from("auctions")
        .update({ is_finalizing: !auction.is_finalizing })
        .eq("id", auction.id);
      
      if (error) throw error;
      toast.success(auction.is_finalizing ? "Finalização cancelada" : "Leilão entrando em fase de finalização");
      fetchData();
    } catch (error) {
      console.error("Error toggling finalize:", error);
      toast.error("Erro ao alterar estado de finalização");
    }
  }

  const forceAudit = async (auctionId: string) => {
    if (!confirm("Tem certeza que deseja encerrar este leilão e enviá-lo para auditoria agora?")) return;
    const loadingToast = toast.loading("Encerrando leilão...");
    try {
      const { error } = await supabase
        .from("auctions")
        .update({ 
          status: 'pending_audit',
          end_time: new Date().toISOString()
        })
        .eq("id", auctionId);
      
      if (error) throw error;
      toast.success("Leilão enviado para auditoria!");
      fetchData();
    } catch (error: any) {
      console.error("Error forcing audit:", error);
      toast.error(`Erro ao encerrar: ${error.message}`);
    } finally {
      toast.dismiss(loadingToast);
    }
  }

  return (
    <div className="min-h-screen bg-background text-white">
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Gerenciar <span className="text-primary">Leilões</span>
            </h1>
            <p className="text-white/40">Controle todos os leilões ativos e agendados</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Input 
                placeholder="Buscar produto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border-white/10 h-10 pr-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-white/5 border-white/10 h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-white/10 text-white">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="live">Ativos</SelectItem>
                <SelectItem value="scheduled">Agendados</SelectItem>
                <SelectItem value="pending_audit">Em Auditoria</SelectItem>
                <SelectItem value="confirmed">Confirmados</SelectItem>
                <SelectItem value="finished">Finalizados</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingAuction(null);
              setFormData(initialFormData);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs" onClick={() => {
                setEditingAuction(null);
                setFormData(initialFormData);
              }}>
                <Plus className="w-4 h-4 mr-2" /> Novo Leilão
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase italic">
                  {editingAuction ? "Editar" : "Novo"} <span className="text-primary">Leilão</span>
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="flex items-center gap-2 mb-4 bg-white/5 p-3 rounded-lg border border-white/10">
                  <Switch 
                    checked={formData.is_new_product} 
                    onCheckedChange={v => setFormData({...formData, is_new_product: v})}
                    disabled={!!editingAuction}
                  />
                  <div>
                    <Label className="text-sm font-bold">Cadastrar Novo Produto</Label>
                    <p className="text-[10px] text-white/40 leading-none">Crie o produto e o leilão ao mesmo tempo</p>
                  </div>
                </div>

                {!formData.is_new_product ? (
                  <div className="space-y-2">
                    <Label>Produto Existente</Label>
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
                ) : (
                  <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="space-y-2">
                      <Label>Nome do Produto</Label>
                      <Input 
                        placeholder="Ex: iPhone 15 Pro" 
                        value={formData.new_product_name}
                        onChange={e => setFormData({...formData, new_product_name: e.target.value})}
                        className="bg-zinc-950 border-white/10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Descrição Completa</Label>
                      <Textarea 
                        placeholder="Detalhes, especificações, etc." 
                        value={formData.new_product_description}
                        onChange={e => setFormData({...formData, new_product_description: e.target.value})}
                        className="bg-zinc-950 border-white/10 min-h-[80px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Valor de Mercado (R$)</Label>
                      <Input 
                        type="number"
                        value={formData.new_product_market_value}
                        onChange={e => setFormData({...formData, new_product_market_value: parseFloat(e.target.value) || 0})}
                        className="bg-zinc-950 border-white/10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Imagens</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {formData.new_product_images.map((img, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-lg bg-zinc-950 border border-white/10 overflow-hidden">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              className="absolute top-1 right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setFormData({...formData, new_product_images: formData.new_product_images.filter((_, i) => i !== idx)})}
                            >
                              <Trash2 className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                        <div className="relative aspect-square">
                          <input
                            type="file"
                            id="auction-product-upload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                          />
                          <label 
                            htmlFor="auction-product-upload" 
                            className="w-full h-full rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-zinc-950"
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
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início (Brasília)</Label>
                    <Input 
                      type="datetime-local" 
                      value={formData.start_time} 
                      onChange={e => setFormData({...formData, start_time: e.target.value})}
                      className="bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim (Opcional - Brasília)</Label>
                    <Input 
                      type="datetime-local" 
                      value={formData.end_time} 
                      onChange={e => setFormData({...formData, end_time: e.target.value})}
                      className="bg-white/5 border-white/10"
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

                <div className="space-y-2">
                  <Label>Ganhador Alvo</Label>
                  <Select 
                    value={formData.target_winner} 
                    onValueChange={(v: any) => setFormData({...formData, target_winner: v})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-white/10 text-white">
                      <SelectItem value="random">Aleatório (Normal)</SelectItem>
                      <SelectItem value="robot">Forçar Robô (Garantido)</SelectItem>
                      <SelectItem value="user">Forçar Usuário Real</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-white/40 italic">
                    {formData.target_winner === 'robot' ? 'O robô cobrirá TODOS os lances de usuários reais.' : 
                     formData.target_winner === 'user' ? 'Os robôs não darão lances nos últimos segundos.' : 
                     'Os robôs agirão conforme a chance configurada.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Modalidade do Leilão</Label>
                  <Select 
                    value={formData.modality} 
                    onValueChange={(v: any) => setFormData({...formData, modality: v})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-white/10 text-white">
                      <SelectItem value="default">Padrão</SelectItem>
                      <SelectItem value="novice">Iniciante (Nunca ganhou)</SelectItem>
                      <SelectItem value="male">Masculino (Somente Homens)</SelectItem>
                      <SelectItem value="female">Feminino (Somente Mulheres)</SelectItem>
                      <SelectItem value="free">Livre (Não desconta lances)</SelectItem>
                      <SelectItem value="min_balance">Saldo Mínimo</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-white/40 italic">
                    {formData.modality === 'novice' ? 'Somente usuários que nunca arrematarem podem participar.' : 
                     formData.modality === 'male' ? 'Somente usuários com perfil masculino.' : 
                     formData.modality === 'female' ? 'Somente usuários com perfil feminino.' : 
                     formData.modality === 'free' ? 'Os lances não serão descontados do saldo do usuário.' : 
                     formData.modality === 'min_balance' ? 'Usuário precisa ter um saldo mínimo para participar.' : 
                     'Leilão padrão sem restrições.'}
                  </p>
                </div>

                {formData.modality === 'min_balance' && (
                  <div className="space-y-2">
                    <Label>Saldo Mínimo Exigido</Label>
                    <Input 
                      type="number"
                      value={formData.min_balance_required}
                      onChange={e => setFormData({...formData, min_balance_required: parseFloat(e.target.value) || 0})}
                      className="bg-zinc-950 border-white/10"
                    />
                  </div>
                )}

                <div className="p-4 rounded-lg border border-white/5 bg-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Participação de Robôs</Label>
                      <p className="text-[10px] text-white/40">Habilitar lances automáticos</p>
                    </div>
                    <Switch 
                      checked={formData.robot_enabled} 
                      onCheckedChange={v => setFormData({...formData, robot_enabled: v})}
                    />
                  </div>

                  {formData.robot_enabled && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Delay Mínimo (seg)</Label>
                          <Input 
                            type="number"
                            value={formData.robot_min_delay}
                            onChange={e => setFormData({...formData, robot_min_delay: parseInt(e.target.value) || 1})}
                            className="bg-zinc-950 border-white/10 h-8"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Delay Máximo (seg)</Label>
                          <Input 
                            type="number"
                            value={formData.robot_max_delay}
                            onChange={e => setFormData({...formData, robot_max_delay: parseInt(e.target.value) || 5})}
                            className="bg-zinc-950 border-white/10 h-8"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Chance de Lance (0.1 a 1.0)</Label>
                        <Input 
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="1"
                          value={formData.robot_bid_chance}
                          onChange={e => setFormData({...formData, robot_bid_chance: parseFloat(e.target.value) || 0.3})}
                          className="bg-zinc-950 border-white/10 h-8"
                        />
                        <p className="text-[9px] text-white/30 italic">Define a frequência da disputa. 0.3 = 30% chance por segundo.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Início do Robô (min)</Label>
                          <Input 
                            type="number"
                            value={formData.robot_start_after}
                            onChange={e => setFormData({...formData, robot_start_after: parseInt(e.target.value) || 0})}
                            className="bg-zinc-950 border-white/10 h-8"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Fim do Robô (min)</Label>
                          <Input 
                            type="number"
                            value={formData.robot_stop_after}
                            onChange={e => setFormData({...formData, robot_stop_after: parseInt(e.target.value) || 30})}
                            className="bg-zinc-950 border-white/10 h-8"
                          />
                        </div>
                      </div>
                      <p className="text-[9px] text-white/30 italic leading-tight">
                        Define quando os robôs começam e param de disputar lances com usuários Reais (em minutos após o início). 
                        Após o tempo de fim, o robô só dará lances se ele mesmo for o último (para manter o leilão vivo) ou se estiver configurado para vencer.
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full bg-primary font-bold text-xs">
                    {editingAuction ? "Salvar Alterações" : "Criar Leilão"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5">
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Produto</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Modalidade</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Início</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Expira em</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Lances</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Status</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-white/40">Carregando...</TableCell></TableRow>
              ) : auctions.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-white/40">Nenhum leilão encontrado</TableCell></TableRow>
              ) : (
                auctions
                  .filter(a => a.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((auction) => (
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
                    <TableCell>
                      <span className="text-[10px] font-bold uppercase bg-white/5 px-2 py-1 rounded border border-white/10">
                        {auction.modality || 'default'}
                      </span>
                    </TableCell>
                    <TableCell className="text-white/60">
                      {formatBrasiliaTime(new Date(auction.start_time), "dd/MM HH:mm")}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {formatBrasiliaTime(new Date(auction.end_time), "dd/MM HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-bold text-primary">
                        <Gavel className="w-3 h-3" /> {auction.bid_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge 
                        status={auction.status} 
                        isFinalizing={auction.is_finalizing} 
                        targetWinner={auction.target_winner}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {auction.status === 'scheduled' && (
                          <NotificationDialog auction={auction} />
                        )}
                        {auction.status === 'confirmed' && (
                          <Button 
                            size="sm" 
                            className="bg-amber-600 hover:bg-amber-500 text-white font-black h-9 text-[10px] shadow-[0_0_20px_rgba(217,119,6,0.5)] border-2 border-amber-400"
                            onClick={() => handleFinishAuction(auction.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> ARQUIVAR / FINALIZAR
                          </Button>
                        )}
                        {auction.status === 'pending_audit' && (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-500 text-white font-black h-9 text-[10px] shadow-[0_0_20px_rgba(22,163,74,0.5)] animate-pulse border-2 border-green-400"
                            onClick={() => handleConfirmWinner(auction.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> FINALIZAR AUDITORIA
                          </Button>
                        )}
                        {auction.status === 'live' && (
                          <>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className={`h-8 w-8 ${auction.is_finalizing ? 'text-orange-500 bg-orange-500/10' : 'text-green-500 hover:bg-green-500/10'}`} 
                              title={auction.is_finalizing ? "Disputa Encerrada (Clique para reativar robô)" : "Encerrar Disputa (Arrematar)"}
                              onClick={() => toggleFinalize(auction)}
                            >
                              <Power className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-red-500 hover:bg-red-500/10" 
                              title="Encerrar AGORA e enviar para Auditoria"
                              onClick={() => forceAudit(auction.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
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
                disabled={auctions.length < auctionsPerPage}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

      </main>
    </div>
  );
}

function StatusBadge({ status, isFinalizing, targetWinner }: { status: string, isFinalizing?: boolean, targetWinner?: string }) {
  const effectiveStatus = (status === 'live' && isFinalizing) ? 'finalizing' : status;
  
  const styles = {
    scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    live: "bg-green-500/10 text-green-500 border-green-500/20",
    pending_audit: "bg-red-500/10 text-red-500 border-red-500/20",
    confirmed: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    finished: "bg-white/10 text-white/40 border-white/10",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    finalizing: "bg-orange-500/10 text-orange-500 border-orange-500/20"
  };
  
  const labels = {
    scheduled: "Agendado",
    live: `Ativo (${targetWinner === 'robot' ? 'Robô' : targetWinner === 'user' ? 'Usuário' : 'Aleatório'})`,
    pending_audit: "Em Auditoria",
    confirmed: "Confirmado",
    finished: "Finalizado",
    cancelled: "Cancelado",
    finalizing: "Finalizando"
  };

  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[effectiveStatus as keyof typeof styles]}`}>
      {labels[effectiveStatus as keyof typeof labels] || status}
    </span>
  );
}
