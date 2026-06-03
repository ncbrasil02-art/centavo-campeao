import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useTimeSync } from "@/hooks/useTimeSync";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Clock, User, MessageSquare, Zap, Eye, Volume2, VolumeX, Calendar, ShieldCheck, Trophy, Wallet, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AuctionChat } from "./AuctionChat";
import { toast } from "sonner";
import { FALLBACK_PRODUCT_IMAGE, getFallbackAvatarUrl, FICTITIOUS_PARTICIPANTS, MODALITY_CONFIG } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRecentWinners } from "@/hooks/useRecentWinners";


const BID_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";

let CACHED_INCENTIVES: string[] = [];

const INCENTIVE_PHRASES = [
  "🔥 Este produto é o máximo!",
  "👀 Tem poucas pessoas disputando!",
  "💎 Quanto maior o pacote, mais chances!",
  "⚡ Não deixe essa chance passar!",
  "🏆 Alguém vai levar por quase nada!",
  "🚀 O próximo lance pode ser o vencedor!",
  "😱 Economia de mais de 90% garantida!",
  "✨ Super oferta exclusiva de hoje!",
  "📱 Últimas unidades em leilão!",
  "🎮 O melhor custo-benefício está aqui!"
];

interface AuctionCardProps {
  auction: any;
}

