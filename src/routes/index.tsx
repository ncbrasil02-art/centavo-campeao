import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero, AuctionCard } from "@/components/HomeSections";
import { GlobalActivityChat } from "@/components/GlobalActivityChat";
import { MessageSquare, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, ShieldCheck, Heart, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

function WinnerCard({ name, product, price, saving }: { name: string, product: string, price: string, saving: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 hover:border-primary/50 transition-all group">
      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border-2 border-primary/20 group-hover:border-primary transition-all">
        <User className="w-8 h-8 text-white/40" />
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuctions() {
      const { data, error } = await supabase
        .from("auctions")
        .select(`
          *,
          product:products(*),
          last_bidder:profiles(username)
        `)
        .eq("status", "live")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching auctions:", error);
      } else {
        setAuctions(data || []);
      }
      setLoading(false);
    }

    fetchAuctions();

    const fetchAuctionUpdate = async (id: string) => {
      const { data } = await supabase
        .from("auctions")
        .select(`
          *,
          product:products(*),
          last_bidder:profiles(username)
        `)
        .eq("id", id)
        .single();
      
      if (data) {
        setAuctions(prev => prev.map(a => a.id === id ? data : a));
      }
    };

    // Subscribe to realtime changes
    const channel = supabase
      .channel('auctions_live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions' },
        (payload) => {
          fetchAuctionUpdate(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      <Hero />

      {/* Live Auctions Section */}
      <section className="py-20 bg-black/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div className="max-w-xl">
              <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary uppercase">LEILÕES EM DESTAQUE</Badge>
              <h2 className="text-4xl font-black tracking-tight text-white mb-4">Leilões <span className="text-primary italic">ao vivo</span> agora</h2>
              <p className="text-white/40">Não perca a chance de arrematar os produtos mais cobiçados do momento por uma fração do preço original.</p>
            </div>
            <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 group">
              Ver todos os leilões
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse"></div>
              ))}
            </div>
          ) : auctions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <Badge variant="outline" className="mb-4 border-accent/30 bg-accent/10 text-accent">SIMPLES E DIVERTIDO</Badge>
            <h2 className="text-4xl font-black tracking-tight text-white mb-6">Como o Lance Certo funciona?</h2>
            <p className="text-white/60">Arrematar produtos premium nunca foi tão fácil. Siga os passos e comece a disputar agora mesmo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 rotate-3 group-hover:rotate-0">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Compre seus lances</h3>
              <p className="text-white/40">Adquira pacotes de lances para participar das disputas. Cada lance custa apenas 1 crédito.</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 -rotate-3 group-hover:rotate-0">
                <ArrowRight className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Dê seus lances</h3>
              <p className="text-white/40">Cada lance dado aumenta o preço do produto em R$ 0,01 e reinicia o cronômetro em alguns segundos.</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 rotate-6 group-hover:rotate-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Arremate e economize</h3>
              <p className="text-white/40">O último usuário a dar o lance quando o cronômetro zerar vence o leilão. Simples assim!</p>
            </div>
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
            <WinnerCard name="Mateus Oliveira" product="iPhone 15 Pro Max" price="R$ 142,50" saving="98%" />
            <WinnerCard name="Juliana Costa" product="PlayStation 5" price="R$ 89,12" saving="97%" />
            <WinnerCard name="Ricardo Silva" product="MacBook Air M2" price="R$ 210,00" saving="96%" />
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
  );
}
