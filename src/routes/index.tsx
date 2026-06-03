import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero, SecondaryBanner } from "@/components/HomeSections";
import { useSettings } from "@/hooks/useSettings";
import { AuctionCard } from "@/components/AuctionCard";
import { GlobalActivityChat } from "@/components/GlobalActivityChat";
import { MessageSquare, X, ArrowRight, Zap, ShieldCheck, Heart, User, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FALLBACK_USER_IMAGE, getFallbackAvatarUrl } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

import { Star, Quote } from "lucide-react";

function TestimonialCard({ name, content, avatarUrl, rating }: { name: string, content: string, avatarUrl: string, rating: number }) {
  return (
    <div className="group relative p-6 rounded-[32px] bg-muted/30 border border-border hover:border-primary/30 transition-all duration-500 hover:-translate-y-2">
      <div className="absolute top-6 right-8 text-primary/10 group-hover:text-primary/20 transition-colors">
        <Quote className="w-12 h-12 rotate-180" />
      </div>
      
      <div className="flex flex-col h-full gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-border group-hover:border-primary/40 transition-all shadow-2xl">
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="font-black text-foreground italic uppercase tracking-tighter text-sm">{name}</h4>
            <div className="flex gap-0.5 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/20'}`} />
              ))}
            </div>
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm leading-relaxed italic">
          "{content}"
        </p>
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px]"></div>
    </div>
  );
}

