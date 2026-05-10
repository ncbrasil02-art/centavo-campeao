import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useTimeSync } from "@/hooks/useTimeSync";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Clock, User, MessageSquare, Zap, Eye } from "lucide-react";
import { AuctionChat } from "./AuctionChat";
import { toast } from "sonner";

interface AuctionCardProps {
  auction: any;
}

export function AuctionCard({ auction: initialAuction }: AuctionCardProps) {
  const [auction, setAuction] = useState(initialAuction);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isNewBid, setIsNewBid] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const confettiFired = useRef(false);
  const { getAdjustedNow } = useTimeSync();

  useEffect(() => {
    setAuction(initialAuction);
  }, [initialAuction]);

  useEffect(() => {
    confettiFired.current = false;
    const calculateTimeLeft = () => {
      if (!auction.end_time) return 0;
      const end = new Date(auction.end_time).getTime();
      const now = getAdjustedNow();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      return diff;
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
  }, [auction.end_time, auction.status, getAdjustedNow]);

  const handleBid = async () => {
    setLoading(true);
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
            src={auction.product?.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop"} 
            alt={auction.product?.name} 
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop";
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
        
        {/* Chat Trigger (Floating on Image) */}
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              size="icon" 
              variant="ghost" 
              className="absolute right-4 top-4 h-10 w-10 rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-md transition-all hover:bg-primary/20 hover:text-primary"
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
              {/* AuctionChat disabled for debugging */}
            </div>
          </SheetContent>
        </Sheet>
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
            <div className={`flex items-center gap-1 font-mono text-2xl font-bold ${timeLeft < 10 && !isFinished ? 'text-red-500 animate-pulse' : isFinished ? 'text-white/20' : 'text-white'}`}>
              <Clock className={`h-4 w-4 ${timeLeft < 10 && !isFinished ? 'animate-spin' : ''}`} />
              {isFinished ? "00:00" : formatTime(timeLeft)}
            </div>
            {showBonus && (
              <div className="absolute -top-8 right-0 animate-bounce rounded-lg border border-primary/30 bg-primary/20 px-2 py-1 text-[10px] font-black text-primary backdrop-blur-sm">
                +15s BÔNUS
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 py-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-primary/10">
            {auction.last_bidder?.avatar_url ? (
              <img src={auction.last_bidder.avatar_url} className="h-full w-full object-cover" alt="Bidder" />
            ) : (
              <User className="h-5 w-5 text-primary/40" />
            )}
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
          className={`h-14 w-full rounded-2xl text-lg font-black uppercase italic tracking-tighter transition-all ${isFinished ? 'cursor-not-allowed border border-white/5 bg-white/5 text-white/20' : 'bg-primary text-primary-foreground shadow-[0_8px_25px_rgba(var(--color-primary),0.3)] hover:scale-[1.02] hover:bg-primary/90 active:scale-95'}`}
        >
          {loading ? "..." : isFinished ? "ENCERRADO" : (
            <span className="flex items-center gap-2">
              Dar Lance <Zap className="h-5 w-5 fill-current" />
            </span>
          )}
        </Button>
      </div>
    </Card>
  );
}
