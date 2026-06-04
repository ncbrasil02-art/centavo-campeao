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
import { Plus, Gavel, Calendar, Clock, Edit, Trash2, CheckCircle, XCircle, Power, Upload, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, Bell, List, Filter, RotateCcw, MessageCircle, Square, CheckSquare } from "lucide-react";
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
import { format, isSameDay } from "date-fns";
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
  const [dateFilter, setDateFilter] = useState("");
  const [viewingBidsAuction, setViewingBidsAuction] = useState<any>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [selectedAuctions, setSelectedAuctions] = useState<string[]>([]);
  const auctionsPerPage = 50; 


  const { formatBrasiliaTime } = useTimeSync();

  
  const [uploading, setUploading] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkData, setBulkBulkData] = useState({
    product_ids: [] as string[],
    days: ["1", "2", "3", "4", "5", "6", "0"], // Sunday to Saturday (0-6)
    startTime: "12:00",
    auctionsPerDay: 4,
    intervalMinutes: 60,
    timerDuration: 30,
    robotStopMinutes: 60
  });

  
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
    robot_inner_dispute: false,
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
    robot_stop_after: 30,
    slug: ""
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    // Realtime subscription for auctions
    const channel = supabase
      .channel('admin-auctions-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'auctions' 
      }, () => {
        // Refresh auctions list on any change
        fetchAuctions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuctions();
    }, 300); // Optimized debounce
    return () => clearTimeout(timer);
  }, [page, statusFilter, searchTerm, dateFilter]);

  async function fetchInitialData() {
    try {
      const { data, error } = await supabase.from("products").select("*").limit(200).order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching initial data:", error);
    }
  }

  async function fetchAuctions() {
    setLoading(true);
    setSelectedAuctions([]);

    try {
      let query = supabase
        .from("auctions")
        .select(`
          *,
          product (
            id,
            name,
            images
          ),
          last_bidder:profiles (
            id,
            username,
            phone
          )
        `)
        .range((page - 1) * auctionsPerPage, page * auctionsPerPage - 1);

      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchTerm) {
        // Filtragem por nome do produto
        query = query.ilike('product.name', `%${searchTerm}%`);
      }


      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte("start_time", startOfDay.toISOString())
          .lte("start_time", endOfDay.toISOString());
      }

      const { data, error } = await query.order('start_time', { ascending: false });

      if (error) throw error;

      // Custom sorting for admin panel priority
      const statusPriority: Record<string, number> = {
        'live': 0,
        'pending_audit': 1,
        'confirmed': 2,
        'scheduled': 3,
        'finished': 4,
        'cancelled': 5
      };

      const sortedAuctions = (data || []).sort((a, b) => {
        const priorityA = statusPriority[a.status as string] ?? 10;
        const priorityB = statusPriority[b.status as string] ?? 10;
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
        const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
        return timeB - timeA; // Most recent first for same status
      });

      setAuctions(sortedAuctions);
    } catch (error: any) {
      console.error("Error fetching auctions:", error);
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

      const payload: any = {
        product_id: finalProductId,
        start_time: startTime.toISOString(),
        end_time: endTime,
        status: formData.status,
        robot_enabled: formData.robot_enabled,
        timer_duration: formData.timer_duration,
        target_winner: formData.target_winner,
        is_finalizing: formData.is_finalizing,
        modality: formData.modality,
        min_balance_required: formData.min_balance_required,
        slug: formData.slug || null
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
            inner_dispute_enabled: formData.robot_inner_dispute,
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
      fetchAuctions();
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
      fetchAuctions();
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
      robot_stop_after: robotSettings?.stop_after_minutes || 30,
      robot_inner_dispute: robotSettings?.inner_dispute_enabled || false,
      slug: auction.slug || ""
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
        fetchAuctions();
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
      fetchAuctions();
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
      fetchAuctions();
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
      fetchAuctions();
    } catch (error: any) {
      console.error("Error forcing audit:", error);
      toast.error(`Erro ao encerrar: ${error.message}`);
    } finally {
      toast.dismiss(loadingToast);
    }
  }

  const handleBulkSchedule = async () => {
    // We'll use a hacky check since TS is complaining about the state change above
    const pIds = (bulkData as any).product_ids || [];
    if (pIds.length === 0) {
      toast.error("Selecione pelo menos um produto para o agendamento");
      return;
    }

    const loadingToast = toast.loading("Agendando leilões...");
    try {
      const selectedDays = bulkData.days.map(Number);
      const now = new Date();
      const next7Days = [];
      
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(now.getDate() + i);
        if (selectedDays.includes(d.getDay())) {
          next7Days.push(d);
        }
      }

      const auctionInserts = [];
      let productIndex = 0;
      
      for (const dayDate of next7Days) {
        const [hours, minutes] = bulkData.startTime.split(':').map(Number);
        
        for (let j = 0; j < bulkData.auctionsPerDay; j++) {
          const auctionStart = new Date(dayDate);
          auctionStart.setHours(hours, minutes + (j * bulkData.intervalMinutes), 0, 0);
          
          if (auctionStart > now) {
            const productId = pIds[productIndex % pIds.length];
            
            auctionInserts.push({
              product_id: productId,
              start_time: auctionStart.toISOString(),
              timer_duration: bulkData.timerDuration,
              status: 'scheduled',
              current_price: 0.01,
              bid_count: 0,
              robot_enabled: true
            });
            productIndex++;
          }
        }
      }

      if (auctionInserts.length === 0) {
        toast.error("Nenhum horário válido encontrado para os próximos 7 dias");
        return;
      }

      const { data: newAuctions, error } = await supabase
        .from("auctions")
        .insert(auctionInserts)
        .select();

      if (error) throw error;

      const robotInserts = newAuctions.map(a => ({
        auction_id: a.id,
        active: true,
        stop_after_minutes: bulkData.robotStopMinutes,
        bid_chance: 0.95,
        min_delay: 1,
        max_delay: 5
      }));

      await supabase.from("robot_settings").insert(robotInserts);

      toast.success(`${auctionInserts.length} leilões agendados com rodízio de produtos!`);
      setIsBulkDialogOpen(false);
      fetchAuctions();
    } catch (err: any) {
      toast.error("Erro ao agendar em massa: " + err.message);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAuctions.length === 0) {
      toast.error("Selecione pelo menos um leilão para excluir");
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir os ${selectedAuctions.length} leilões selecionados? Leilões com vencedores ou finalizados não serão excluídos para preservar o histórico.`)) return;

    const loadingToast = toast.loading("Excluindo leilões selecionados...");
    try {
      // Filtrar apenas leilões que não têm ganhador confirmado/finalizado
      const { data: safeToDelete, error: checkError } = await supabase
        .from("auctions")
        .select("id")
        .in("id", selectedAuctions)
        .not("status", "in", '("confirmed","finished","pending_audit")');

      if (checkError) throw checkError;

      if (!safeToDelete || safeToDelete.length === 0) {
        toast.error("Nenhum dos leilões selecionados pode ser excluído (estão em auditoria, finalizados ou confirmados)");
        return;
      }

      const idsToDelete = safeToDelete.map(a => a.id);
      
      const { error: deleteError } = await supabase
        .from("auctions")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) throw deleteError;

      toast.success(`${idsToDelete.length} leilões foram excluídos com sucesso!`);
      setSelectedAuctions([]);
      fetchAuctions();
    } catch (err: any) {
      console.error("Error bulk deleting auctions:", err);
      toast.error("Erro ao excluir leilões: " + err.message);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const toggleSelectAll = () => {
    // Only select auctions that are NOT confirmed, finished or in audit
    const selectableAuctions = auctions
      .filter(a => !['confirmed', 'finished', 'pending_audit'].includes(a.status))
      .map(a => a.id);

    if (selectedAuctions.length === selectableAuctions.length && selectableAuctions.length > 0) {
      setSelectedAuctions([]);
    } else {
      setSelectedAuctions(selectableAuctions);
    }
  };

  const toggleSelectAuction = (id: string, status: string) => {
    if (['confirmed', 'finished', 'pending_audit'].includes(status)) {
      toast.error("Leilões em auditoria, finalizados ou com ganhadores não podem ser excluídos em massa por segurança.");
      return;
    }

    setSelectedAuctions(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleResetAllAuctions = async () => {
    const loadingToast = toast.loading("Zerando todos os leilões...");
    try {
      // Get all live or scheduled auctions
      const { data: auctionsToCancel, error: fetchError } = await supabase
        .from("auctions")
        .select("id")
        .in("status", ["live", "scheduled"]);

      if (fetchError) throw fetchError;

      if (auctionsToCancel && auctionsToCancel.length > 0) {
        const allIds = auctionsToCancel.map(a => a.id);
        
        // Check for auctions with winners (safety)
        const { data: winners, error: winError } = await supabase
          .from("winners")
          .select("auction_id")
          .in("auction_id", allIds);

        if (winError) throw winError;
        
        const auctionsWithWinners = winners?.map(w => w.auction_id) || [];
        const safeIds = allIds.filter(id => !auctionsWithWinners.includes(id));

        if (safeIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("auctions")
            .delete()
            .in("id", safeIds);

          if (deleteError) throw deleteError;
          toast.success(`${safeIds.length} leilões foram zerados!`, { id: loadingToast });
        } else {
          toast.info("Nenhum leilão seguro para zerar foi encontrado.", { id: loadingToast });
        }
      } else {
        toast.info("Não há leilões ativos ou agendados para zerar.", { id: loadingToast });
      }

      setIsResetDialogOpen(false);
      fetchAuctions();
    } catch (err: any) {
      console.error("Error resetting auctions:", err);
      toast.error("Erro ao zerar leilões: " + err.message, { id: loadingToast });
    } finally {
      toast.dismiss(loadingToast);
    }
  };


  const openWhatsApp = (phone: string, product: string) => {
    if (!phone) {
      toast.error("Usuário não possui telefone cadastrado");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(`Olá! Gostaria de falar sobre o leilão do produto: ${product}`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };



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
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {selectedAuctions.length > 0 && (
              <Button 
                variant="destructive" 
                className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase h-10 px-4 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.4)]" 
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir Selecionados ({selectedAuctions.length})
              </Button>
            )}

            <Button 
              variant="outline" 
              className="border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold text-xs h-10" 
              onClick={() => setIsResetDialogOpen(true)}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Zerar Ativos
            </Button>

            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white text-xs h-10" onClick={() => setIsBulkDialogOpen(true)}>
              <Calendar className="w-4 h-4 mr-2" /> Agendamento em Massa
            </Button>

            <div className="relative flex-1 md:w-64">
              <Input 
                placeholder="Buscar produto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border-white/10 h-10 pr-10"
              />
            </div>
            <div className="relative">
              <Input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white/5 border-white/10 h-10 w-[160px] text-white"
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
                  <Label>URL Amigável (Slug)</Label>
                  <Input 
                    value={formData.slug} 
                    onChange={e => setFormData({...formData, slug: e.target.value})}
                    placeholder="ex: iphone-15-pro-desconto"
                    className="bg-white/5 border-white/10"
                  />
                  <p className="text-[10px] text-white/40 italic">Deixe em branco para gerar automaticamente.</p>
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
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Disputa Robô vs Robô</Label>
                          <p className="text-[10px] text-white/40">Robôs dão lances entre si (Disputa Interna)</p>
                        </div>
                        <Switch 
                          checked={formData.robot_inner_dispute} 
                          onCheckedChange={v => setFormData({...formData, robot_inner_dispute: v})}
                        />
                      </div>

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

          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase italic">Agendamento em <span className="text-primary">Massa</span></DialogTitle>
                <p className="text-xs text-white/40">Crie múltiplos leilões automaticamente para a semana.</p>
              </DialogHeader>
              <div className="py-6 space-y-6">
                <div className="space-y-2">
                  <Label>Produtos (Selecione múltiplos para rodízio)</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 bg-white/5 border border-white/10 rounded-lg">
                    {products.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          checked={bulkData.product_ids.includes(p.id)}
                          onChange={(e) => {
                            const ids = e.target.checked 
                              ? [...bulkData.product_ids, p.id]
                              : bulkData.product_ids.filter(id => id !== p.id);
                            setBulkBulkData({...bulkData, product_ids: ids});
                          }}
                          className="h-4 w-4 bg-zinc-800 border-white/20"
                        />
                        <span className="text-xs truncate">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>


                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora de Início</Label>
                    <Input type="time" value={bulkData.startTime} onChange={e => setBulkBulkData({...bulkData, startTime: e.target.value})} className="bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Leilões por Dia</Label>
                    <Input type="number" value={bulkData.auctionsPerDay} onChange={e => setBulkBulkData({...bulkData, auctionsPerDay: Number(e.target.value)})} className="bg-white/5 border-white/10" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Intervalo (minutos)</Label>
                    <Input type="number" value={bulkData.intervalMinutes} onChange={e => setBulkBulkData({...bulkData, intervalMinutes: Number(e.target.value)})} className="bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Duração Robô (min)</Label>
                    <Input type="number" value={bulkData.robotStopMinutes} onChange={e => setBulkBulkData({...bulkData, robotStopMinutes: Number(e.target.value)})} className="bg-white/5 border-white/10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Dias da Semana</Label>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((label, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          const days = bulkData.days.includes(String(i)) 
                            ? bulkData.days.filter(d => d !== String(i)) 
                            : [...bulkData.days, String(i)];
                          setBulkBulkData({...bulkData, days});
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${bulkData.days.includes(String(i)) ? 'bg-primary text-black' : 'bg-white/5 text-white/40 border border-white/10'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full bg-primary text-black font-black uppercase italic" onClick={handleBulkSchedule}>
                  GERAR PROGRAMAÇÃO AUTOMÁTICA
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5">
                <TableHead className="w-[40px]">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleSelectAll}>
                    {selectedAuctions.length > 0 && selectedAuctions.length === auctions.filter(a => !['confirmed', 'finished', 'pending_audit'].includes(a.status)).length 
                      ? <CheckSquare className="w-4 h-4 text-primary" /> 
                      : <Square className="w-4 h-4 text-white/20" />
                    }
                  </Button>
                </TableHead>

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
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-white/40">Carregando...</TableCell></TableRow>
              ) : auctions.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-white/40">Nenhum leilão encontrado</TableCell></TableRow>
              ) : (

                auctions
                  .map((auction) => (

                  <TableRow key={auction.id} className={`border-white/5 transition-colors ${
                    selectedAuctions.includes(auction.id) ? 'bg-primary/10' :
                    auction.status === 'live' ? 'bg-green-600/20 hover:bg-green-600/30 border-l-4 border-l-green-500' : 
                    auction.status === 'pending_audit' ? 'bg-red-600/20 hover:bg-red-600/30 border-l-4 border-l-red-500' :
                    auction.status === 'confirmed' ? 'bg-amber-600/20 hover:bg-amber-600/30 border-l-4 border-l-amber-500' :
                    'hover:bg-white/[0.02]'
                  }`}>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => toggleSelectAuction(auction.id, auction.status)}
                        disabled={['confirmed', 'finished', 'pending_audit'].includes(auction.status)}
                      >
                        {selectedAuctions.includes(auction.id) 
                          ? <CheckSquare className="w-4 h-4 text-primary" /> 
                          : <Square className={`w-4 h-4 ${['confirmed', 'finished', 'pending_audit'].includes(auction.status) ? 'opacity-20' : 'text-white/20'}`} />
                        }
                      </Button>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
                          {auction.product?.images?.[0] && (
                            <img src={auction.product.images[0]} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold">{auction.product?.name}</span>
                          {auction.last_bidder?.username && (
                            <span className="text-[10px] text-primary font-black uppercase tracking-tighter italic">
                              {auction.status === 'confirmed' || auction.status === 'finished' ? 'Vencedor: ' : 'Último lance: '}
                              {auction.last_bidder.username}
                            </span>
                          )}
                        </div>
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
                      <div className="flex justify-end gap-1">
                        {auction.last_bidder?.phone && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-green-500 hover:bg-green-500/10" 
                            title="Falar no WhatsApp"
                            onClick={() => openWhatsApp(auction.last_bidder.phone, auction.product?.name)}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        )}
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
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10 text-white" title="Ver Histórico de Lances" onClick={() => setViewingBidsAuction(auction)}>
                          <List className="w-4 h-4" />
                        </Button>
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

        {viewingBidsAuction && (
          <BidHistoryDialog 
            auction={viewingBidsAuction} 
            onClose={() => setViewingBidsAuction(null)} 
          />
        )}
        <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <DialogContent className="bg-zinc-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase italic text-red-500">
                Atenção: Zerar Leilões
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-white/60">
                Esta ação irá <strong>excluir permanentemente</strong> todos os leilões com status <strong>Ativo</strong> ou <strong>Agendado</strong>.
                Esta operação não pode ser desfeita.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResetDialogOpen(false)} className="bg-white/5 border-white/10 text-white">
                Cancelar
              </Button>
              <Button onClick={handleResetAllAuctions} className="bg-red-600 hover:bg-red-700 text-white">
                Confirmar e Zerar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function BidHistoryDialog({ auction, onClose }: { auction: any, onClose: () => void }) {
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBids() {
      const { data, error } = await supabase
        .from("bids")
        .select("*, profile:profiles(username)")
        .eq("auction_id", auction.id)
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (data) setBids(data);
      setLoading(false);
    }
    fetchBids();
  }, [auction.id]);

  return (
    <Dialog open={!!auction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase italic">
            Histórico de <span className="text-primary">Lances</span>
          </DialogTitle>
          <p className="text-xs text-white/40 uppercase tracking-tighter font-bold">{auction.product?.name}</p>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : bids.length === 0 ? (
            <p className="text-center text-white/40 py-8">Nenhum lance registrado</p>
          ) : (
            <div className="space-y-1.5">
              {bids.map((bid) => (
                <div key={bid.id} className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase italic tracking-tight">{bid.profile?.username || "Usuário"}</span>
                    <span className="text-[9px] text-white/30 font-medium">{format(new Date(bid.created_at), "HH:mm:ss.SSS - dd/MM", { locale: ptBR })}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-primary font-black text-sm italic">R$ {Number(bid.price_at_bid).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-[8px] text-white/20 uppercase font-bold tracking-widest">Lance #{bids.length - bids.indexOf(bid)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
