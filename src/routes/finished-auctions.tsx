import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { AuctionCard } from "@/components/AuctionCard";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/finished-auctions")({
  component: FinishedAuctions,
});

function FinishedAuctions() {
  const [finishedAuctions, setFinishedAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinishedAuctions();
  }, []);

  async function fetchFinishedAuctions() {
    const { data, error } = await supabase
      .from("auctions")
      .select(`
        *,
        product:products(*),
        last_bidder:profiles(username, avatar_url)
      `)
      .eq("status", "finished")
      .order("end_time", { ascending: false });

    if (error) {
      console.error("Error fetching finished auctions:", error);
      toast.error("Erro ao carregar leilões encerrados");
    } else {
      setFinishedAuctions(data || []);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-20 mt-16">
        <div className="mb-12">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary uppercase">HISTÓRICO COMPLETO</Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground italic uppercase">Todos os Leilões <span className="text-primary">Arrematados</span></h1>
          <p className="text-muted-foreground mt-4 max-w-2xl">Confira todos os produtos que já foram arrematados em nossa plataforma com descontos inacreditáveis.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse"></div>
            ))}
          </div>
        ) : finishedAuctions.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {finishedAuctions.map((auction, idx) => (
              <motion.div
                key={auction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 1) }}
              >
                <AuctionCard auction={auction} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-40 bg-muted/30 rounded-3xl border border-dashed border-border">
            <p className="text-muted-foreground">Nenhum leilão encerrado encontrado.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
