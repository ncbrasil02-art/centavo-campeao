import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, User, Gavel, ShieldCheck, Zap, ArrowLeft, Share2, Info, MessageSquare, History, Trophy, Volume2, VolumeX, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/useSettings";
import { AuctionChat } from "@/components/AuctionChat";
import { AuctionVoiceAnnouncements } from "@/components/AuctionVoiceAnnouncements";
import { useTimeSync } from "@/hooks/useTimeSync";
// confetti will be imported dynamically on the client
import { toast } from "sonner";
import { FALLBACK_PRODUCT_IMAGE, getFallbackAvatarUrl, FICTITIOUS_PARTICIPANTS, MODALITY_CONFIG } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRecentWinners } from "@/hooks/useRecentWinners";


const BID_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";

export const Route = createFileRoute("/auctions/$id")({
  component: AuctionPage,
});

function AuctionPage() {
  const { id } = Route.useParams();
  const { sound_enabled } = useSettings();
  const [auction, setAuction] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [showAllBids, setShowAllBids] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bidLoading, setBidLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerDuration, setTimerDuration] = useState(15);
  const [activeImage, setActiveImage] = useState(0);
  const [isNewBid, setIsNewBid] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const confettiFired = useRef(false);
  const navigate = useNavigate();
  const { getAdjustedNow } = useTimeSync();
  const { currentWinner, hasWinners } = useRecentWinners();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setCurrentUserId(session.user.id);
    });
  }, []);



  const isFinished = auction?.status === 'finished';
  const isPendingAudit = auction?.status === 'pending_audit';
  const isConfirmed = auction?.status === 'confirmed';
  const isTimeUp = timeLeft <= 0 && !isFinished && !isPendingAudit;
  const discount = auction?.product?.market_value 
    ? Math.round((1 - (auction.current_price / auction.product.market_value)) * 100)
    : 0;

  useEffect(() => {
    audioRef.current = new Audio(BID_SOUND_URL);
    audioRef.current.load();
  }, []);

  const playBidSound = useCallback(() => {
    if (audioRef.current && !isMuted && sound_enabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.error("Error playing sound:", err));
    }
  }, [isMuted, sound_enabled]);

  // Play sound when auction updates (e.g. real-time bid from others)
  const lastPriceRef = useRef<number>(0);
  const lastBidderIdRef = useRef<string | null>(null);

  const playSurpassedSound = useCallback(() => {
    if (!sound_enabled) return;
    const isEnabled = localStorage.getItem("auction_sound_enabled") !== "false";
    if (!isEnabled) return;

    const soundId = localStorage.getItem("auction_surpassed_sound") || "default";
    const soundUrls: Record<string, string> = {
      "default": "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
      "alert-1": "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
      "alert-2": "https://assets.mixkit.co/active_storage/sfx/2566/2566-preview.mp3",
      "alert-3": "https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3"
    };

    const audio = new Audio(soundUrls[soundId]);
    audio.play().catch(err => console.error("Error playing surpassed sound:", err));
  }, []);

  useEffect(() => {
    if (auction?.current_price) {
      if (mounted && lastPriceRef.current > 0 && auction.current_price > lastPriceRef.current) {
        if (currentUserId && lastBidderIdRef.current === currentUserId && auction.last_bidder_id !== currentUserId) {
          playSurpassedSound();
        } else {
          playBidSound();
        }
      }
      lastPriceRef.current = auction.current_price;
      lastBidderIdRef.current = auction.last_bidder_id;
    }
  }, [auction?.current_price, auction?.last_bidder_id, playBidSound, playSurpassedSound, mounted, currentUserId]);

  const channelRef = useRef<string>(`auction_detail_${id}_${Math.random().toString(36).substring(7)}`);
  const bidsChannelRef = useRef<string>(`bids_detail_${id}_${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchAuction();
  }, [id]);

  useEffect(() => {
    if (!auction?.id) return;

    fetchBids();

    console.log('Subscribing to real-time for auction:', auction.id);

    const auctionChannel = supabase
      .channel(`auction_detail_${auction.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auction.id}` },
        async (payload) => {
          console.log('Auction real-time update:', payload.new);
          
          // Fetch the latest profile data for the leader UI
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.last_bidder_id)
            .maybeSingle();
          
          setAuction((prev: any) => ({ 
            ...prev, 
            ...payload.new,
            last_bidder: profileData || prev?.last_bidder
          }));

          // Recalculate time remaining instantly
          if (payload.new.end_time) {
            const end = new Date(payload.new.end_time).getTime();
            const now = getAdjustedNow();
            setTimeLeft(Math.max(0, (end - now) / 1000));
          }

          setIsNewBid(true);
          setTimeout(() => setIsNewBid(false), 500);
          fetchBids(); // Refresh history
        }
      )
      .subscribe();

    const bidsChannel = supabase
      .channel(`bids_detail_${auction.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${auction.id}` },
        () => {
          console.log('New bid detected via real-time');
          fetchBids();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, [auction?.id]);

  useEffect(() => {
    if (!auction?.end_time && !auction?.start_time) return;
    if (isFinished) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = async () => {
      const isScheduled = auction.status === 'scheduled';
      const targetTime = isScheduled ? auction.start_time : auction.end_time;
      if (!targetTime) return;

      const now = getAdjustedNow();
      const target = new Date(targetTime).getTime();
      const diff = Math.max(0, (target - now) / 1000);
      
      // Atomic update to ensure all viewers see the exact same value
      setTimeLeft(diff);

      if (isScheduled && diff <= 0) {
        console.log("Scheduled auction reached zero on detail page, refreshing...");
        await supabase.rpc('tick_auctions');
        fetchAuction();
      }

      if (!isScheduled && diff <= 0 && auction.status === 'live') {
        // Auction just finished
        if (!confettiFired.current) {
          import("canvas-confetti").then((m) => {
            const confetti = m.default || m;
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0, colors: ['#00F2FF', '#9D00FF', '#FF00E5'] };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function() {
              const timeLeft = animationEnd - Date.now();

              if (timeLeft <= 0) {
                return clearInterval(interval);
              }

              const particleCount = 50 * (timeLeft / duration);
              confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
              confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
          });
          confettiFired.current = true;
        }
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 10);

    return () => clearInterval(timer);
  }, [auction?.end_time, auction?.status, getAdjustedNow, isFinished]);

  // Removed fictitiousBidInterval as we now use real DB robot bidding via process_robot_bids RPC 
  // and real-time updates from Supabase.
  useEffect(() => {
    if (auction?.timer_duration) {
      setTimerDuration(auction.timer_duration);
    }
  }, [auction?.timer_duration]);

  async function fetchAuction() {
    // Try to find by UUID first, then by slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    
    let query = supabase
      .from("auctions")
      .select(`
        *,
        product:products(*),
        last_bidder:profiles(username, avatar_url)
      `);

    if (isUuid) {
      query = query.eq("id", id);
    } else {
      query = query.eq("slug", id);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      toast.error("Leilão não encontrado.");
      navigate({ to: "/" });
    } else {
      setAuction(data);
      // Initialize timeLeft immediately
      const isScheduled = data.status === 'scheduled';
      const targetTime = isScheduled ? data.start_time : data.end_time;
      if (targetTime) {
        const target = new Date(targetTime).getTime();
        const now = getAdjustedNow();
        setTimeLeft(Math.max(0, (target - now) / 1000));
      }
    }
    setLoading(false);
  }

  async function fetchBids() {
    if (!auction?.id) return;
    const { data } = await supabase
      .from("bids")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("auction_id", auction.id)
      .order("created_at", { ascending: false })
      .limit(30);
    
    if (data && data.length > 0) {
      setBids(data);
    } else {
      setBids([]);
    }
  }

  const handleBid = async () => {
    try {
      setBidLoading(true);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Você precisa estar logado para dar um lance.");
        navigate({ to: "/auth" });
        return;
      }

      const { data, error } = await supabase.rpc('place_bid', {
        p_auction_id: auction.id
      }) as { data: any, error: any };

      if (error) {
        toast.error(error.message || "Erro ao dar lance");
        return;
      }

      if (data && !data.success) {
        toast.error(data.message || "Erro ao dar lance");
        return;
      }

      playBidSound();
      setIsNewBid(true);
      confettiFired.current = false;
      setShowBonus(true);
      setTimeout(() => setShowBonus(false), 1000);
      setTimeout(() => setIsNewBid(false), 800);
      toast.success("Lance confirmado!");
    } catch (err: any) {
      toast.error("Ocorreu um erro ao processar seu lance.");
      console.error(err);
    } finally {
      setBidLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(var(--color-primary),0.5)]"></div>
    </div>
  );

  if (!auction) return null;



  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      <AuctionVoiceAnnouncements 
        auctionId={auction?.id} 
        auctionName={auction?.product?.name} 
        isLive={auction?.status === 'live'} 
      />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center gap-2 mb-8 text-muted-foreground hover:text-foreground transition-colors">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" />
            Voltar para leilões
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12">
          {/* Left Column: Product Gallery & Description */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-6">
              <div className="relative aspect-square rounded-[32px] overflow-hidden bg-muted/20 border border-border group shadow-2xl flex items-center justify-center">
                <div className="absolute inset-0 z-0">
                  <img 
                    src={auction.product?.images?.[activeImage] || FALLBACK_PRODUCT_IMAGE} 
                    alt={auction.product?.name} 
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                {/* Removed floating foreground image to let background fill the area */}
                <div className="absolute top-6 left-6 z-20 flex flex-col gap-3">
                  {auction.modality && MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG] && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className={`backdrop-blur-md border border-white/10 px-4 py-2 text-lg font-black italic flex items-center gap-2 ${MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]!.bgColor} ${MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]!.color}`}>
                            {(() => {
                              const Icon = MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]!.icon;
                              return <Icon className="w-5 h-5" />;
                            })()}
                            {MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]!.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="bg-zinc-900 border-white/10 text-white p-3 max-w-[250px]">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-xs uppercase text-primary">
                              {MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]!.label}
                            </span>
                            <p className="text-xs text-white/70 leading-relaxed">
                              {MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]!.description}
                              {auction.modality === 'min_balance' && auction.min_balance_required > 0 && (
                                <span className="block mt-1 font-bold text-white">
                                  Saldo Mínimo: {auction.min_balance_required} lances
                                </span>
                              )}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {auction.status === 'finished' ? (
                    <Badge variant="outline" className="bg-background/60 backdrop-blur-md border-border px-4 py-2 text-lg font-black italic">ENCERRADO</Badge>
                  ) : auction.status === 'scheduled' ? (
                    <Badge className="bg-blue-500 border-none px-4 py-2 text-lg font-black italic shadow-[0_0_20px_rgba(59,130,246,0.5)]">AGENDADO</Badge>
                  ) : auction.is_finalizing ? (
                    <Badge className="bg-orange-500 border-none px-4 py-2 text-lg font-black italic shadow-[0_0_20px_rgba(249,115,22,0.5)]">FINALIZANDO</Badge>
                  ) : (
                    <Badge className="bg-red-500 hover:bg-red-600 animate-pulse border-none px-4 py-2 text-lg font-black italic shadow-[0_0_20px_rgba(239,68,68,0.5)]">AO VIVO</Badge>
                  )}
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 backdrop-blur-md px-4 py-2 text-lg font-black italic">
                    {discount}% ECONOMIA
                  </Badge>
                </div>

                {auction.status === 'scheduled' && auction.start_time && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px]">
                    <div className="bg-primary/70 backdrop-blur-md py-8 px-12 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(var(--color-primary),0.3)] border-y border-border rotate-[-2deg] scale-110">
                      <span className="text-sm font-black uppercase tracking-[0.4em] text-foreground mb-3">COMEÇA EM (HORÁRIO DE BRASÍLIA)</span>
                      <div className="flex gap-2">
                        {timeLeft >= 3600 * 24 && (
                          <div className="flex flex-col items-center">
                            <div className="bg-card/90 rounded-xl px-4 py-3 min-w-[70px] flex items-center justify-center shadow-2xl border border-border">
                              <span className="text-4xl font-black text-primary tabular-nums tracking-tighter">
                                {Math.floor(timeLeft / (3600 * 24)).toString().padStart(2, '0')}
                              </span>
                            </div>
                            <span className="text-xs font-black text-muted-foreground mt-1">DIAS</span>
                          </div>
                        )}
                        {timeLeft >= 3600 && (
                          <div className="flex flex-col items-center">
                            <div className="bg-card/90 rounded-xl px-4 py-3 min-w-[70px] flex items-center justify-center shadow-2xl border border-border">
                              <span className="text-4xl font-black text-primary tabular-nums tracking-tighter">
                                {Math.floor((timeLeft % (3600 * 24)) / 3600).toString().padStart(2, '0')}
                              </span>
                            </div>
                            <span className="text-xs font-black text-muted-foreground mt-1">HORAS</span>
                          </div>
                        )}
                        <div className="flex flex-col items-center">
                          <div className="bg-card/90 rounded-xl px-4 py-3 min-w-[70px] flex items-center justify-center shadow-2xl border border-border">
                            <span className="text-4xl font-black text-primary tabular-nums tracking-tighter">
                              {Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                          <span className="text-xs font-black text-muted-foreground mt-1">MIN</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex gap-1">
                            <div className="bg-black/90 rounded-xl px-4 py-3 min-w-[70px] flex items-center justify-center shadow-2xl border border-white/10">
                              <span className="text-4xl font-black text-primary tabular-nums tracking-tighter">
                                {Math.floor(timeLeft % 60).toString().padStart(2, '0')}
                              </span>
                            </div>
                            {timeLeft < 60 && (
                              <div className="bg-card/70 rounded-xl px-2 py-3 flex items-end shadow-2xl border border-border">
                                <span className="text-xl font-black text-primary/80 tabular-nums">
                                  ,{Math.floor((timeLeft % 1) * 100).toString().padStart(2, '0')}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-black text-muted-foreground mt-1">SEG</span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/20 border border-border">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          {new Date(auction.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} às {new Date(auction.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute top-6 right-6 z-20 flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-4 rounded-full bg-background/40 hover:bg-primary/20 border border-border backdrop-blur-md transition-all group/sound"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-primary" />}
                  </Button>
                  <button className="p-4 rounded-full bg-background/40 hover:bg-primary/20 border border-border backdrop-blur-md transition-all group/share">
                    <Share2 className="w-5 h-5 text-foreground transition-transform group-hover/share:scale-110" />
                  </button>
                </div>
              </div>

              {auction.product?.images && auction.product.images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {auction.product.images.map((img: string, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={`relative w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0 snap-start ${activeImage === idx ? 'border-primary shadow-[0_0_15px_rgba(var(--color-primary),0.3)]' : 'border-border opacity-50 hover:opacity-100 hover:border-border/60'}`}
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

            <Card className="bg-card border-border overflow-hidden rounded-3xl">
              <Tabs defaultValue="description" className="w-full">
                <TabsList className="w-full grid grid-cols-2 bg-muted p-1">
                  <TabsTrigger value="description" className="rounded-2xl py-3 font-bold">DESCRIÇÃO</TabsTrigger>
                  <TabsTrigger value="rules" className="rounded-2xl py-3 font-bold">REGRAS DO LEILÃO</TabsTrigger>
                </TabsList>
                <div className="p-8">
                  <TabsContent value="description" className="mt-0 space-y-6">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Sobre o <span className="text-primary">Produto</span></h2>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      {auction.product?.description || "Este produto incrível pode ser seu por uma fração do preço original. Participe da disputa e arremate agora!"}
                    </p>
                    <div className="grid grid-cols-2 gap-6 pt-6">
                      <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                        <span className="block text-xs text-muted-foreground font-bold uppercase mb-1">Valor de Mercado</span>
                        <span className="text-xl font-bold">R$ {auction.product?.market_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                        <span className="block text-xs text-muted-foreground font-bold uppercase mb-1">Categoria</span>
                        <span className="text-xl font-bold">{auction.product?.category || "Eletrônicos"}</span>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="rules" className="mt-0 space-y-4">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Como <span className="text-primary">Ganhar</span></h2>
                    <ul className="space-y-4 text-muted-foreground">
                      <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                        <p>Cada lance aumenta o preço do produto em <span className="text-foreground font-bold">R$ 0,01</span>.</p>
                      </li>
                      <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                        <p>Cada lance reinicia o cronômetro para <span className="text-foreground font-bold">{timerDuration} segundos</span>.</p>
                      </li>
                      <li className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                        <p>O último usuário a dar o lance quando o tempo chegar a <span className="text-foreground font-bold">00:00</span> vence!</p>
                      </li>
                    </ul>
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>

          {/* Right Column: Bidding Controls & History */}
          <div className="lg:col-span-5 space-y-8">
            <Card className="bg-card border-primary/40 p-8 md:p-10 rounded-[48px] relative overflow-hidden shadow-[0_0_50px_rgba(var(--color-primary),0.15)] backdrop-blur-3xl group/card border-2">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(var(--color-primary),0.15),_transparent_70%)]"></div>
              <div className="absolute -inset-[100%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_150deg,rgba(var(--color-primary),0.1)_180deg,transparent_210deg)] animate-[spin_8s_linear_infinite]"></div>

              {/* Animated Background Highlight */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] transition-all duration-1000 group-hover/card:bg-primary/20" />
              
              <div className="absolute top-0 right-0 p-10 text-primary/20 animate-float">
                <Trophy className="w-56 h-56 rotate-12 drop-shadow-[0_0_40px_rgba(var(--color-primary),0.6)]" />
              </div>
              
              <div className="relative z-10 space-y-10">
                <div className="space-y-2">
                  <Badge variant="outline" className="border-primary/30 text-primary font-bold tracking-widest text-[10px] uppercase bg-primary/5">ITEM EM DISPUTA</Badge>
                  <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-tight text-foreground drop-shadow-sm">
                    {auction.product?.name}
                  </h1>
                  <p className="text-muted-foreground font-bold text-xs tracking-widest uppercase">REF: {id.substring(0, 8).toUpperCase()}</p>
                </div>

                <div className="flex flex-col gap-3 p-8 rounded-[32px] bg-gradient-to-br from-muted/50 to-transparent border border-border backdrop-blur-xl shadow-inner group/price">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">Valor de Arremate</span>
                      <span className="text-[10px] text-primary/60 font-bold uppercase tracking-widest">(O quanto você pagará no final)</span>
                    </div>
                    <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/5 animate-pulse">LEILÃO DE CENTAVOS</Badge>
                  </div>
                  <div className={`text-7xl font-black text-primary transition-all duration-500 flex items-baseline ${isNewBid ? 'scale-110 drop-shadow-[0_0_50px_rgba(var(--color-primary),1)]' : 'scale-100 drop-shadow-[0_0_30px_rgba(var(--color-primary),0.6)]'}`}>
                    <span className="text-3xl align-top mt-2 inline-block mr-2 opacity-60">R$</span>
                    {auction.status === 'scheduled' ? '0,00' : (auction.current_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))}
                  </div>
                </div>

                <div className="relative space-y-4">
                  <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div className={`flex flex-col gap-3 p-6 rounded-[28px] bg-muted/30 border border-border transition-all duration-300 ${
                      timeLeft <= 8 && !isFinished ? 'bg-red-500/5 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : ''
                    }`}>
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-2">
                        <Clock className={`w-3 h-3 ${timeLeft <= 8 && !isFinished ? 'text-red-500 animate-spin' : 'text-primary'}`} /> Tempo Restante
                      </span>
                      <div className="flex items-center gap-2">
                        <div className={`relative flex items-center justify-center min-w-[80px] py-3 px-4 rounded-2xl border border-border overflow-hidden transition-all duration-300 ${
                          timeLeft <= 8 && !isFinished 
                            ? 'bg-gradient-to-br from-red-600 to-red-900 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' 
                            : 'bg-gradient-to-br from-card to-muted shadow-2xl'
                        }`}>
                          <span className={`text-4xl font-black tabular-nums tracking-tighter ${
                            timeLeft <= 8 && !isFinished ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]' : 'text-foreground'
                          }`}>
                            {isFinished ? "00:00" : (
                              <>
                                {timeLeft >= 3600 && (
                                  <span className="text-2xl mr-1">
                                    {Math.floor(timeLeft / 3600).toString().padStart(2, '0')}:
                                  </span>
                                )}
                                {Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0')}:
                                {Math.floor(timeLeft % 60).toString().padStart(2, '0')}
                              </>
                            )}
                          </span>
                          {timeLeft <= 8 && !isFinished && (
                            <div className="absolute inset-0 bg-white/5 shadow-[inset_0_0_30px_rgba(255,255,255,0.2)]"></div>
                          )}
                        </div>
                        <div className={`flex items-end py-2 px-2 rounded-xl border border-border bg-muted ${
                          timeLeft <= 8 && !isFinished ? 'border-red-500/30' : ''
                        }`}>
                          <span className={`text-xl font-black tabular-nums ${
                            timeLeft <= 8 && !isFinished ? 'text-red-400' : 'text-muted-foreground'
                          }`}>
                            ,{isFinished ? "00" : Math.floor((timeLeft % 1) * 100).toString().padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 p-6 rounded-[28px] bg-muted/30 border border-border transition-colors hover:bg-muted/50">
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-2">
                        <History className="w-3 h-3 text-primary" /> Total de Lances
                      </span>
                      <div className="text-5xl font-black text-foreground">
                        {auction.bid_count || 0}
                      </div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Duração: {timerDuration}s
                      </div>
                    </div>
                  </div>
                  
                  {/* Time Bar */}
                  {!isFinished && (
                    <div className="px-1">
                      <Progress 
                        value={(timeLeft / timerDuration) * 100} 
                        className={`h-2 bg-muted transition-all duration-1000 ${
                          timeLeft <= 5 ? 'bg-red-500/20' : ''
                        }`}
                        indicatorClassName={`${
                          timeLeft <= 5 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : timeLeft <= 10 ? 'bg-orange-500' : 'bg-primary shadow-[0_0_15px_rgba(var(--color-primary),0.5)]'
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div className={`p-6 rounded-[28px] flex items-center justify-between group/bidder transition-all duration-500 border ${
                  isNewBid 
                    ? 'bg-primary/30 border-primary shadow-[0_0_30px_rgba(var(--color-primary),0.6)] animate-pulse' 
                    : 'bg-muted/30 border-border hover:bg-muted/50'
                }`}>
                  <div className="flex items-center gap-4">
                    <div 
                      key={auction.last_bidder_id || 'no-bidder'}
                      className={`w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 shadow-lg border-2 transition-all duration-500 ${
                        isNewBid ? 'border-primary scale-110' : 'border-primary/20'
                      }`}
                    >
                      {auction.last_bidder ? (
                        <img 
                          src={auction.last_bidder?.avatar_url || getFallbackAvatarUrl(auction.last_bidder?.username)} 
                          className="w-full h-full object-cover" 
                          alt="Bidder"
                          onError={(e) => (e.target as HTMLImageElement).src = getFallbackAvatarUrl(auction.last_bidder?.username)}
                        />
                      ) : (
                        <div className="bg-primary/10 w-full h-full flex items-center justify-center">
                          <User className="w-6 h-6 text-primary/40" />
                        </div>
                      )}
                    </div>
                    <div>
                      <span className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-1 leading-none transition-colors ${isNewBid ? 'text-primary' : isFinished ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {isFinished || isConfirmed || isPendingAudit ? "Grande Arrematador" : "Liderando Agora"}
                      </span>
                      <span className={`text-xl font-black transition-all italic uppercase ${isNewBid ? 'text-primary scale-105 origin-left' : isFinished ? 'text-green-500' : 'text-foreground group-hover/bidder:text-primary'}`}>
                        {auction.last_bidder?.username || (isFinished ? "Encerrado" : "Nenhum lance")}
                      </span>
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
                    className={`w-full h-24 text-xl font-black uppercase italic tracking-tighter transition-all rounded-[32px] group/btn relative overflow-hidden ${
                      isFinished 
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20 cursor-default' 
                        : timeLeft <= 5
                        ? 'bg-red-600 text-white shadow-[0_0_60px_rgba(220,38,38,1)] scale-[1.05] animate-pulse border-white/20 border-2'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_20px_50px_rgba(var(--color-primary),0.6)] hover:-translate-y-1 active:translate-y-1'
                    }`}
                  >
                    {!isFinished && (
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:animate-shimmer" 
                           style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
                    )}
                    
                    {bidLoading ? <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" /> : isFinished ? (
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span className="text-sm font-black uppercase tracking-[0.4em] text-green-500/50 mb-1">ARREMATADO EM</span>
                        <span className="text-2xl font-black italic">
                          {auction.end_time ? format(new Date(auction.end_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "CONCLUÍDO"}
                        </span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-4 relative z-10">
                        {isPendingAudit ? "ARREMATADO" : (timeLeft <= 5 ? "VAI PERDER..." : "DAR LANCE")} <Zap className={`w-8 h-8 fill-current ${timeLeft <= 5 ? 'animate-bounce' : 'animate-pulse'}`} />
                      </span>
                    )}
                  </Button>
                  
                  <p className="text-center text-[10px] text-muted-foreground/30 uppercase tracking-[0.3em] font-black">
                    CUSTO POR LANCE: 1 CRÉDITO
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-card border-border rounded-[32px] overflow-hidden shadow-xl backdrop-blur-xl group/history">
              <div className="p-8 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <History className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-black text-sm uppercase tracking-[0.2em] text-foreground">Histórico de <span className="text-primary">Lances</span></h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground font-bold px-3">LIVE FEED</Badge>
                </div>
              </div>
              <div className="p-4">
                {bids.length > 0 ? (
                  <div className="space-y-2">
                    {(showAllBids ? bids : bids.slice(0, 10)).map((bid, idx) => (
                      <div key={bid.id} className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 animate-in fade-in slide-in-from-right-2 ${idx === 0 ? 'bg-primary/20 border border-primary/30 shadow-[0_0_20px_rgba(var(--color-primary),0.1)]' : 'hover:bg-muted/50 border border-transparent'}`}>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className={`w-8 h-8 border-2 transition-all ${idx === 0 ? 'border-primary scale-110 shadow-lg' : 'border-border'}`}>
                              <AvatarImage src={bid.profile?.avatar_url || getFallbackAvatarUrl(bid.profile?.username)} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                                {bid.profile?.username?.substring(0, 2).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className={`font-black text-xs uppercase italic tracking-tighter ${idx === 0 ? 'text-foreground' : 'text-foreground/60'}`}>{bid.profile?.username}</span>
                              {idx === 0 && <Badge className="h-3 px-1 text-[7px] font-black bg-primary text-primary-foreground animate-pulse">LIDERANDO</Badge>}
                            </div>
                            <span className="text-[8px] text-muted-foreground font-bold uppercase">{new Date(bid.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono text-sm font-black block ${idx === 0 ? 'text-primary' : 'text-muted-foreground'}`}>R$ {bid.price_at_bid?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    ))}
                    
                    {bids.length > 10 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-4 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 h-10 border border-primary/20 rounded-xl"
                        onClick={() => setShowAllBids(!showAllBids)}
                      >
                        {showAllBids ? "Ver menos lances" : `Ver últimos ${bids.length} lances`}
                      </Button>
                    )}
                  </div>
                ) : (
                   <div className="py-20 text-center space-y-4">
                    <div className="inline-flex p-4 rounded-full bg-muted text-muted-foreground/10">
                      <Gavel className="w-12 h-12" />
                    </div>
                    <p className="text-muted-foreground/30 font-black uppercase tracking-[0.2em] italic text-sm">
                      Aguardando lance inicial...
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <div className="h-[500px] rounded-[40px] overflow-hidden border border-border">
              {mounted && <AuctionChat auctionId={id} />}
            </div>
          </div>
        </div>
      </main>
      
      {/* Trust Badges */}
      <section className="py-24 border-t border-border bg-muted/40 relative overflow-hidden">
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
      <div className="p-6 rounded-[24px] bg-card border border-border transition-all duration-500 group-hover/trust:bg-primary/10 group-hover/trust:border-primary/20 group-hover/trust:-translate-y-2 shadow-lg">
        <div className="transition-transform duration-500 group-hover/trust:scale-110">
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="font-black text-foreground uppercase tracking-[0.2em] text-[10px] italic">{title}</h4>
        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest leading-tight max-w-[120px]">{desc}</p>
      </div>
    </div>
  );
}
