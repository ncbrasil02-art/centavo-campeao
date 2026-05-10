import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero, AuctionCard } from "@/components/HomeSections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, ShieldCheck, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

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

    // Subscribe to realtime changes
    const channel = supabase
      .channel('auctions_live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions' },
        (payload) => {
          setAuctions(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a));
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
...
