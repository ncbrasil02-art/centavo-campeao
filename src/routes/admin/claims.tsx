import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Filter, CheckCircle, XCircle, Clock, MessageSquare, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/admin/claims")({
  component: AdminClaims,
});

function AdminClaims() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClaims();
  }, [searchTerm]);

  useEffect(() => {
    if (selectedClaim) {
      fetchMessages(selectedClaim.auction_id);
      
      const channel = supabase
        .channel(`admin_claim_chat_${selectedClaim.auction_id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'auction_claim_messages', filter: `auction_id=eq.${selectedClaim.auction_id}` },
          () => fetchMessages(selectedClaim.auction_id)
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedClaim]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function fetchClaims() {
    setLoading(true);
    try {
      let query = supabase
        .from("winners")
        .select("*, profile:profiles(username, full_name), auction:auctions(title, product:products(name, images))");

      if (searchTerm) {
        query = query.or(`profile.username.ilike.%${searchTerm}%,profile.full_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      console.error("Error fetching claims:", error);
      toast.error("Erro ao carregar reivindicações");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(auctionId: string) {
    const { data } = await supabase
      .from("auction_claim_messages")
      .select("*")
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: true });
    
    if (data) setMessages(data);
  }

  async function updateStatus(winnerId: string, status: string) {
    try {
      const { error } = await supabase
        .from("winners")
        .update({ payment_status: status })
        .eq("id", winnerId);

      if (error) throw error;
      toast.success(`Status atualizado para ${status}`);
      fetchClaims();
      if (selectedClaim?.id === winnerId) {
        setSelectedClaim({ ...selectedClaim, payment_status: status });
      }
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedClaim) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("auction_claim_messages").insert({
      auction_id: selectedClaim.auction_id,
      sender_id: session.user.id,
      message: newMessage.trim(),
      is_admin_reply: true
    });

    if (error) {
      toast.error("Erro ao enviar mensagem");
    } else {
      setNewMessage("");
    }
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Reivindicações de <span className="text-primary">Prêmios</span>
            </h1>
            <p className="text-white/40">Gerencie comprovantes e conversas com os ganhadores</p>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input 
              placeholder="Buscar por usuário..." 
              className="bg-white/5 border-white/10 pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5">
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Ganhador</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Produto / Leilão</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Valor</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Pagamento</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Data</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-white/40">Carregando...</TableCell></TableRow>
              ) : claims.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-white/40">Nenhuma reivindicação encontrada</TableCell></TableRow>
              ) : (
                claims.map((claim) => (
                  <TableRow key={claim.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{claim.profile?.full_name || "Usuário"}</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">{claim.profile?.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img src={claim.auction?.product?.images?.[0]} className="w-10 h-10 rounded-lg object-cover" alt="" />
                        <span className="font-bold text-xs truncate max-w-[150px]">{claim.auction?.product?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      R$ {claim.final_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        claim.payment_status === 'approved' ? 'bg-green-500 text-white' :
                        claim.payment_status === 'rejected' ? 'bg-red-500 text-white' :
                        claim.payment_status === 'pending' ? 'bg-amber-500 text-black' : 'bg-white/10'
                      }>
                        {claim.payment_status === 'approved' ? 'Aprovado' :
                         claim.payment_status === 'rejected' ? 'Recusado' :
                         claim.payment_status === 'pending' ? 'Pendente' : 'Nenhum'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/60 text-xs">
                      {format(new Date(claim.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 hover:bg-primary/20 text-primary"
                        onClick={() => setSelectedClaim(claim)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" /> Gerenciar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
          <DialogContent className="max-w-5xl bg-zinc-900 border-white/10 text-white h-[85vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 border-b border-white/10 shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-2xl font-black uppercase italic italic text-primary">
                    Gerenciar Reivindicação
                  </DialogTitle>
                  <DialogDescription className="text-white/40">
                    Ganhador: {selectedClaim?.profile?.full_name} (@{selectedClaim?.profile?.username})
                  </DialogDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                    onClick={() => updateStatus(selectedClaim.id, 'approved')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Aprovar Pagamento
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                    onClick={() => updateStatus(selectedClaim.id, 'rejected')}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Recusar
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 p-6 border-r border-white/10 flex flex-col gap-6 overflow-y-auto">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Comprovante Enviado</h4>
                  {selectedClaim?.payment_receipt_url ? (
                    <div className="relative group rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black/40 flex items-center justify-center">
                      <img src={selectedClaim.payment_receipt_url} className="max-h-full object-contain" alt="Comprovante" />
                      <a 
                        href={selectedClaim.payment_receipt_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-5 h-5" /> Abrir Original
                      </a>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/20 italic text-sm">
                      Nenhum comprovante anexado ainda.
                    </div>
                  )}
                </div>

                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-white/40">Detalhes do Arremate</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase">Preço Final</p>
                      <p className="font-black text-primary">R$ {selectedClaim?.final_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase">Economia</p>
                      <p className="font-black text-green-500">{selectedClaim?.savings_percentage}%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-1/2 flex flex-col bg-black/20">
                <div className="p-4 border-b border-white/10 bg-white/5 shrink-0 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest italic">Chat Direto com Ganhador</span>
                </div>
                
                <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                  <div className="flex flex-col gap-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${!msg.is_admin_reply ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 ${!msg.is_admin_reply ? 'bg-zinc-800 rounded-tl-none' : 'bg-primary text-black font-medium rounded-tr-none shadow-[0_0_15px_rgba(var(--color-primary),0.2)]'}`}>
                          <p className="text-sm">{msg.message}</p>
                          <span className={`text-[9px] mt-1 block ${!msg.is_admin_reply ? 'text-white/40' : 'text-black/60'}`}>
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <form onSubmit={handleSendMessage} className="p-4 bg-zinc-950 border-t border-white/10 flex gap-2 shrink-0">
                  <Input 
                    placeholder="Sua resposta..." 
                    className="bg-white/5 border-white/10"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                  />
                  <Button type="submit" size="icon" className="bg-primary text-black hover:scale-105 transition-transform shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
