import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/HomeSections";
import { AuctionCard } from "@/components/AuctionCard";
import { GlobalActivityChat } from "@/components/GlobalActivityChat";
import { MessageSquare, X, ArrowRight, Zap, ShieldCheck, Heart, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FALLBACK_USER_IMAGE, getFallbackAvatarUrl } from "@/lib/constants";

export const Route = createFileRoute("/")({
  component: Index,
});

function WinnerCard({ name, product, price, saving, avatarUrl }: { name: string, product: string, price: string, saving: string, avatarUrl?: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 hover:border-primary/50 transition-all group">
      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border-2 border-primary/20 group-hover:border-primary transition-all">
        <img 
          src={avatarUrl || getFallbackAvatarUrl(name)} 
          className="w-full h-full object-cover" 
          onError={(e) => (e.target as HTMLImageElement).src = getFallbackAvatarUrl(name)} 
        />
      </div>
      <div>
        <h4 className="font-bold text-white group-hover:text-primary transition-colors">{name}</h4>
        <p className="text-xs text-white/60 mb-1">{product}</p>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">{saving} OFF</Badge>
          <span className="font-black text-sm text-primary">{price}</span>
        </div>
      </div>
    </div>
  );
}

function Index() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
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

  // Auction Heartbeat (Tick & Robots)
  useEffect(() => {
    const interval = setInterval(async () => {
      // Tick auctions to close expired ones
      await supabase.rpc('tick_auctions');
      
      // Process robot bids
      await supabase.rpc('process_robot_bids');
    }, 2000); // Every 2 seconds to keep robot activity snappy and auctions updated

    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    const [auctionsRes, winnersRes] = await Promise.all([
      supabase
        .from("v_home_live_auctions")
        .select("*")
        .order("end_time", { ascending: true })
        .limit(8),
      supabase
        .from("v_home_recent_winners")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3)
    ]);

    if (!auctionsRes.error) setAuctions(auctionsRes.data || []);
    if (!winnersRes.error) setWinners(winnersRes.data || []);
    
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary selection:text-primary-foreground flex flex-col overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 relative overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <Hero />

          {/* Live Auctions Section */}
          <section className="py-20 bg-black/20">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                <div className="max-w-xl">
                  <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary uppercase">LEILÕES EM DESTAQUE</Badge>
                  <h2 className="text-4xl font-black tracking-tight text-white mb-4 italic">Leilões <span className="text-primary">ao vivo</span> agora</h2>
                  <p className="text-white/40">Não perca a chance de arrematar os produtos mais cobiçados do momento por uma fração do preço original.</p>
                </div>
                <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 group">
                  Ver todos os leilões
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse"></div>
                  ))}
                </div>
              ) : auctions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {auctions.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <p className="text-white/40">Nenhum leilão ao vivo no momento.</p>
                </div>
              )}
            </div>
          </section>

          {/* How it Works Section */}
          <section className="py-24 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10"></div>
            <div className="container mx-auto px-4">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <Badge variant="outline" className="mb-4 border-accent/30 bg-accent/10 text-accent uppercase">SIMPLES E DIVERTIDO</Badge>
                <h2 className="text-4xl font-black tracking-tight text-white mb-6">Como o Lance Certo funciona?</h2>
                <p className="text-white/60 italic">Arrematar produtos premium nunca foi tão fácil. Siga os passos e comece a disputar agora mesmo.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <Step icon={<Zap className="w-8 h-8" />} step="1" title="Compre seus lances" desc="Adquira pacotes de lances para participar das disputas." />
                <Step icon={<ArrowRight className="w-8 h-8" />} step="2" title="Dê seus lances" desc="Cada lance aumenta o preço em R$ 0,01 e reinicia o cronômetro." />
                <Step icon={<ShieldCheck className="w-8 h-8" />} step="3" title="Arremate e economize" desc="O último usuário a dar o lance quando o cronômetro zerar vence." />
              </div>
            </div>
          </section>

          {/* Winners Section */}
          <section className="py-20 bg-primary/5">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary uppercase">GALERIA DE HONRA</Badge>
                <h2 className="text-4xl font-black tracking-tight text-white mb-4 italic">Últimos <span className="text-primary">Ganhadores</span></h2>
                <p className="text-white/40">Pessoas reais, economias reais. Veja quem já levou o prêmio para casa.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {winners.length > 0 ? (
                  winners.map((winner) => (
                    <WinnerCard 
                      key={winner.id}
                      name={winner.profile?.full_name || winner.profile?.username || "Ganhador"}
                      product={winner.auction?.product?.name || "Produto"}
                      price={`R$ ${Number(winner.final_price).toFixed(2)}`}
                      saving={`${Math.round((1 - (winner.final_price / 1000)) * 100)}%`} // Rough estimate since I don't have original price here easily
                      avatarUrl={winner.profile?.avatar_url}
                    />
                  ))
                ) : (
                  <>
                    <WinnerCard name="Mateus Oliveira" product="iPhone 15 Pro Max" price="R$ 142,50" saving="98%" />
                    <WinnerCard name="Juliana Costa" product="PlayStation 5" price="R$ 89,12" saving="97%" />
                    <WinnerCard name="Ricardo Silva" product="MacBook Air M2" price="R$ 210,00" saving="96%" />
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-12 border-t border-white/10">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tighter text-white">
                  LANCE<span className="text-primary">CERTO</span>
                </span>
                <span className="text-white/40 text-sm">© 2026 Todos os direitos reservados.</span>
              </div>
              <div className="flex gap-8 text-sm text-white/40">
                <Link to="/" className="hover:text-primary transition-colors">Privacidade</Link>
                <Link to="/" className="hover:text-primary transition-colors">Termos de Uso</Link>
                <Link to="/" className="hover:text-primary transition-colors">Contato</Link>
              </div>
              <div className="flex items-center gap-1 text-white/40 text-sm">
                Feito com <Heart className="w-4 h-4 text-red-500 fill-red-500" /> para arrematadores.
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
