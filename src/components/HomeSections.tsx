import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { useTimeSync } from "@/hooks/useTimeSync";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Users, Star, Trophy, ArrowRight, Play, Clock, Sparkles, ChevronLeft, ChevronRight, Gavel, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from 'embla-carousel-react';
// import Autoplay from 'embla-carousel-autoplay';
import { Volume2, VolumeX } from "lucide-react";

import { DemoAuctionBlock } from "./DemoAuctionBlock";

export function Hero() {
  const { getAdjustedNow } = useTimeSync();
  const { hero_display_mode, site_name } = useSettings();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

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

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  useEffect(() => {
    if (!emblaApi || banners.length === 0) return;

    // Filter banners to get the current one
    const currentBanner = banners[currentSlideIndex];
    if (!currentBanner) return;

    // If it's a video, we don't use Autoplay plugin timer, we use the video onEnded event
    // If it's an image, we use a manual timeout based on transition_duration
    if (currentBanner.media_type !== 'video') {
      const timer = setTimeout(() => {
        emblaApi.scrollNext();
      }, (currentBanner.transition_duration || 5) * 1000);
      
      return () => clearTimeout(timer);
    }
  }, [emblaApi, currentSlideIndex, banners]);

  // Helper removed as we switched to manual timer and video onEnded control

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      setCurrentSlideIndex(index);
    };

    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Re-initialize carousel when banners change
  useEffect(() => {
    if (emblaApi && banners.length > 0) {
      emblaApi.reInit({ 
        loop: true 
      });
    }
  }, [banners, emblaApi]);

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

    fetchHeroData();

    // Subscribe to site_settings changes to update hero mode in real-time
    const settingsChannel = supabase
      .channel('hero-settings-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'site_settings' },
        () => {
          fetchHeroData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(settingsChannel);
    };

  }, [hero_display_mode]);

  async function fetchHeroData() {
    setLoading(true);
    try {
      if (hero_display_mode === 'banners') {
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
      } else if (hero_display_mode === 'products') {
        // Fetch 6 last scheduled auctions
        const { data, error } = await supabase
          .from("auctions")
          .select("*, products(*)")
          .eq("status", "scheduled")
          .order("start_time", { ascending: true })
          .limit(6);

        if (error) throw error;

        const productBanners = (data || []).map(auction => {
          const startTime = auction.start_time ? new Date(auction.start_time) : new Date();
          return {
            id: auction.id,
            title: auction.products?.name,
            subtitle: `Leilão começa em ${format(startTime, "dd/MM 'às' HH:mm", { locale: ptBR })}`,
            image_url: auction.products?.images?.[0] || '',
            link_url: `/auctions/${auction.id}`
          };
        });

        setBanners(productBanners);
      }
    } catch (error) {
      console.error("Error fetching hero data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (!loading && (hero_display_mode === 'banners' || hero_display_mode === 'products') && banners.length > 0) {
    return (
      <section className="relative w-full overflow-hidden bg-background">
        <div className="embla" ref={emblaRef}>
          <div className="embla__container flex">
            {banners.map((banner, index) => (
              <div key={banner.id} className="embla__slide flex-[0_0_100%] min-w-0 relative h-[400px] md:h-[600px]">
                {banner.media_type === 'video' ? (
                  <div className="absolute inset-0 w-full h-full">
                    <video 
                      key={`video-${banner.id}-${currentSlideIndex}`}
                      src={banner.image_url} 
                      className="w-full h-full object-cover"
                      autoPlay
                      muted={index === currentSlideIndex ? isMuted : true}
                      playsInline
                      onEnded={(e) => {
                        const video = e.currentTarget;
                        const currentLoop = parseInt(video.getAttribute('data-loop') || '0');
                        const maxLoops = banner.loop_count || 1;
                        
                        if (currentLoop + 1 < maxLoops) {
                          video.setAttribute('data-loop', (currentLoop + 1).toString());
                          video.play();
                        } else {
                          // When finished all loops, go to next slide
                          if (emblaApi) emblaApi.scrollNext();
                        }
                      }}
                      data-loop="0"
                    />
                    {index === currentSlideIndex && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const video = e.currentTarget.parentElement?.querySelector('video');
                          if (video) {
                            const newMuted = !video.muted;
                            video.muted = newMuted;
                            setIsMuted(newMuted);
                          }
                        }}
                        className="absolute bottom-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                ) : (
                  <img 
                    src={banner.image_url} 
                    alt={banner.title} 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
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
                      <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase italic tracking-widest" asChild>
                        <Link to={(banner.link_url || (user ? "/packages" : "/auth")) as any}>
                          {user ? "Participar Agora" : "Começar Agora"} <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                      </Button>
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
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-md flex items-center justify-center text-foreground transition-all z-10 border border-border"
              onClick={scrollPrev}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/20 hover:bg-background/40 backdrop-blur-md flex items-center justify-center text-foreground transition-all z-10 border border-border"
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
    <section className="relative overflow-hidden pt-20 pb-12 lg:pt-32 lg:pb-24 bg-background">
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
          <Gavel className="w-64 h-64 drop-shadow-[0_0_50px_color-mix(in srgb, var(--primary), transparent calc(100% - 0.5 * 100%))] opacity-40" />
        </motion.div>

        <motion.div 
          animate={{ y: [0, 20, 0], rotate: [-10, -5, -10] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-40 left-[10%] text-primary/5"
        >
          <Clock className="w-48 h-48 drop-shadow-[0_0_40px_color-mix(in srgb, var(--primary), transparent calc(100% - 0.3 * 100%))] opacity-30" />
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
          {/* Removido o relógio repetido aqui conforme solicitado pelo usuário */}
          
          <div className="min-h-[160px] md:min-h-[280px] flex items-center justify-center mb-6 overflow-hidden">
            <motion.h1
              key={textIndex}
              initial={{ y: 40, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.8, 
                ease: [0.16, 1, 0.3, 1] // Custom quintic ease out for premium feel
              }}
              className="text-4xl md:text-8xl font-black tracking-tight text-foreground leading-tight drop-shadow-2xl"
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
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
            A plataforma de leilões de centavos mais confiável, rápida e divertida do Brasil. iPhones, Consoles, TVs e muito mais a partir de R$ 0,01.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button size="lg" className="h-14 px-8 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_color-mix(in srgb, var(--primary), transparent calc(100% - 0.3 * 100%))] group" asChild>
              <Link to={user ? "/packages" : "/auth"}>
                {user ? "Disputar Leilões" : "Começar agora"}
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold border-border hover:bg-muted/50 bg-muted/20" asChild>
              <Link to="/how-it-works">
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
    <Card className="p-4 bg-muted/50 border-border flex flex-col items-center justify-center transition-all hover:bg-muted hover:border-primary/30 group">
      <div className="text-primary mb-2 group-hover:scale-110 transition-transform">{icon}</div>
      <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
    </Card>
  );
}

export function SecondaryBanner({ title, subtitle, imageUrl, linkUrl, reverse = false }: { title: string, subtitle: string, imageUrl: string, linkUrl: string, reverse?: boolean }) {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className={`relative overflow-hidden rounded-[40px] bg-card border border-border flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 p-8 md:p-0`}>
          <div className="flex-1 space-y-6 md:p-12 lg:p-20">
            <Badge className="bg-primary/10 text-primary border-primary/20 uppercase font-black italic">OFERTA ESPECIAL</Badge>
            <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-foreground leading-tight">
              {title}
            </h2>
            <p className="text-muted-foreground text-lg">
              {subtitle}
            </p>
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase italic tracking-widest" asChild>
              <Link to={linkUrl as any}>
                Ver Detalhes <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
          <div className="flex-1 w-full h-[300px] md:h-[500px] relative">
            <img 
              src={imageUrl} 
              className="absolute inset-0 w-full h-full object-cover"
              alt={title}
            />
            <div className={`absolute inset-0 bg-gradient-to-t md:bg-gradient-to-${reverse ? 'r' : 'l'} from-card via-transparent to-transparent`}></div>
          </div>
        </div>
      </div>
    </section>
  );
}