function WinnerCard({ name, product, price, saving, avatarUrl, productImage }: { name: string, product: string, price: string, saving: string, avatarUrl?: string, productImage?: string }) {
  return (
    <div className="group relative p-1 rounded-[32px] bg-gradient-to-br from-primary/20 via-muted/30 to-transparent border border-border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(var(--color-primary),0.1),_transparent_70%)]"></div>
      
      <div className="relative bg-card rounded-[30px] p-6 flex flex-col gap-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/30 group-hover:border-primary transition-all shadow-xl">
              <img 
                src={avatarUrl || getFallbackAvatarUrl(name)} 
                className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all" 
                onError={(e) => (e.target as HTMLImageElement).src = getFallbackAvatarUrl(name)} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent"></div>
            </div>
            <div>
              <h4 className="font-black text-foreground italic uppercase tracking-tighter group-hover:text-primary transition-colors">{name}</h4>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Arrematou com Sucesso</span>
              </div>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 font-black italic uppercase text-[10px]">#{Math.floor(Math.random() * 900) + 100}</Badge>
        </div>

        <div className="flex items-center gap-4 bg-muted/50 rounded-2xl p-4 border border-border group-hover:bg-muted transition-all">
          <div className="w-20 h-20 rounded-xl bg-background/40 p-2 shrink-0 border border-border overflow-hidden">
            <img src={productImage || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200&auto=format&fit=crop"} className="w-full h-full object-contain mix-blend-lighten dark:mix-blend-lighten" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-foreground uppercase truncate italic leading-tight mb-2">{product}</p>
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pagou apenas</span>
                <span className="font-black text-xl text-primary drop-shadow-[0_0_10px_rgba(var(--color-primary),0.3)]">{price}</span>
              </div>
              <Badge className="bg-green-500/20 text-green-500 border-green-500/20 font-black text-[10px] uppercase">{saving} OFF</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Index() {
  const { google_reviews_widget, logo_url, logo_height, logo_height_mobile, logo_padding_x, logo_padding_y, support_whatsapp } = useSettings();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [finishedAuctions, setFinishedAuctions] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData();

    // Subscribe to changes in auctions table
    const auctionsChannel = supabase
      .channel('index_auctions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auctions' },
        () => {
          // We only need to re-fetch when a NEW auction starts or one ends (status change)
          // Since individual bids are handled inside AuctionCard, we don't need to re-fetch the list
          // But to keep the order correct if status changes, we fetch.
          fetchData(); 
        }
      )
      .subscribe();

    // Subscribe to new winners
    const winnersChannel = supabase
      .channel('index_winners')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'winners' },
        () => {
          fetchData(); // Re-fetch winners list
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionsChannel);
      supabase.removeChannel(winnersChannel);
    };
  }, []);

  // Heartbeat moved to global Root layout for better reliability


  async function fetchData() {
    const [auctionsRes, winnersRes, finishedRes, testimonialsRes] = await Promise.all([
      supabase
        .from("v_home_live_auctions")
        .select("*")
        .order("start_time", { ascending: true }),
      supabase
        .from("v_home_recent_winners")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("auctions")
        .select(`
          *,
          product:products(*),
          last_bidder:profiles(username, avatar_url)
        `)
        .eq("status", "finished")
        .order("end_time", { ascending: false })
        .limit(8),
      supabase
        .from("testimonials")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(12)
    ]);

    if (auctionsRes.error) {
      console.error("Error fetching live auctions:", auctionsRes.error);
      toast.error(`Erro ao carregar leilões: ${auctionsRes.error.message}`);
    } else {
      // Ordenação personalizada: Ativos > Agendados > Em Auditoria > Confirmados
      const statusOrder: Record<string, number> = {
        'live': 0,
        'scheduled': 1,
        'pending_audit': 2,
        'confirmed': 3
      };
      
      const sortedAuctions = [...(auctionsRes.data || [])].sort((a, b) => {
        const orderA = a.status ? (statusOrder[a.status] ?? 4) : 4;
        const orderB = b.status ? (statusOrder[b.status] ?? 4) : 4;
        const diff = orderA - orderB;
        if (diff !== 0) return diff;
        
        const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
        const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
        return timeA - timeB;
      });
      
      setAuctions(sortedAuctions.slice(0, 12));
    }
    
    if (winnersRes.error) console.error("Error fetching winners:", winnersRes.error);
    if (finishedRes.error) {
      console.error("Error fetching finished auctions:", finishedRes.error);
      toast.error(`Erro ao carregar encerrados: ${finishedRes.error.message}`);
    } else {
      setFinishedAuctions(finishedRes.data || []);
    }
    
    if (testimonialsRes.error) {
      console.error("Error fetching testimonials:", testimonialsRes.error);
    } else {
      setTestimonials(testimonialsRes.data || []);
    }
    
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground flex flex-col overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 relative overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <Hero />

          {/* Featured Auctions Header */}
          <div className="container mx-auto px-4 mt-8">
             <div className="flex items-center gap-4 mb-8">
                <div className="h-[1px] flex-1 bg-border"></div>
                <h2 className="text-xs font-black uppercase tracking-[0.5em] text-muted-foreground italic">Destaques da Semana</h2>
                <div className="h-[1px] flex-1 bg-border"></div>
             </div>
          </div>

          {/* Live Auctions Section */}
          <section className="py-20 bg-muted">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                <div className="max-w-xl">
                  <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary uppercase">LEILÕES EM DESTAQUE</Badge>
                  <h2 className="text-4xl font-black tracking-tight text-foreground mb-4 italic">Leilões <span className="text-primary">ao vivo</span> agora</h2>
                  <p className="text-muted-foreground">Não perca a chance de arrematar os produtos mais cobiçados do momento por uma fração do preço original.</p>
                </div>
                <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 group">
                  Ver todos os leilões
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse"></div>
                  ))}
                </div>
              ) : auctions.length > 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  {auctions.map((auction, idx) => (
                    <motion.div
                      key={auction.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                    >
                      <AuctionCard auction={auction} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-20 bg-muted/50 rounded-3xl border border-dashed border-border">
                  <p className="text-muted-foreground">Nenhum leilão ao vivo no momento.</p>
                </div>
              )}
            </div>
          </section>
          
          <SecondaryBanner 
            title="Pacote de Lances com 50% de Desconto" 
            subtitle="Comece com o pé direito! Adquira seu primeiro pacote de lances agora e ganhe o dobro para disputar seus produtos favoritos."
            imageUrl="https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=2000&auto=format&fit=crop"
            linkUrl="/packages"
          />



          {/* How it Works Section */}
          <section className="py-24 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10"></div>
            <div className="container mx-auto px-4">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <Badge variant="outline" className="mb-4 border-accent/30 bg-accent/10 text-accent uppercase">SIMPLES E DIVERTIDO</Badge>
                <h2 className="text-4xl font-black tracking-tight text-foreground mb-6">Como o Lance Certo funciona?</h2>
                <p className="text-muted-foreground italic">Arrematar produtos premium nunca foi tão fácil. Siga os passos e comece a disputar agora mesmo.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <Step icon={<Zap className="w-8 h-8" />} step="1" title="Compre seus lances" desc="Adquira pacotes de lances para participar das disputas." />
                <Step icon={<ArrowRight className="w-8 h-8" />} step="2" title="Dê seus lances" desc="Cada lance aumenta o preço em R$ 0,01 e reinicia o cronômetro." />
                <Step icon={<ShieldCheck className="w-8 h-8" />} step="3" title="Arremate e economize" desc="O último usuário a dar o lance quando o cronômetro zerar vence." />
              </div>
            </div>
          </section>

          {/* Winners Section */}
          <section className="py-20 bg-muted">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary uppercase">GALERIA DE HONRA</Badge>
                <h2 className="text-4xl font-black tracking-tight text-foreground mb-4 italic uppercase">Ranking de <span className="text-primary">Ganhadores</span></h2>
                <p className="text-muted-foreground">Pessoas reais, economias reais. Veja quem já levou o prêmio para casa esta semana.</p>
                <Button variant="link" className="text-primary font-black italic uppercase text-xs mt-4" asChild>
                  <Link to="/ranking">Ver Ranking Completo <ArrowUpRight className="ml-1 w-3 h-3" /></Link>
                </Button>
              </div>


              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {winners.length > 0 ? (
                  winners.map((winner) => (
                    <WinnerCard 
                      key={winner.id}
                      name={winner.profile?.full_name || winner.profile?.username || "Ganhador"}
                      product={winner.auction?.product?.name || "Produto"}
                      price={`R$ ${Number(winner.final_price).toFixed(2)}`}
                      saving={`${winner.savings_percentage}%`}
                      avatarUrl={winner.profile?.avatar_url}
                      productImage={winner.auction?.product?.image}
                    />
                  ))
                ) : (
                  <>
                    <WinnerCard name="Mateus Oliveira" product="iPhone 15 Pro Max" price="R$ 142,50" saving="98%" productImage="https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&q=80&w=400" />
                    <WinnerCard name="Juliana Costa" product="PlayStation 5 Slim" price="R$ 89,12" saving="97%" productImage="https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&q=80&w=400" />
                    <WinnerCard name="Ricardo Silva" product="MacBook Air M3" price="R$ 210,00" saving="96%" productImage="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=400" />
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Finished Auctions Section */}
          {finishedAuctions.length > 0 && (
            <section className="py-20 bg-muted/50 border-y border-border">
              <div className="container mx-auto px-4">
                <div className="mb-12">
                  <Badge variant="outline" className="mb-4 border-border bg-card text-muted-foreground uppercase tracking-widest">GALERIA DE ARREMATADOS</Badge>
                  <h2 className="text-4xl font-black tracking-tight text-foreground italic uppercase">Leilões <span className="text-muted-foreground">Encerrados</span></h2>
                  <p className="text-muted-foreground/60 mt-2">Veja os últimos produtos que foram arrematados com sucesso na plataforma.</p>
                </div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700"
                >
                  {finishedAuctions.map((auction, idx) => (
                    <motion.div
                      key={auction.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      className="animate-float-slow"
                    >
                      <AuctionCard auction={auction} />
                    </motion.div>
                  ))}
                </motion.div>
                
                <div className="mt-12 flex justify-center">
                  <Button variant="outline" size="lg" className="border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-black uppercase tracking-[0.2em] text-xs h-14 px-10 rounded-2xl group shadow-[0_0_30px_rgba(var(--color-primary),0.1)] hover:shadow-[0_0_40px_rgba(var(--color-primary),0.2)] transition-all duration-500" asChild>
                    <Link to="/finished-auctions" className="flex items-center gap-3">
                      Ver todos os leilões arrematados
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </section>
          )}

          <SecondaryBanner 
            title="Sua chance de ter um iPhone 15 Pro" 
            subtitle="Leilões diários de smartphones premium. Participe das disputas em tempo real e economize até 90%."
            imageUrl="https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&q=80&w=2000"
            linkUrl="/auctions"
            reverse
          />


          {/* Testimonials Section */}
          <section className="py-24 bg-zinc-950/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary uppercase tracking-widest text-[10px]">COMMUNITY FEEDBACK</Badge>
                <h2 className="text-4xl font-black tracking-tight text-white mb-4 italic uppercase">Voz da <span className="text-primary">Comunidade</span></h2>
                <p className="text-white/40 max-w-2xl mx-auto">Milhares de usuários já vivenciaram a adrenalina do Lance Certo. Confira o que eles estão dizendo sobre a experiência.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {google_reviews_widget && google_reviews_widget.trim().length > 10 ? (
                  <div className="col-span-full" dangerouslySetInnerHTML={{ __html: google_reviews_widget }} />
                ) : testimonials.length > 0 ? (
                  testimonials.map((t, idx) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: (idx % 4) * 0.1 }}
                    >
                      <TestimonialCard 
                        name={t.name}
                        content={t.content}
                        avatarUrl={t.avatar_url || getFallbackAvatarUrl(t.name)}
                        rating={t.rating}
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <p className="text-white/20 uppercase tracking-[0.3em] font-black italic">Carregando depoimentos da comunidade...</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <footer className="py-20 border-t border-white/5 bg-zinc-950/60 mt-20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
            
            <div className="container mx-auto px-4 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                {/* Brand & Mission */}
                <div className="flex flex-col gap-6 items-center md:items-start text-center md:text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black tracking-tighter text-white uppercase italic">
                      LANCE<span className="text-primary">CERTO</span>
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                    <span className="text-white/40 text-xs font-medium uppercase tracking-widest">© 2026</span>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed max-w-sm italic">
                    O Lance Certo Premium é uma plataforma de leilões de centavos que prioriza a transparência, a agilidade e a emoção da disputa real. Nossa missão é proporcionar a melhor experiência de arremate com total segurança e suporte ao usuário.
                  </p>
                  <div className="flex gap-4">
                    {support_whatsapp && (
                      <Button asChild className="bg-green-600 hover:bg-green-700 text-white font-bold h-10 px-6 rounded-xl shadow-[0_0_20px_rgba(22,163,74,0.3)]">
                        <a href={support_whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" /> Atendimento WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Important Links & Info */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-6">Informações</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-[10px] font-bold uppercase tracking-widest text-white/30">
                    <Link to="/" className="hover:text-primary transition-colors">Privacidade</Link>
                    <Link to="/" className="hover:text-primary transition-colors">Termos de Uso</Link>
                    <Link to="/" className="hover:text-primary transition-colors">Contato</Link>
                    <Link to="/" className="hover:text-primary transition-colors">Como Funciona</Link>
                    <Link to="/" className="hover:text-primary transition-colors">Minha Conta</Link>
                    <Link to="/" className="hover:text-primary transition-colors">Dúvidas</Link>
                  </div>
                  <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[9px] text-white/40 leading-relaxed uppercase tracking-tighter">
                      <span className="text-primary font-black">COMPROMISSO:</span> Todos os nossos leilões possuem sincronização atômica via servidor para garantir que todos os participantes disputem em tempo real, sem atrasos ou injustiças.
                    </p>
                  </div>
                </div>

                {/* Logo & Credits */}
                <div className="flex flex-col items-center md:items-end justify-between">
                  {logo_url ? (
                    <img 
                      src={logo_url} 
                      alt="Logo" 
                      className="object-contain opacity-60 hover:opacity-100 transition-all filter grayscale hover:grayscale-0" 
                      style={{ height: `${(logo_height || 40) * 0.8}px` }}
                    />
                  ) : (
                    <div className="text-xl font-black text-primary tracking-tighter uppercase italic opacity-50">LANCECERTO</div>
                  )}

                  <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
                    <div className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
                      SISTEMA DE LEILÃO DESENVOLVIDO POR <a href="https://www.ncbrasil.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-all font-black italic border-b border-primary/30 pb-0.5 hover:border-primary">NC BRASIL</a>
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] text-white/10 uppercase tracking-[0.4em] font-medium">
                      FEITO COM <Heart className="w-2 h-2 text-red-500/20 fill-red-500/20" /> PARA ARREMATADORES DE ELITE.
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Line */}
              <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-6 items-center">
                   <ShieldCheck className="w-4 h-4 text-primary opacity-40" />
                   <span className="text-[8px] text-white/20 font-black uppercase tracking-[0.3em]">Ambiente 100% Seguro e Criptografado</span>
                </div>
                <div className="text-[8px] text-white/10 font-bold uppercase tracking-widest">
                  Centavo do Milhão © Todos os direitos reservados.
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* Desktop Sidebar Chat */}
        <aside className={`hidden lg:flex flex-col border-l border-white/10 shrink-0 transition-all duration-500 relative bg-black/40 backdrop-blur-xl ${isChatExpanded ? 'w-80 xl:w-96' : 'w-20'}`}>
          {!isChatExpanded ? (
            <div className="flex flex-col items-center py-8 gap-6 h-full">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsChatExpanded(true)}
                className="w-12 h-12 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all animate-pulse"
              >
                <MessageSquare className="w-6 h-6" />
              </Button>
              <div className="flex-1 flex items-center justify-center">
                <p className="-rotate-90 font-black text-[10px] tracking-[0.5em] text-white/20 uppercase italic whitespace-nowrap">
                  CHAT GLOBAL
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full w-full">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                <span className="font-black text-xs text-primary italic uppercase tracking-widest">Chat Ativo</span>
                <Button variant="ghost" size="icon" onClick={() => setIsChatExpanded(false)} className="h-8 w-8 text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                {mounted && <GlobalActivityChat />}
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Chat Drawer Overlay */}
        <div className={`fixed inset-0 z-[60] lg:hidden transition-transform duration-300 transform ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowChat(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[85%] bg-background border-l border-white/10 shadow-2xl flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="font-black text-primary">LIVE CHAT</span>
              <Button size="icon" variant="ghost" onClick={() => setShowChat(false)}><X className="w-5 h-5" /></Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <GlobalActivityChat />
            </div>
          </div>
        </div>

        {/* Floating Chat Button for Mobile */}
        <Button 
          onClick={() => setShowChat(true)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl z-50 flex items-center justify-center p-0"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}

function Step({ icon, step, title, desc }: { icon: React.ReactNode, step: string, title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center text-center group">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 transform group-hover:scale-110">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center border-2 border-background">
          {step}
        </div>
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
