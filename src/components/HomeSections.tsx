import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, Star, Trophy, ArrowRight, Play, Clock, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

export function Hero() {
  const [onlineUsers, setOnlineUsers] = useState(128);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    // Online Users Tracking via Presence
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: 'user',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        // Base count + presence count for better feel
        setOnlineUsers(100 + count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    fetchBanners();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchBanners() {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("active", true)
        .order("order_index", { ascending: true });
      
      if (error) throw error;
      
      const now = new Date();
      const filtered = (data || []).filter(banner => {
        const start = banner.start_at ? new Date(banner.start_at) : null;
        const end = banner.end_at ? new Date(banner.end_at) : null;
        
        if (start && start > now) return false;
        if (end && end < now) return false;
        return true;
      });

      setBanners(filtered);
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!loading && banners.length > 0) {
    return (
      <section className="relative w-full overflow-hidden bg-background">
        <div className="embla" ref={emblaRef}>
          <div className="embla__container flex">
            {banners.map((banner) => (
              <div key={banner.id} className="embla__slide flex-[0_0_100%] min-w-0 relative h-[400px] md:h-[600px]">
                <img 
                  src={banner.image_url} 
                  alt={banner.title} 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent flex items-center">
                  <div className="container mx-auto px-4">
                    <div className="max-w-2xl space-y-6">
                      {banner.title && (
                        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white drop-shadow-lg">
                          {banner.title}
                        </h2>
                      )}
                      {banner.subtitle && (
                        <p className="text-lg md:text-2xl text-white/80 font-medium drop-shadow-md">
                          {banner.subtitle}
                        </p>
                      )}
                      {banner.link_url && (
                        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase italic tracking-widest" asChild>
                          <Link to={banner.link_url as any}>
                            Participar Agora <ArrowRight className="ml-2 w-5 h-5" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {banners.length > 1 && (
          <>
            <button 
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all z-10 border border-white/10"
              onClick={scrollPrev}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all z-10 border border-white/10"
              onClick={scrollNext}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden pt-20 pb-12 lg:pt-32 lg:pb-24">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10"></div>
      
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