export function AuctionCard({ auction: initialAuction }: AuctionCardProps) {
  const [auction, setAuction] = useState(initialAuction);
  const [timeLeft, setTimeLeft] = useState(0); 
  const [timerDuration, setTimerDuration] = useState(initialAuction.timer_duration || 15);
  const [isNewBid, setIsNewBid] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [incentivePhrase, setIncentivePhrase] = useState("");
  const [activeWatchers, setActiveWatchers] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const confettiFired = useRef(false);
  const { getAdjustedNow, formatBrasiliaTime } = useTimeSync();
  const { currentWinner, hasWinners } = useRecentWinners();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);


  const isFinished = auction.status === 'finished';
  const isScheduled = auction.status === 'scheduled';
  const isPendingAudit = auction.status === 'pending_audit';
  const isConfirmed = auction.status === 'confirmed';
  const isFinalizing = auction.is_finalizing;
  
  const discount = auction.product?.market_value 
    ? Math.round((1 - (auction.current_price / auction.product.market_value)) * 100)
    : 0;


  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        const { data } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();
        setIsAdmin(!!data?.is_admin);
      }
    }
    checkUser();
  }, []);


  useEffect(() => {
    async function loadIncentives() {
      if (CACHED_INCENTIVES.length > 0) {
        setIncentivePhrase(CACHED_INCENTIVES[Math.floor(Math.random() * CACHED_INCENTIVES.length)]);
        return;
      }
      const { data } = await supabase
        .from("app_phrases")
        .select("text")
        .eq("type", "incentive")
        .eq("active", true);
      
      const phrases = (data && data.length > 0) ? data.map(p => p.text) : INCENTIVE_PHRASES;
      CACHED_INCENTIVES = phrases;
      setIncentivePhrase(phrases[Math.floor(Math.random() * phrases.length)]);
    }

    loadIncentives();
    setActiveWatchers(Math.floor(Math.random() * 45) + 12);
    
    // Rotate phrases every 8-12 seconds
    const interval = setInterval(() => {
      const phrases = CACHED_INCENTIVES.length > 0 ? CACHED_INCENTIVES : INCENTIVE_PHRASES;
      setIncentivePhrase(phrases[Math.floor(Math.random() * phrases.length)]);
      setActiveWatchers(prev => {
        const change = Math.floor(Math.random() * 7) - 3;
        return Math.max(5, prev + change);
      });
    }, Math.random() * 4000 + 8000);

    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    audioRef.current = new Audio(BID_SOUND_URL);
    audioRef.current.load();
  }, []);

  const playBidSound = useCallback(() => {
    if (audioRef.current && !isMuted) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.error("Error playing sound:", err));
    }
  }, [isMuted]);

  // Play sound when auction updates (e.g. real-time bid from others)
  const lastPriceRef = useRef<number>(auction.current_price);
  const lastBidderIdRef = useRef<string | null>(auction.last_bidder?.id || null);

  const playSurpassedSound = useCallback(() => {
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
    if (mounted && auction.current_price > lastPriceRef.current) {
      // Someone bid. Check if I was the previous last bidder and now I'm not.
      if (currentUserId && lastBidderIdRef.current === currentUserId && auction.last_bidder?.id !== currentUserId) {
        playSurpassedSound();
      } else {
        playBidSound();
      }
    }
    lastPriceRef.current = auction.current_price;
    lastBidderIdRef.current = auction.last_bidder?.id;
  }, [auction.current_price, auction.last_bidder?.id, playBidSound, playSurpassedSound, mounted, currentUserId]);



  useEffect(() => {
    setAuction(initialAuction);
    if (initialAuction.timer_duration) {
      setTimerDuration(initialAuction.timer_duration);
    }
  }, [initialAuction]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!auction?.id) return;

    // Realtime subscription for THIS auction
    const channel = supabase
      .channel(`auction_${auction.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'auctions',
          filter: `id=eq.${auction.id}`
        },
        async (payload) => {
          console.log('Auction update:', payload);
          // Fetch full data to get nested relations (last_bidder)
          const { data } = await supabase
            .from("v_home_live_auctions")
            .select("*")
            .eq("id", auction.id)
            .single();
          
          if (data) {
            setIsNewBid(true);
            setAuction(data);
            // Calculate remaining time from server time
            if (data.end_time) {
              const end = new Date(data.end_time).getTime();
              const now = getAdjustedNow();
              setTimeLeft(Math.max(0, (end - now) / 1000));
            }
            
            setTimeout(() => setIsNewBid(false), 800);
          }
        }
      )
      .subscribe();

    // Timer logic based on the actual end_time (or start_time for scheduled)
    let isRefreshing = false;
    const timer = setInterval(async () => {
      const targetTime = isScheduled ? auction.start_time : auction.end_time;
      if (!targetTime) return;
      
      const target = new Date(targetTime).getTime();
      const now = getAdjustedNow();
      const diff = Math.max(0, (target - now) / 1000);
      
      setTimeLeft(diff);

      // Transition check: if scheduled and timer is zero, force a status check
      if (isScheduled && diff <= 0 && !isRefreshing) {
        isRefreshing = true;
        console.log("Scheduled auction reached zero, initiating server tick...");
        
        try {
          // Call tick_auctions to ensure server status is updated
          await supabase.rpc('tick_auctions');
          
          // Re-fetch to get updated status and timing
          const { data, error } = await supabase
            .from("auctions")
            .select("*, product:products(*), last_bidder:profiles(*)")
            .eq("id", auction.id)
            .single();
          
          if (data && data.status !== 'scheduled') {
            console.log("Auction is now live:", data);
            setAuction(data);
            if (data.end_time) {
              const newEnd = new Date(data.end_time).getTime();
              const newNow = getAdjustedNow();
              setTimeLeft(Math.max(0, (newEnd - newNow) / 1000));
            }
          } else if (error) {
            console.error("Error refreshing auction:", error);
          }
        } catch (err) {
          console.error("Failed to tick/refresh auction:", err);
        } finally {
          isRefreshing = false;
        }
      }

      if (!isScheduled && diff <= 0 && !confettiFired.current && auction.status === 'live') {
        // ... confetti logic if needed
      }
    }, 10); // Run more frequently for decimal precision

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [auction.id, isScheduled, getAdjustedNow, auction.start_time, auction.end_time, auction.status]);

  const handleBid = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Você precisa estar logado para dar lances!");
      // Redireciona para o cadastro rápido conforme solicitado
      window.location.href = "/auth?register=true&offer=welcome_bids";
      return;
    }

    // Verificar saldo antes de tentar dar o lance
    const { data: profile } = await supabase
      .from("profiles")
      .select("bid_balance")
      .eq("id", session.user.id)
      .single();

    if (!profile || (profile.bid_balance || 0) <= 0) {
      toast.info("Você não tem lances suficientes!", {
        description: "Aproveite nossa oferta de pacote de lances com desconto!",
        action: {
          label: "Comprar Agora",
          onClick: () => window.location.href = "/packages"
        },
        duration: 8000
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('place_bid', {
        p_auction_id: auction.id
      });

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        if (result.message.includes("lances") || result.message.includes("balance")) {
          toast.info("Lances esgotados!", {
            description: "Garanta agora um pacote com 50% de desconto para continuar na disputa!",
            action: {
              label: "Ver Ofertas",
              onClick: () => window.location.href = "/packages"
            }
          });
        } else {
          toast.error(result.message);
        }
      } else {
        toast.success("Lance realizado com sucesso!");
        playBidSound();
        setIsNewBid(true);
        setShowBonus(true);
        setTimeout(() => setShowBonus(false), 1000);
        setTimeout(() => setIsNewBid(false), 800);
      }
    } catch (err: any) {
      console.error("Error bidding:", err);
      toast.error(err.message || "Erro ao realizar lance.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmWinner = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('confirm_auction_winner', {
        p_auction_id: auction.id
      });
      if (error) throw error;
      const result = data as any;
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao confirmar ganhador");
    } finally {
      setLoading(false);
    }
  };


  const formatTimeParts = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return {
      d: d.toString().padStart(2, '0'),
      h: h.toString().padStart(2, '0'),
      m: m.toString().padStart(2, '0'),
      s: s.toString().padStart(2, '0'),
      ms: ms.toString().padStart(2, '0'),
      totalSeconds: seconds
    };
  };

  const timeParts = formatTimeParts(timeLeft);

  const timePercentage = (timeLeft / timerDuration) * 100;

  return (
    <Card className={`group relative flex flex-col h-full overflow-hidden rounded-[32px] border-glass-border bg-glass backdrop-blur-md transition-all duration-500 hover:border-primary/50 hover:shadow-[0_0_40px_rgba(var(--color-primary),0.3)] border-2 ${!isFinished && !isScheduled ? 'animate-float-slow' : ''} ${auction.modality && MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]?.effect || ''}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(var(--color-primary),0.05),_transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      {/* Modality Icon */}
      {auction.modality && MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG] && (
        <div className="absolute top-4 left-4 z-30">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 ${MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]!.bgColor} ${MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]!.color} cursor-help transition-transform hover:scale-110`}>
                  {(() => {
                    const Icon = MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]!.icon;
                    return <Icon className="w-4 h-4" />;
                  })()}
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]!.label}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-white/10 text-white p-3 max-w-[200px]">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-xs uppercase text-primary">
                    {MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]!.label}
                  </span>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    {MODALITY_CONFIG[auction.modality as keyof typeof MODALITY_CONFIG]!.description}
                    {auction.modality === 'min_balance' && auction.min_balance_required > 0 && (
                      <span className="block mt-1 font-bold text-white">
                        Mínimo: {auction.min_balance_required} lances
                      </span>
                    )}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      {/* Product Image Section */}
      <div className="relative aspect-square overflow-hidden rounded-t-[32px]">
        <Link to="/auctions/$id" params={{ id: auction.id }} className="block h-full w-full cursor-pointer">
          <img 
            src={auction.product?.images?.[0] || FALLBACK_PRODUCT_IMAGE} 
            alt={auction.product?.name} 
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-60"></div>
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
            <div className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-black text-primary-foreground shadow-xl transition-transform translate-y-4 group-hover:translate-y-0">
              <Eye className="h-4 w-4" />
              VER DETALHES
            </div>
          </div>
        </Link>

        {isScheduled && auction.start_time && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-primary/40 backdrop-blur-[2px] py-3 flex flex-col items-center justify-center z-20 shadow-[0_0_40px_rgba(var(--color-primary),0.2)] border-y border-glass-border rotate-[-2deg] scale-105 origin-center transition-all duration-500 group-hover:bg-primary/60 group-hover:backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.1)_0%,_transparent_70%)] animate-pulse"></div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-foreground mb-1 relative z-10">COMEÇA EM (HORÁRIO DE BRASÍLIA)</span>
            <div className="flex flex-col items-center relative z-10">
              <div className="flex gap-1 mb-1">
                {timeLeft >= 3600 * 24 && (
                  <div className="flex flex-col items-center">
                    <div className="bg-card/80 rounded-lg px-2 py-1.5 min-w-[45px] flex items-center justify-center shadow-xl border border-glass-border">
                      <span className="text-xl font-black text-primary tabular-nums tracking-tighter">
                        {timeParts.d}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground mt-0.5">DIAS</span>
                  </div>
                )}
                {timeLeft >= 3600 && (
                  <div className="flex flex-col items-center">
                    <div className="bg-card/80 rounded-lg px-2 py-1.5 min-w-[45px] flex items-center justify-center shadow-xl border border-glass-border">
                      <span className="text-xl font-black text-primary tabular-nums tracking-tighter">
                        {timeParts.h}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground mt-0.5">HORAS</span>
                  </div>
                )}
                <div className="flex flex-col items-center">
                  <div className="bg-card/80 rounded-lg px-2 py-1.5 min-w-[45px] flex items-center justify-center shadow-xl border border-glass-border">
                    <span className="text-xl font-black text-primary tabular-nums tracking-tighter">
                      {timeParts.m}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground mt-0.5">MIN</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex gap-0.5">
                    <div className="bg-card/80 rounded-lg px-2 py-1.5 min-w-[45px] flex items-center justify-center shadow-xl border border-glass-border">
                      <span className="text-xl font-black text-primary tabular-nums tracking-tighter">
                        {timeParts.s}
                      </span>
                    </div>
                    {timeLeft < 60 && (
                      <div className="bg-card/60 rounded-lg px-1.5 py-1.5 flex items-end shadow-xl border border-glass-border">
                        <span className="text-sm font-black text-primary/80 tabular-nums">
                          ,{timeParts.ms}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground mt-0.5">SEG</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-glass/20 border border-glass-border">
                  <Calendar className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {new Date(auction.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {new Date(auction.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-4 top-4 flex flex-col gap-2">
          {isFinished ? (
            <Badge variant="outline" className="border-glass-border bg-glass/60 px-3 py-1 text-muted-foreground backdrop-blur-md font-bold uppercase italic">
              ENCERRADO
            </Badge>
          ) : isPendingAudit ? (
            <Badge className="bg-red-600 border-none px-3 py-1 text-white font-bold uppercase italic shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse">
              ARREMATADO
            </Badge>
          ) : isConfirmed ? (
            <Badge className="bg-green-500 border-none px-3 py-1 text-white font-bold uppercase italic shadow-[0_0_20px_rgba(34,197,94,0.5)]">
              CONFIRMADO
            </Badge>
          ) : isScheduled ? (
            <Badge className="bg-blue-500 px-3 py-1 text-white backdrop-blur-md font-bold uppercase italic shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              AGENDADO
            </Badge>
          ) : isFinalizing ? (
            <Badge className="bg-orange-500 border-none px-3 py-1 text-white font-bold uppercase italic shadow-[0_0_20px_rgba(249,115,22,0.5)]">
              FINALIZANDO
            </Badge>
          ) : (
            <Badge className="animate-pulse border-none bg-red-500 px-3 py-1 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:bg-red-600 font-bold uppercase italic">
              AO VIVO
            </Badge>
          )}

          {!isFinished && discount > 0 && (
            <Badge variant="secondary" className="border-primary/30 bg-primary/20 px-3 py-1 font-bold text-primary backdrop-blur-md">
              {discount}% OFF
            </Badge>
          )}
        </div>
        
        {/* Controls (Floating on Image) */}
        <div className="absolute right-4 top-4 flex flex-col gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-10 w-10 rounded-full border border-glass-border bg-glass backdrop-blur-md transition-all hover:bg-primary/20 hover:text-primary text-muted-foreground"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full border-border bg-background p-0 sm:max-w-md">
              <SheetHeader className="border-b border-border p-4">
                <SheetTitle className="font-black italic uppercase tracking-tighter text-foreground">
                  Chat do <span className="text-primary">Leilão</span>
                </SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100vh-80px)]">
                {mounted && <AuctionChat auctionId={auction.id} isFinished={isFinished} />}
              </div>
            </SheetContent>
          </Sheet>

          <Button 
            size="icon" 
            variant="ghost" 
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="h-10 w-10 rounded-full border border-border bg-background/40 text-muted-foreground backdrop-blur-md transition-all hover:bg-primary/20 hover:text-primary"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="relative flex flex-1 flex-col gap-4 bg-gradient-to-b from-foreground/[0.02] to-transparent p-6 pt-2">
        {!isFinished && !isScheduled && (
          <div className="flex justify-center mb-1">
            <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest animate-pulse italic bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
              {incentivePhrase}
            </span>
          </div>
        )}
        <div>
          <Link to="/auctions/$id" params={{ id: auction.id }} className="cursor-pointer">
            <h3 className="mb-1 line-clamp-1 text-xl font-black uppercase italic tracking-tighter text-foreground transition-colors group-hover:text-primary">
              {auction.product?.name || "Produto"}
            </h3>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Valor Original:
            </span>
            <span className="text-xs font-bold text-muted-foreground/80 line-through">
              R$ {auction.product?.market_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}
            </span>
          </div>
          {!isFinished && !isScheduled && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {activeWatchers} pessoas disputando agora
              </span>
            </div>
          )}
        </div>

        <div className="relative space-y-2">
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-muted/30 p-4 backdrop-blur-sm relative z-10">
            <div className="flex flex-col">
              <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                {(isFinished || isConfirmed || isPendingAudit) ? "Valor do Arremate:" : "Você paga:"}
              </span>
              <span className={`text-2xl font-black text-primary transition-all duration-300 ${isNewBid ? 'scale-110 drop-shadow-[0_0_10px_rgba(var(--color-primary),0.5)]' : 'scale-100'}`}>
                R$ {auction.current_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,01"}
              </span>
            </div>
            <div className={`relative flex flex-col items-end transition-all duration-300 ${(timeLeft <= 8 || isPendingAudit) && !isFinished && !isConfirmed ? 'drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' : isConfirmed ? 'drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]' : ''}`}>
              <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                Tempo
              </span>
              <div className="flex items-center gap-1.5">
                <div className={`relative flex items-center justify-center min-w-[50px] py-1.5 rounded-xl border border-border overflow-hidden transition-all duration-300 ${
                  (timeLeft <= 8 || isPendingAudit) && !isFinished && !isConfirmed
                    ? 'bg-gradient-to-br from-red-600 to-red-900 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' 
                    : isConfirmed
                    ? 'bg-gradient-to-br from-green-600 to-green-900 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                    : 'bg-gradient-to-br from-background to-muted shadow-2xl'
                }`}>
                  <span className={`text-2xl font-black tabular-nums tracking-tighter ${
                    (timeLeft <= 8 || isPendingAudit) && !isFinished && !isConfirmed ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-foreground'
                  }`}>
                    {isFinished || isPendingAudit || isConfirmed ? "00:00" : (

                      <>
                        {timeLeft >= 3600 && (
                          <span className="text-lg mr-0.5">
                            {timeParts.h}:
                          </span>
                        )}
                        {timeLeft >= 60 && (
                          <span>{timeParts.m}:</span>
                        )}
                        {timeParts.s}
                      </>
                    )}
                  </span>
                  {timeLeft <= 8 && !isFinished && (
                    <div className="absolute inset-0 bg-red-500/10 shadow-[inset_0_0_20px_rgba(239,68,68,0.4)]"></div>
                  )}
                </div>
                <div className={`flex items-end py-1.5 px-1.5 rounded-lg border border-border bg-muted ${
                   timeLeft <= 8 && !isFinished ? 'border-red-500/20' : ''
                }`}>
                  <span className={`text-sm font-black tabular-nums ${
                    timeLeft <= 8 && !isFinished ? 'text-red-400' : 'text-muted-foreground/50'
                  }`}>
                    ,{isFinished ? "00" : timeParts.ms}
                  </span>
                </div>
              </div>
              {showBonus && (
                <div className="absolute -top-8 right-0 animate-bounce rounded-lg border border-primary/30 bg-primary/20 px-2 py-1 text-[10px] font-black text-primary backdrop-blur-sm">
                  +{timerDuration}s RESET
                </div>
              )}
            </div>
          </div>
          
          {/* Time Bar */}
          {!isFinished && (
            <div className="px-1">
              <Progress 
                value={timePercentage} 
                className={`h-1.5 bg-muted transition-all duration-1000 ${
                  timeLeft <= 5 ? 'bg-red-500/20' : ''
                }`}
                indicatorClassName={`${
                  timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-orange-500' : 'bg-primary'
                }`}
              />
            </div>
          )}
        </div>

        {/* Highlighted Last Bidder */}
        <div className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-500 border ${
          isNewBid 
            ? 'bg-primary/30 border-primary shadow-[0_0_20px_rgba(var(--color-primary),0.5)] animate-pulse' 
            : 'bg-muted/30 border-border'
        }`}>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border transition-all duration-500 ${
            isNewBid ? 'border-primary scale-110' : 'border-primary/20'
          }`}>
            <img 
              src={
                (isScheduled || !auction.last_bidder?.username)
                  ? getFallbackAvatarUrl(undefined)
                  : (auction.last_bidder?.avatar_url || getFallbackAvatarUrl(auction.last_bidder?.username))
              } 
              className={`h-full w-full object-cover transition-opacity duration-500 ${isNewBid ? 'opacity-100' : 'opacity-90'}`} 
              alt="Bidder" 
              onError={(e) => (e.target as HTMLImageElement).src = getFallbackAvatarUrl(auction.last_bidder?.username)}
            />
          </div>

          <div className="flex flex-col overflow-hidden">
            <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${
              isNewBid ? 'text-primary' : (isFinished || isConfirmed) ? 'text-green-500' : isPendingAudit ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {(isFinished || isConfirmed) ? "🏆 Vencedor" : isPendingAudit ? "🔍 Em Auditoria" : (isScheduled || !auction.last_bidder?.username) ? "Aguardando Início" : "Último Lance"}
            </span>
            <span className={`truncate text-sm font-bold transition-all ${
              isNewBid ? 'text-primary scale-105 origin-left' : (isFinished || isConfirmed) ? 'text-green-500' : isPendingAudit ? 'text-red-400' : 'text-foreground'
            }`}>
              {auction.last_bidder?.username || ((isScheduled || !auction.last_bidder?.username) ? (
                <span className="italic text-muted-foreground/50">Nenhum lance ainda</span>
              ) : "Aguardando...")}
            </span>

          </div>
          {isNewBid && (
            <div className="ml-auto">
              <Zap className="h-4 w-4 text-primary animate-pulse" />
            </div>
          )}
        </div>

        <Button 
          onClick={(e) => {
            e.stopPropagation();
            if (!isFinished && !isScheduled && !isPendingAudit && !isConfirmed) {
              handleBid();
            }
          }} 

          disabled={loading || (isFinished || isScheduled || isConfirmed || (isPendingAudit && !isAdmin))}
          className={`h-14 w-full rounded-2xl text-base font-black uppercase italic tracking-tighter transition-all relative overflow-hidden group/bidbtn ${
            isFinished || isConfirmed
              ? 'cursor-default border border-green-500/20 bg-green-500/10 text-green-500' 
              : isPendingAudit
              ? (isAdmin ? 'bg-primary text-primary-foreground shadow-[0_0_25px_rgba(var(--color-primary),0.5)] hover:scale-[1.02]' : 'cursor-default border border-red-500/20 bg-red-500/10 text-red-500 animate-pulse')
              : isScheduled
              ? 'cursor-not-allowed border border-border bg-muted text-muted-foreground'
              : timeLeft <= 5
              ? 'bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.8)] hover:bg-red-700'
              : 'bg-primary text-primary-foreground shadow-[0_8px_25px_rgba(var(--color-primary),0.3)] hover:scale-[1.02] hover:bg-primary/90 active:scale-95'
          }`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] group-hover/bidbtn:animate-[shimmer_1.5s_infinite]"></div>
          {loading ? "..." : isFinished || isConfirmed ? (
            <div className="flex flex-col items-center justify-center leading-tight gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500/80">
                Arrematado por {auction.last_bidder?.username || "Ganhador"}
              </span>
              <span className="text-xs font-black italic text-muted-foreground/60">
                {isConfirmed ? "Ganhador Confirmado" : (auction.end_time ? formatBrasiliaTime(new Date(auction.end_time), "dd/MM 'às' HH:mm") : "Finalizado")}
              </span>
            </div>
          ) : isPendingAudit ? (
            isAdmin ? (
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> EM AUDITORIA
              </span>
            ) : "EM AUDITORIA"
          ) : isScheduled ? "AGUARDANDO INÍCIO" : (
            <span className="flex items-center gap-2">
              {timeLeft <= 5 ? "VAI PERDER! LANCE AGORA" : "Dar Lance"} <Zap className={`h-5 w-5 fill-current ${timeLeft <= 5 ? 'animate-bounce' : ''}`} />
            </span>
          )}
        </Button>

        {!isFinished && (
          <p className="text-[10px] text-center text-muted-foreground/30 uppercase tracking-[0.2em] font-bold mt-2 italic">
            {incentivePhrase.split(' ').slice(1).join(' ')}
          </p>
        )}
      </div>
    </Card>
  );
}
