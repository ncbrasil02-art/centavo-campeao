import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Target } from "lucide-react";
import { useTimeSync } from "@/hooks/useTimeSync";

const sb = supabase as any;
const brl = (n: number) =>
  Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Countdown({ to }: { to: string }) {
  const { getAdjustedNow } = useTimeSync();
  const [now, setNow] = useState(() => getAdjustedNow());
  useEffect(() => {
    const i = setInterval(() => setNow(getAdjustedNow()), 1000);
    return () => clearInterval(i);
  }, [getAdjustedNow]);
  const diff = new Date(to).getTime() - now;
  if (diff <= 0) return <>Encerrado</>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return <>Encerra em {d}d {h}h {m}m</>;
  return <>Encerra em {h.toString().padStart(2,"0")}:{m.toString().padStart(2,"0")}:{s.toString().padStart(2,"0")}</>;
}

export function UniqueBidsBlock() {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    sb.from("unique_bid_campaigns")
      .select("*, product:products(*)")
      .in("status", ["live", "finished"])
      .order("created_at", { ascending: false })
      .limit(8)
      .then((r: any) => setCampaigns(r.data || []));
  }, []);

  if (campaigns.length === 0) return null;

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Badge variant="outline" className="mb-2 border-primary/30 bg-primary/10 text-primary uppercase tracking-widest text-[10px]">
            <Sparkles className="w-3 h-3 mr-1" /> Menor Lance Único
          </Badge>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight italic">
            Leve por <span className="text-primary">centavos</span>.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {campaigns.map((c) => (
            <Card key={c.id} className="overflow-hidden group hover:border-primary/40 transition-colors">
              <Link to="/unique-bids/$id" params={{ id: c.id }} className="block">
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {c.product?.images?.[0] && (
                    <img
                      src={c.product.images[0]}
                      alt={c.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                  <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                    {c.status === "finished" ? "Finalizada" : "Aberta"}
                  </Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-bold line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{c.product?.name}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Target className="w-3 h-3" />
                      Palpite de R$ 0,01 a R$ 100,00
                    </span>
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                  {c.status === "live" && c.ends_at && (
                    <p className="text-xs text-primary mt-2 font-semibold tabular-nums">
                      ⏳ <Countdown to={c.ends_at} />
                    </p>
                  )}
                  {c.status === "finished" && c.winner_value != null && (
                    <p className="text-xs text-amber-400 mt-2">
                      Vencedor pagou <span className="font-bold">R$ {brl(c.winner_value)}</span>
                    </p>
                  )}
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
