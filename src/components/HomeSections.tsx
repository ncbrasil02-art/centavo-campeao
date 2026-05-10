import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, Star, Trophy, ArrowRight, Play, Clock, Sparkles, User, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuctionChat } from "./AuctionChat";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
// confetti will be imported dynamically on the client
import { useTimeSync } from "@/hooks/useTimeSync";

export function Hero() {
  const [onlineUsers, setOnlineUsers] = useState(128);

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers(prev => prev + (Math.random() > 0.5 ? 1 : -1));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden pt-20 pb-12 lg:pt-32 lg:pb-24">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10"></div>
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] -z-10"></div>
      
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-6 py-1 px-4 border-primary/30 bg-primary/10 text-primary animate-pulse">
            <Sparkles className="w-3 h-3 mr-2" />
            VIVA A EMOÇÃO DO ARREMATE
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6">
            Arremate produtos incríveis por <span className="text-primary italic">centavos!</span>
          </h1>
          
          <p className="text-xl text-white/60 mb-10 max-w-2xl leading-relaxed">
            A plataforma de leilões de centavos mais confiável, rápida e divertida do Brasil. iPhones, Consoles, TVs e muito mais a partir de R$ 0,01.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button size="lg" className="h-14 px-8 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--color-primary),0.3)] group" asChild>
              <Link to="/auth">
                Começar agora
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold border-white/10 hover:bg-white/5 bg-white/5" asChild>
              <Link to="/">
                <Play className="mr-2 w-5 h-5 fill-current" />
                Ver como funciona
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
            <StatsCard icon={<Users className="w-5 h-5" />} label="Online Agora" value={onlineUsers.toString()} />
            <StatsCard icon={<Trophy className="w-5 h-5" />} label="Arremates Hoje" value="47" />
            <StatsCard icon={<Star className="w-5 h-5" />} label="Economia Média" value="92%" />
            <StatsCard icon={<Clock className="w-5 h-5" />} label="Tempo Real" value="10ms" />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <Card className="p-4 bg-white/5 border-white/10 flex flex-col items-center justify-center transition-all hover:bg-white/10 hover:border-primary/30 group">
      <div className="text-primary mb-2 group-hover:scale-110 transition-transform">{icon}</div>
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs font-medium text-white/40 uppercase tracking-wider">{label}</div>
    </Card>
  );
}

export function AuctionCard({ auction: initialAuction }: { auction: any }) {
  const [auction, setAuction] = useState(initialAuction);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isNewBid, setIsNewBid] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [loading, setLoading] = useState(false);
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
  }, [auction.end_time, auction.status]);

  const handleBid = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Você precisa estar logado para dar um lance!");
        return;
      }

      const { data, error } = await supabase.rpc('place_bid', {
        p_auction_id: auction.id,
        p_user_id: session.user.id
      });

      if (error) throw error;
      
      const result = data as any;
      if (!result.success) {
        alert(result.message);
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
      alert("Ocorreu um erro ao processar seu lance.");
    } finally {
      setLoading(false);
    }
  };

  const isFinished = timeLeft <= 0 || auction.status === 'finished';

  return (
    <Card className="overflow-hidden bg-white/5 border-white/10 group hover:border-primary/50 transition-all duration-300">
      <div className="relative aspect-square">
        <img 
          src={auction.product?.images?.[0] || "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop"} 
          alt={auction.product?.name} 
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          {isFinished ? (
            <Badge variant="outline" className="bg-white/10 text-white/40 border-none">ENCERRADO</Badge>
          ) : (
            <Badge className="bg-red-500 hover:bg-red-600 animate-pulse border-none">AO VIVO</Badge>
          )}
          <Badge variant="secondary" className="bg-black/60 backdrop-blur-md border-white/10">Novo</Badge>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60"></div>
      </div>
      
      <div className="p-5 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-white line-clamp-1 group-hover:text-primary transition-colors">{auction.product?.name || "Produto"}</h3>
            <p className="text-sm text-white/40">Valor: R$ {auction.product?.market_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,00"}</p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="text-white/40 hover:text-primary hover:bg-primary/10 -mt-1 -mr-2">
                <MessageSquare className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-background border-white/10">
              <SheetHeader className="p-4 border-b border-white/10">
                <SheetTitle className="text-white font-black italic uppercase tracking-tighter">Chat do <span className="text-primary">Leilão</span></SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100vh-80px)]">
                <AuctionChat auctionId={auction.id} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex items-center justify-between py-2 border-y border-white/5">
          <div className="flex flex-col">
            <span className="text-xs text-white/40 uppercase font-bold tracking-tighter">Preço Atual</span>
            <span className={`text-2xl font-black text-primary transition-transform duration-300 ${isNewBid ? 'scale-125' : 'scale-100'}`}>
              R$ {auction.current_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || "0,01"}
            </span>
          </div>
          <div className="flex flex-col items-end relative">
            <span className="text-xs text-white/40 uppercase font-bold tracking-tighter">Tempo</span>
            <div className={`flex items-center gap-1 font-mono text-2xl font-bold ${timeLeft < 10 && !isFinished ? 'text-red-500 animate-pulse' : isFinished ? 'text-white/20' : 'text-white'}`}>
              <Clock className="w-4 h-4" />
              {isFinished ? "--:--" : `00:${timeLeft.toString().padStart(2, '0')}`}
            </div>
            {showBonus && (
              <div className="absolute -top-6 right-0 text-primary font-black text-xs animate-bounce bg-primary/20 px-2 py-0.5 rounded-full border border-primary/30">
                +15s BÔNUS
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 py-1">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
            <User className="w-4 h-4 text-white/60" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs text-white/40 font-bold uppercase tracking-tighter">Último Arrematante</span>
            <span className="text-sm font-medium text-white truncate">{auction.last_bidder?.username || "---"}</span>
          </div>
        </div>

        <Button 
          onClick={handleBid} 
          disabled={isFinished || loading}
          className={`w-full h-12 text-lg font-black transition-all ${isFinished ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_15px_rgba(var(--color-primary),0.3)]'}`}
        >
          {loading ? "PROCESSANDO..." : isFinished ? "LEILÃO ENCERRADO" : "DAR LANCE"}
        </Button>
      </div>
    </Card>
  );
}
