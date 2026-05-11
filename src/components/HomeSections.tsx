import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { useTimeSync } from "@/hooks/useTimeSync";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, Star, Trophy, ArrowRight, Play, Clock, Sparkles, ChevronLeft, ChevronRight, Gavel } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

export function Hero() {
  const { getAdjustedNow } = useTimeSync();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date(getAdjustedNow()));
    }, 1000);
    return () => clearInterval(timer);
  }, [getAdjustedNow]);

  const [onlineUsers, setOnlineUsers] = useState(128);
  const [banners, setBanners] = useState<any[]>([]);
  const [phrases, setPhrases] = useState<string[]>([
    "Arremate produtos incríveis por centavos!",
    "iPhones, Consoles e muito mais a partir de R$ 0,01",
    "Economize até 99% nos seus produtos favoritos",
    "A emoção do leilão em tempo real na sua tela"
  ]);
  const [loading, setLoading] = useState(true);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    fetchPhrases();
  }, []);

  async function fetchPhrases() {
    const { data } = await supabase
      .from("app_phrases")
      .select("text")
      .eq("type", "hero")
      .eq("active", true);
    
    if (data && data.length > 0) {
      setPhrases(data.map(p => p.text));
    }
  }

  useEffect(() => {
    if (phrases.length === 0) return;
    const timer = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % phrases.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [phrases]);

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
    <section className="relative overflow-hidden pt-20 pb-12 lg:pt-32 lg:pb-24 bg-[#0a0a0c]">
      {/* Imagem de Fundo 3D Gaming */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background"></div>
        
        {/* Luzes e Brilhos Neon */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* Feixes de Luz Estilizados */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-gradient-to-b from-primary/40 via-transparent to-transparent opacity-20"></div>
        <div className="absolute top-0 left-[30%] w-[1px] h-full bg-gradient-to-b from-primary/20 via-transparent to-transparent opacity-10 rotate-12"></div>
        <div className="absolute top-0 left-[70%] w-[1px] h-full bg-gradient-to-b from-primary/20 via-transparent to-transparent opacity-10 -rotate-12"></div>
      </div>

      {/* Elementos 3D Flutuantes (Ícones) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        <motion.div 
          animate={{ y: [0, -20, 0], rotate: [12, 15, 12] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-[15%] text-primary/10"
        >
          <Gavel className="w-64 h-64 drop-shadow-[0_0_50px_rgba(var(--color-primary),0.5)] opacity-40" />
        </motion.div>

        <motion.div 
          animate={{ y: [0, 20, 0], rotate: [-10, -5, -10] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-40 left-[10%] text-primary/5"
        >
          <Clock className="w-48 h-48 drop-shadow-[0_0_40px_rgba(var(--color-primary),0.3)] opacity-30" />
        </motion.div>

        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-[5%] w-2 h-2 bg-primary rounded-full shadow-[0_0_15px_var(--primary)]"
        ></motion.div>
        
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-[5%] w-3 h-3 bg-primary rounded-full shadow-[0_0_20px_var(--primary)]"
        ></motion.div>
      </div>
      
      <div className="container mx-auto px-4 relative z-20">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="flex flex-col items-center mb-8 reveal-on-scroll active">
            <div className="bg-primary/10 border border-primary/20 rounded-full px-6 py-2 backdrop-blur-md shadow-[0_0_20px_rgba(var(--color-primary),0.2)]">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary animate-pulse" />
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest leading-none">Horário de Brasília</span>
                  <span className="text-2xl font-black tabular-nums text-white neon-text leading-none mt-1">
                    {format(currentTime, "HH:mm:ss", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          
          <div className="h-[140px] md:h-[220px] flex items-center justify-center mb-6 overflow-hidden">
            <motion.h1
              key={textIndex}
              initial={{ y: 40, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.8, 
                ease: [0.16, 1, 0.3, 1] // Custom quintic ease out for premium feel
              }}
              className="text-4xl md:text-8xl font-black tracking-tight text-white leading-tight drop-shadow-2xl"
            >
              {phrases[textIndex].includes("centavos!") ? (
                <>
                  Arremate produtos incríveis por <span className="text-primary italic relative">
                    centavos!
                    <span className="absolute -bottom-2 left-0 w-full h-2 bg-primary/20 blur-sm rounded-full"></span>
                  </span>
                </>
              ) : phrases[textIndex]}
            </motion.h1>
          </div>
          
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
