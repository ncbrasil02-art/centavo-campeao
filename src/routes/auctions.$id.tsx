import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, User, Gavel, ShieldCheck, Zap, ArrowLeft, Share2, Info, MessageSquare, History } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuctionChat } from "@/components/AuctionChat";
import { useTimeSync } from "@/hooks/useTimeSync";
import confetti from "canvas-confetti";
import { toast } from "sonner";

export const Route = createFileRoute("/auctions/$id")({
  component: AuctionPage,
});

function AuctionPage() {
  const { id } = Route.useParams();
  const [auction, setAuction] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidLoading, setBidLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [isNewBid, setIsNewBid] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const confettiFired = useRef(false);
  const navigate = useNavigate();
  const { getAdjustedNow } = useTimeSync();

  useEffect(() => {
    fetchAuction();
    fetchBids();

    const auctionChannel = supabase
      .channel(`auction_${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${id}` },
        (payload) => {
          setAuction((prev: any) => ({ ...prev, ...payload.new }));
          setIsNewBid(true);
          setTimeout(() => setIsNewBid(false), 500);
          fetchBids(); // Refresh history on new bid
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel(`bids_${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${id}` },
        () => {
          fetchBids();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, [id]);

  useEffect(() => {
    if (!auction) return;

    confettiFired.current = false;
    const calculateTimeLeft = () => {
      if (!auction.end_time) return 0;
      const end = new Date(auction.end_time).getTime();
      const now = getAdjustedNow();
      return Math.max(0, Math.floor((end - now) / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0 && auction.status === 'live') {
        if (!confettiFired.current) {
          import("canvas-confetti").then((m) => {
            const confetti = m.default || m;
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#00F2FF', '#9D00FF', '#FF00E5']
            });
          });
          confettiFired.current = true;
        }
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auction?.end_time, auction?.status]);

  async function fetchAuction() {
    const { data, error } = await supabase
      .from("auctions")
      .select(`
        *,
        product:products(*),
        last_bidder:profiles(username, avatar_url)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching auction:", error);
      navigate({ to: "/" });
    } else {
      setAuction(data);
    }
    setLoading(false);
  }

  async function fetchBids() {
    const { data } = await supabase
      .from("bids")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("auction_id", id)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (data) setBids(data);
  }

  const handleBid = async () => {
    setBidLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para dar um lance!");
        navigate({ to: "/auth" });
        return;
      }

      const { data, error } = await supabase.rpc('place_bid', {
        p_auction_id: id,
        p_user_id: session.user.id
      });

      if (error) throw error;
      
      const result = data as any;
      if (!result.success) {
        toast.error(result.message);
      } else {
        setIsNewBid(true);
        if (timeLeft < 15) {
          setShowBonus(true);
          setTimeout(() => setShowBonus(false), 1000);
        }
        setTimeout(() => setIsNewBid(false), 500);
        toast.success("Lance confirmado!");
      }
    } catch (error: any) {
      console.error("Erro ao dar lance:", error);
      toast.error("Ocorreu um erro ao processar seu lance.");
    } finally {
      setBidLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!auction) return null;

  const isFinished = timeLeft <= 0 || auction.status === 'finished';
  const discount = Math.round((1 - (auction.current_price / auction.product?.market_value)) * 100);

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center gap-2 mb-8 text-white/40 hover:text-white transition-colors">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" />
            Voltar para leilões
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12">
          {/* Left Column: Product Gallery & Description */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-4">
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-white/5 border border-white/10 group">
                <img 
                  src={auction.product?.images?.[activeImage] || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop"} 
                  alt={auction.product?.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute top-6 left-6 flex flex-col gap-3">
                  {isFinished ? (
                    <Badge variant="outline" className="bg-black/60 backdrop-blur-md border-white/20 px-4 py-2 text-lg">ENCERRADO</Badge>
                  ) : (
                    <Badge className="bg-red-500 hover:bg-red-600 animate-pulse border-none px-4 py-2 text-lg">AO VIVO</Badge>
                  )}
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 backdrop-blur-md px-4 py-2 text-lg">
                    {discount}% ECONOMIA
                  </Badge>
                </div>
                <button className="absolute top-6 right-6 p-3 rounded-full bg-black/40 hover:bg-primary/20 border border-white/10 transition-all">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {auction.product?.images && auction.product.images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {auction.product.images.map((img: string, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${activeImage === idx ? 'border-primary' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                    >
                      <img src={img} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Card className="bg-white/5 border-white/10 overflow-hidden rounded-3xl">
              <Tabs defaultValue="description" className="w-full">
                <TabsList className="w-full grid grid-cols-2 bg-white/5 p-1">
                  <TabsTrigger value="description" className="rounded-2xl py-3 font-bold">DESCRIÇÃO</TabsTrigger>
                  <TabsTrigger value="rules" className="rounded-2xl py-3 font-bold">REGRAS DO LEILÃO</TabsTrigger>
                </TabsList>
                <div className="p-8">
                  <TabsContent value="description" className="mt-0 space-y-6">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Sobre o <span className="text-primary">Produto</span></h2>
                    <p className="text-white/60 leading-relaxed text-lg">
                      {auction.product?.description || "Este produto incrível pode ser seu por uma fração do preço original. Participe da disputa e arremate agora!"}
                    </p>
                    <div className="grid grid-cols-2 gap-6 pt-6">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <span className="block text-xs text-white/40 font-bold uppercase mb-1">Valor de Mercado</span>
                        <span className="text-xl font-bold">R$ {auction.product?.market_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <span className="block text-xs text-white/40 font-bold uppercase mb-1">Categoria</span>
                        <span className="text-xl font-bold">{auction.product?.category || "Eletrônicos"}</span>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="rules" className="mt-0 space-y-4">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Como <span className="text-primary">Ganhar</span></h2>
                    <ul className="space-y-4 text-white/60">
                      <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                        <p>Cada lance aumenta o preço do produto em <span className="text-white font-bold">R$ 0,01</span>.</p>
                      </li>
                      <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                        <p>Cada lance reinicia o cronômetro para <span className="text-white font-bold">15 segundos</span> (se estiver abaixo disso).</p>
                      </li>
                      <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                        <p>O último usuário a dar o lance quando o tempo chegar a <span className="text-white font-bold">00:00</span> vence!</p>
                      </li>
                    </ul>
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>

          {/* Right Column: Bidding Controls & History */}
          <div className="lg:col-span-5 space-y-8">
            <Card className="bg-white/5 border-primary/20 p-8 rounded-[40px] relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="absolute top-0 right-0 p-8 text-primary/10">
                <Gavel className="w-32 h-32 rotate-12" />
              </div>
              
              <div className="relative z-10 space-y-8">
                <div>
                  <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-tight mb-2">
                    {auction.product?.name}
                  </h1>
                  <p className="text-white/40 font-medium">Cód do Leilão: #{id.substring(0, 8).toUpperCase()}</p>
                </div>

                <div className="flex flex-col gap-2 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <span className="text-sm text-white/40 font-bold uppercase tracking-widest">Preço Atual</span>
                  <div className={`text-6xl font-black text-primary transition-transform duration-300 ${isNewBid ? 'scale-110' : 'scale-100'}`}>
                    R$ {auction.current_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2 p-6 rounded-3xl bg-white/5 border border-white/10">
                    <span className="text-xs text-white/40 font-bold uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-3 h-3 text-primary" /> Tempo Restante
                    </span>
                    <div className={`text-3xl font-mono font-black ${timeLeft < 10 && !isFinished ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                      00:{timeLeft.toString().padStart(2, '0')}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 p-6 rounded-3xl bg-white/5 border border-white/10">
                    <span className="text-xs text-white/40 font-bold uppercase tracking-widest flex items-center gap-2">
                      <History className="w-3 h-3 text-primary" /> Total Lances
                    </span>
                    <div className="text-3xl font-black text-white">
                      {auction.bid_count || 0}
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                      {auction.last_bidder?.avatar_url ? (
                        <img src={auction.last_bidder.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-white/40" />
                      )}
                    </div>
                    <div>
                      <span className="block text-[10px] text-white/40 font-bold uppercase tracking-widest">Líder Atual</span>
                      <span className="text-lg font-bold text-white group-hover:text-primary transition-colors">{auction.last_bidder?.username || "Ninguém ainda"}</span>
                    </div>
                  </div>
                  {showBonus && (
                    <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-black animate-bounce">
                      +15s BÔNUS
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleBid}
                  disabled={isFinished || bidLoading}
                  className={`w-full h-20 text-2xl font-black uppercase italic tracking-tighter transition-all rounded-3xl ${isFinished ? 'bg-white/5 text-white/20' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_10px_30px_rgba(var(--color-primary),0.4)] hover:scale-[1.02] active:scale-95'}`}
                >
                  {bidLoading ? "Processando..." : isFinished ? "LEILÃO ENCERRADO" : (
                    <span className="flex items-center gap-3">
                      Dar Lance <Zap className="w-6 h-6 fill-current" />
                    </span>
                  )}
                </Button>
                
                <p className="text-center text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">
                  Cada lance consome 1 crédito do seu saldo
                </p>
              </div>
            </Card>

            <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-xs uppercase tracking-widest">Histórico de <span className="text-primary">Lances</span></h3>
                </div>
                <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">ÚLTIMOS 10</Badge>
              </div>
              <div className="p-2">
                {bids.length > 0 ? (
                  <div className="space-y-1">
                    {bids.map((bid, idx) => (
                      <div key={bid.id} className={`flex items-center justify-between p-3 rounded-2xl transition-colors ${idx === 0 ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold w-4 ${idx === 0 ? 'text-primary' : 'text-white/20'}`}>#{bids.length - idx}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${idx === 0 ? 'text-white' : 'text-white/60'}`}>{bid.profile?.username}</span>
                            {idx === 0 && <Badge className="h-4 px-1.5 text-[8px] bg-primary text-primary-foreground">LIDERANDO</Badge>}
                          </div>
                        </div>
                        <span className={`font-mono text-sm font-bold ${idx === 0 ? 'text-primary' : 'text-white/40'}`}>R$ {bid.price_at_bid?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-white/20 italic text-sm">
                    Nenhum lance efetuado ainda.
                  </div>
                )}
              </div>
            </Card>

            <div className="h-[500px] rounded-[40px] overflow-hidden border border-white/10">
              <AuctionChat auctionId={id} />
            </div>
          </div>
        </div>
      </main>
      
      {/* Trust Badges */}
      <section className="py-20 border-t border-white/5 bg-black/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <TrustItem icon={<ShieldCheck className="w-8 h-8 text-primary" />} title="Seguro" desc="Transações 100% protegidas" />
            <TrustItem icon={<Zap className="w-8 h-8 text-primary" />} title="Rápido" desc="Lances em tempo real" />
            <TrustItem icon={<Info className="w-8 h-8 text-primary" />} title="Suporte" desc="Atendimento 24/7" />
            <TrustItem icon={<History className="w-8 h-8 text-primary" />} title="Histórico" desc="Auditoria de lances" />
          </div>
        </div>
      </section>
    </div>
  );
}

function TrustItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 group">
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-white uppercase tracking-widest text-xs mb-1">{title}</h4>
        <p className="text-white/40 text-[10px]">{desc}</p>
      </div>
    </div>
  );
}
