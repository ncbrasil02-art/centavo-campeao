import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useTimeSync } from "@/hooks/useTimeSync";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Clock, User, MessageSquare, Zap, Eye, Volume2, VolumeX } from "lucide-react";
import { AuctionChat } from "./AuctionChat";
import { toast } from "sonner";
import { FALLBACK_PRODUCT_IMAGE, getFallbackAvatarUrl } from "@/lib/constants";

const BID_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3";

interface AuctionCardProps {
  auction: any;
}

export function AuctionCard({ auction: initialAuction }: AuctionCardProps) {
  const [auction, setAuction] = useState(initialAuction);
  const [timeLeft, setTimeLeft] = useState(30); // Fictitious mode: starts at 30s
  const [isNewBid, setIsNewBid] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const confettiFired = useRef(false);
  const { getAdjustedNow } = useTimeSync();

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
  useEffect(() => {
    if (mounted && auction.current_price > initialAuction.current_price) {
      playBidSound();
    }
  }, [auction.current_price, playBidSound, mounted]);

  useEffect(() => {
    setAuction(initialAuction);
  }, [initialAuction]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Fictitious timer logic
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
  }, [auction.id]);

  const handleBid = async () => {
    setLoading(true);
    // Simulate bid for fictitious mode
    setTimeout(() => {
      playBidSound();
      setIsNewBid(true);
      setTimeLeft(30); // Reset to 30s as per fictitious mode
      setShowBonus(true);
      setTimeout(() => setShowBonus(false), 1000);
      setIsNewBid(false);
      setLoading(false);
      toast.success("Lance realizado! (Simulado)");
    }, 300);
    
    /* 
    // Real DB code commented out for fictitious mode
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para dar um lance!");
        return;
      }

      const { data, error } = await supabase.rpc('place_bid', {
        p_auction_id: auction.id,
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
      }
    } catch (error: any) {
      console.error("Erro ao dar lance:", error);
      toast.error("Erro ao processar lance.");
    } finally {
      setLoading(false);
    }
    */
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isFinished = timeLeft <= 0 || auction.status === 'finished';
  const discount = auction.product?.market_value 
    ? Math.round((1 - (auction.current_price / auction.product.market_value)) * 100)
    : 0;

  return (
    <Card className="group relative flex flex-col h-full overflow-hidden rounded-[32px] border-white/10 bg-white/5 transition-all duration-500 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20">
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
            <div className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 font-black text-black shadow-xl transition-transform translate-y-4 group-hover:translate-y-0">
              <Eye className="h-4 w-4" />
              VER DETALHES
            </div>
          </div>
        </Link>

        {/* Badges */}
        <div className="absolute left-4 top-4 flex flex-col gap-2">
          {isFinished ? (
            <Badge variant="outline" className="border-white/10 bg-black/60 px-3 py-1 text-white/40 backdrop-blur-md">
              ENCERRADO
            </Badge>
          ) : (
            <Badge className="animate-pulse border-none bg-red-500 px-3 py-1 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:bg-red-600">
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
                className="h-10 w-10 rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-md transition-all hover:bg-primary/20 hover:text-primary"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full border-white/10 bg-background p-0 sm:max-w-md">
              <SheetHeader className="border-b border-white/10 p-4">
                <SheetTitle className="font-black italic uppercase tracking-tighter text-white">
                  Chat do <span className="text-primary">Leilão</span>
                </SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100vh-80px)]">
                {mounted && <AuctionChat auctionId={auction.id} />}
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
            className="h-10 w-10 rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-md transition-all hover:bg-primary/20 hover:text-primary"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="relative flex flex-1 flex-col gap-5 bg-gradient-to-b from-white/[0.02] to-transparent p-6">
        <div>
          <Link to="/auctions/$id" params={{ id: auction.id }} className="cursor-pointer">
            <h3 className="mb-1 line-clamp-1 text-xl font-black uppercase italic tracking-tighter text-white transition-colors group-hover:text-primary">
              {auction.product?.name || "Produto"}
            </h3>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
              Valor Original:
            </span>
            <span className="text-xs font-bold text-white/40 line-through">
              R$ {auction.product?.market_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="flex flex-col">
            <span className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/40">
              Preço Atual
            </span>
            <span className={`text-2xl font-black text-primary transition-all duration-300 ${isNewBid ? 'scale-110 drop-shadow-[0_0_10px_rgba(var(--color-primary),0.5)]' : 'scale-100'}`}>
              R$ {auction.current_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,01"}
            </span>
          </div>
          <div className="relative flex flex-col items-end">
            <span className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/40">
              Tempo
            </span>
            <div className={`flex items-center gap-1 font-mono text-2xl font-bold transition-colors duration-300 ${
              timeLeft <= 5 && !isFinished 
                ? 'text-red-500 animate-pulse scale-110 drop-shadow-[0_0_10px_rgba(239,68,68,0.7)]' 
                : timeLeft <= 10 && !isFinished
                ? 'text-orange-500'
                : isFinished ? 'text-white/20' : 'text-white'
            }`}>
              <Clock className={`h-4 w-4 ${timeLeft <= 5 && !isFinished ? 'animate-spin' : ''}`} />
              {isFinished ? "00:00" : formatTime(timeLeft)}
            </div>
            {showBonus && (
              <div className="absolute -top-8 right-0 animate-bounce rounded-lg border border-primary/30 bg-primary/20 px-2 py-1 text-[10px] font-black text-primary backdrop-blur-sm">
                +30s RESET
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 py-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-primary/10">
            <img 
              src={auction.last_bidder?.avatar_url || getFallbackAvatarUrl(auction.last_bidder?.username)} 
              className="h-full w-full object-cover" 
              alt="Bidder" 
              onError={(e) => (e.target as HTMLImageElement).src = getFallbackAvatarUrl(auction.last_bidder?.username)}
            />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Último Lance</span>
            <span className="truncate text-sm font-bold text-white">
              {auction.last_bidder?.username || "Aguardando..."}
            </span>
          </div>
        </div>

        <Button 
          onClick={(e) => {
            e.stopPropagation();
            handleBid();
          }} 
          disabled={isFinished || loading}
          className={`h-14 w-full rounded-2xl text-lg font-black uppercase italic tracking-tighter transition-all relative overflow-hidden ${
            isFinished 
              ? 'cursor-not-allowed border border-white/5 bg-white/5 text-white/20' 
              : timeLeft <= 5
              ? 'bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.8)] animate-[pulse_0.5s_ease-in-out_infinite] hover:bg-red-700'
              : 'bg-primary text-primary-foreground shadow-[0_8px_25px_rgba(var(--color-primary),0.3)] hover:scale-[1.02] hover:bg-primary/90 active:scale-95'
          }`}
        >
          {loading ? "..." : isFinished ? "ENCERRADO" : (
            <span className="flex items-center gap-2">
              {timeLeft <= 5 ? "VAI PERDER! LANCE AGORA" : "Dar Lance"} <Zap className={`h-5 w-5 fill-current ${timeLeft <= 5 ? 'animate-bounce' : ''}`} />
            </span>
          )}
        </Button>
      </div>
    </Card>
  );
}
