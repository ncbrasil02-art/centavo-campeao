import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, User, Gavel, ShieldCheck, Zap, ArrowLeft, Share2, Info, MessageSquare, History, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuctionChat } from "@/components/AuctionChat";
import { useTimeSync } from "@/hooks/useTimeSync";
// confetti will be imported dynamically on the client
import { toast } from "sonner";
import { FALLBACK_PRODUCT_IMAGE, getFallbackAvatarUrl } from "@/lib/constants";

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
  const [mounted, setMounted] = useState(false);
  const confettiFired = useRef(false);
  const navigate = useNavigate();
  const { getAdjustedNow } = useTimeSync();
  const channelRef = useRef<string>(`auction_detail_${id}_${Math.random().toString(36).substring(7)}`);
  const bidsChannelRef = useRef<string>(`bids_detail_${id}_${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchAuction();
    fetchBids();

    const auctionChannel = supabase
      .channel(channelRef.current)
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
      .channel(bidsChannelRef.current)
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
    // Fictitious mode: Always start at 30s
    setTimeLeft(30);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
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
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function fetchAuction() {
    // Mock data for fictitious mode if wanted, but we'll try to fetch first
    const { data, error } = await supabase
      .from("auctions")
      .select(`
        *,
        product:products(*),
        last_bidder:profiles(username, avatar_url)
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      // Fallback to mock data for fictitious mode
      setAuction({
        id,
        current_price: 15.20,
        bid_count: 142,
        status: "live",
        product: {
          name: "iPhone 15 Pro Max",
          description: "O smartphone mais avançado com o novo processador A17 Pro.",
          market_value: 8999.00,
          category: "Eletrônicos",
          images: ["https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&q=80&w=800"]
        },
        last_bidder: { username: "Arrematador99", avatar_url: null }
      });
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
    
    if (data && data.length > 0) {
      setBids(data);
    } else {
      // Mock bids for fictitious mode
      setBids([
        { id: "1", profile: { username: "Arrematador99" }, price_at_bid: 15.20, created_at: new Date().toISOString() },
        { id: "2", profile: { username: "GamerPro" }, price_at_bid: 15.19, created_at: new Date().toISOString() },
        { id: "3", profile: { username: "TechLover" }, price_at_bid: 15.18, created_at: new Date().toISOString() }
      ]);
    }
  }

  const handleBid = async () => {
    setBidLoading(true);
    // Simulate bid
    setTimeout(() => {
      setIsNewBid(true);
      setTimeLeft(30); // Reset to 30s
      setShowBonus(true);
      setTimeout(() => setShowBonus(false), 1000);
      setIsNewBid(false);
      setBidLoading(false);
      toast.success("Lance confirmado! (Simulado)");
      
      // Update bid count and price locally
      setAuction((prev: any) => ({
        ...prev,
        current_price: prev.current_price + 0.01,
        bid_count: (prev.bid_count || 0) + 1
      }));
    }, 400);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!auction) return null;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
            <div className="space-y-6">
              <div className="relative aspect-square rounded-[32px] overflow-hidden bg-white/5 border border-white/10 group shadow-2xl">
                <div className="absolute inset-0 z-0">
                  <img 
                    src={auction.product?.images?.[activeImage] || FALLBACK_PRODUCT_IMAGE} 
                    alt={auction.product?.name} 
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 blur-2xl opacity-20 scale-150"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                    }}
                  />
                </div>
                <img 
                  key={activeImage}
                  src={auction.product?.images?.[activeImage] || FALLBACK_PRODUCT_IMAGE} 
                  alt={auction.product?.name} 
                  className="relative z-10 w-full h-full object-contain p-8 transition-all duration-500 animate-in fade-in zoom-in-95"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                  }}
                />
                <div className="absolute top-6 left-6 z-20 flex flex-col gap-3">
                  {isFinished ? (
                    <Badge variant="outline" className="bg-black/60 backdrop-blur-md border-white/20 px-4 py-2 text-lg font-black italic">ENCERRADO</Badge>
                  ) : (
                    <Badge className="bg-red-500 hover:bg-red-600 animate-pulse border-none px-4 py-2 text-lg font-black italic shadow-[0_0_20px_rgba(239,68,68,0.5)]">AO VIVO</Badge>
                  )}
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 backdrop-blur-md px-4 py-2 text-lg font-black italic">
                    {discount}% ECONOMIA
                  </Badge>
                </div>
                <button className="absolute top-6 right-6 z-20 p-4 rounded-full bg-black/40 hover:bg-primary/20 border border-white/10 backdrop-blur-md transition-all group/share">
                  <Share2 className="w-5 h-5 transition-transform group-hover/share:scale-110" />
                </button>
              </div>

              {auction.product?.images && auction.product.images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {auction.product.images.map((img: string, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`relative w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0 snap-start ${activeImage === idx ? 'border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)]' : 'border-white/10 opacity-50 hover:opacity-100 hover:border-white/20'}`}
                    >
                      <img src={img} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE} />
                      {activeImage === idx && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <div className="w-1 h-1 bg-primary rounded-full animate-ping" />
                        </div>
                      )}
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
            <Card className="bg-white/5 border-primary/20 p-8 md:p-10 rounded-[48px] relative overflow-hidden shadow-2xl backdrop-blur-3xl group/card">
              {/* Animated Background Highlight */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] transition-all duration-1000 group-hover/card:bg-primary/20" />
              
              <div className="absolute top-0 right-0 p-10 text-primary/5">
                <Gavel className="w-40 h-40 rotate-12 transition-transform duration-700 group-hover/card:rotate-0 group-hover/card:scale-110" />
              </div>
              
              <div className="relative z-10 space-y-10">
                <div className="space-y-2">
                  <Badge variant="outline" className="border-primary/30 text-primary font-bold tracking-widest text-[10px] uppercase bg-primary/5">ITEM EM DISPUTA</Badge>
                  <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-tight text-white drop-shadow-sm">
                    {auction.product?.name}
                  </h1>
                  <p className="text-white/30 font-bold text-xs tracking-widest uppercase">REF: {id.substring(0, 8).toUpperCase()}</p>
                </div>

                <div className="flex flex-col gap-3 p-8 rounded-[32px] bg-gradient-to-br from-white/10 to-transparent border border-white/10 backdrop-blur-xl shadow-inner group/price">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 font-black uppercase tracking-[0.2em]">Preço Atual</span>
                    <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/5 animate-pulse">VALOR DE REPASSE</Badge>
                  </div>
                  <div className={`text-7xl font-black text-primary transition-all duration-500 ${isNewBid ? 'scale-110 drop-shadow-[0_0_30px_rgba(var(--color-primary),0.6)]' : 'scale-100'}`}>
                    <span className="text-3xl align-top mt-2 inline-block mr-1 opacity-60">R$</span>
                    {auction.current_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3 p-6 rounded-[28px] bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                    <span className="text-[10px] text-white/40 font-black uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-3 h-3 text-primary" /> Cronômetro
                    </span>
                    <div className={`text-4xl font-mono font-black transition-all duration-300 ${
                      timeLeft <= 5 && !isFinished 
                        ? 'text-red-500 animate-pulse scale-110 drop-shadow-[0_0_15px_rgba(239,68,68,0.7)]' 
                        : timeLeft <= 10 && !isFinished
                        ? 'text-orange-500'
                        : isFinished ? 'text-white/20' : 'text-white'
                    }`}>
                      {isFinished ? "00:00" : formatTime(timeLeft)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 p-6 rounded-[28px] bg-white/5 border border-white/10 transition-colors hover:bg-white/10">
                    <span className="text-[10px] text-white/40 font-black uppercase tracking-widest flex items-center gap-2">
                      <History className="w-3 h-3 text-primary" /> Total Bids
                    </span>
                    <div className="text-4xl font-black text-white">
                      {auction.bid_count || 0}
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-[28px] bg-primary/5 border border-primary/20 flex items-center justify-between group/bidder transition-all hover:bg-primary/10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/5 border-2 border-primary/20 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                      <img 
                        src={auction.last_bidder?.avatar_url || getFallbackAvatarUrl(auction.last_bidder?.username)} 
                        className="w-full h-full object-cover" 
                        alt="Bidder"
                        onError={(e) => (e.target as HTMLImageElement).src = getFallbackAvatarUrl(auction.last_bidder?.username)}
                      />
                    </div>
                    <div>
                      <span className="block text-[9px] text-white/30 font-black uppercase tracking-[0.2em] mb-1 leading-none">Vantagem Atual</span>
                      <span className="text-xl font-black text-white group-hover/bidder:text-primary transition-colors tracking-tight italic uppercase">{auction.last_bidder?.username || "Nenhum lance"}</span>
                    </div>
                  </div>
                  {showBonus && (
                    <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-[10px] font-black animate-bounce shadow-lg ring-4 ring-primary/20">
                      +15s BÔNUS
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4">
                  <Button 
                    onClick={handleBid}
                    disabled={isFinished || bidLoading}
                    className={`w-full h-24 text-3xl font-black uppercase italic tracking-tighter transition-all rounded-[32px] group/btn relative overflow-hidden ${
                      isFinished 
                        ? 'bg-white/5 text-white/20' 
                        : timeLeft <= 5
                        ? 'bg-red-600 text-white animate-[pulse_0.6s_ease-in-out_infinite] shadow-[0_0_50px_rgba(220,38,38,0.6)]'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_20px_50px_rgba(var(--color-primary),0.4)] hover:-translate-y-1 active:translate-y-1'
                    }`}
                  >
                    {!isFinished && (
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:animate-shimmer" 
                           style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
                    )}
                    
                    {bidLoading ? <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" /> : isFinished ? "LEILÃO ENCERRADO" : (
                      <span className="flex items-center gap-4 relative z-10">
                        {timeLeft <= 5 ? "CORRE! LANCE AGORA" : "Arrematar Agora"} <Zap className={`w-8 h-8 fill-current ${timeLeft <= 5 ? 'animate-bounce' : 'animate-pulse'}`} />
                      </span>
                    )}
                  </Button>
                  
                  <p className="text-center text-[10px] text-white/20 uppercase tracking-[0.3em] font-black">
                    CUSTO POR LANCE: 1 CRÉDITO
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-white/5 border-white/10 rounded-[32px] overflow-hidden shadow-xl backdrop-blur-xl group/history">
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <History className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-black text-sm uppercase tracking-[0.2em] text-white">Histórico de <span className="text-primary">Lances</span></h3>
                </div>
                <Badge variant="outline" className="text-[10px] border-white/10 text-white/40 font-bold px-3">LIVE FEED</Badge>
              </div>
              <div className="p-4">
                {bids.length > 0 ? (
                  <div className="space-y-2">
                    {bids.map((bid, idx) => (
                      <div key={bid.id} className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-right-2 ${idx === 0 ? 'bg-primary/20 border border-primary/30 shadow-[0_0_20px_rgba(var(--color-primary),0.1)]' : 'hover:bg-white/5 border border-transparent'}`}>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Avatar className={`w-10 h-10 border-2 transition-all ${idx === 0 ? 'border-primary scale-110 shadow-lg' : 'border-white/10'}`}>
                              <AvatarImage src={bid.profile?.avatar_url || getFallbackAvatarUrl(bid.profile?.username)} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                {bid.profile?.username?.substring(0, 2).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            {idx === 0 && (
                              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground p-0.5 rounded-full ring-2 ring-background">
                                <Trophy className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className={`font-black text-sm uppercase italic tracking-tighter ${idx === 0 ? 'text-white' : 'text-white/60'}`}>{bid.profile?.username}</span>
                              {idx === 0 && <Badge className="h-4 px-1.5 text-[8px] font-black bg-primary text-primary-foreground animate-pulse">LIDERANDO</Badge>}
                            </div>
                            <span className="text-[10px] text-white/30 font-bold uppercase">{new Date(bid.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono text-lg font-black block ${idx === 0 ? 'text-primary' : 'text-white/40'}`}>R$ {bid.price_at_bid?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Lance #{bids.length - idx}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-4">
                    <div className="inline-flex p-4 rounded-full bg-white/5 text-white/10">
                      <Zap className="w-12 h-12" />
                    </div>
                    <p className="text-white/20 font-black uppercase tracking-[0.2em] italic text-sm">Aguardando lance inicial...</p>
                  </div>
                )}
              </div>
            </Card>

            <div className="h-[500px] rounded-[40px] overflow-hidden border border-white/10">
              {mounted && <AuctionChat auctionId={id} />}
            </div>
          </div>
        </div>
      </main>
      
      {/* Trust Badges */}
      <section className="py-24 border-t border-white/5 bg-black/40 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8">
            <TrustItem icon={<ShieldCheck className="w-10 h-10 text-primary" />} title="Compra Segura" desc="Certificação SSL & Pagamentos PIX" />
            <TrustItem icon={<Zap className="w-10 h-10 text-primary" />} title="Real-Time" desc="Lances processados em 10ms" />
            <TrustItem icon={<Info className="w-10 h-10 text-primary" />} title="Suporte VIP" desc="Atendimento especializado 24/7" />
            <TrustItem icon={<History className="w-10 h-10 text-primary" />} title="Transparência" desc="Auditoria pública de cada lance" />
          </div>
        </div>
      </section>
    </div>
  );
}

function TrustItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 group/trust cursor-default">
      <div className="p-6 rounded-[24px] bg-white/5 border border-white/5 transition-all duration-500 group-hover/trust:bg-primary/10 group-hover/trust:border-primary/20 group-hover/trust:-translate-y-2 shadow-lg">
        <div className="transition-transform duration-500 group-hover/trust:scale-110">
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="font-black text-white uppercase tracking-[0.2em] text-[10px] italic">{title}</h4>
        <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest leading-tight max-w-[120px]">{desc}</p>
      </div>
    </div>
  );
}
