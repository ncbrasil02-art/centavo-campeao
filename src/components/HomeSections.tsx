import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, Star, Trophy, ArrowRight, Play, Clock, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AuctionCard } from "./AuctionCard";

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

// AuctionCard has been extracted to its own file
