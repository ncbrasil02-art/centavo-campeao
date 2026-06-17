import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Target } from "lucide-react";
import { useTimeSync } from "@/hooks/useTimeSync";
import { ProductImageSlideshow } from "@/components/ProductImageSlideshow";

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
            <Card
              key={c.id}
              className="overflow-hidden group relative border-border/60 hover:border-primary/50 hover:shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.35)] transition-all duration-300"
            >
              <Link to="/unique-bids/$id" params={{ id: c.id }} className="block">
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {c.product?.images?.[0] && (
                    <img
                      src={c.product.images[0]}
                      alt={c.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

                  <Badge
                    className={`absolute top-2 left-2 shadow-lg ${
                      c.status === "finished"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground animate-pulse"
                    }`}
                  >
                    {c.status === "finished" ? "Finalizada" : "● Aberta"}
                  </Badge>

                  {c.status === "live" && c.ends_at && (
                    <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 border border-primary/30">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">Encerra</p>
                      <p className="text-xs font-bold text-primary tabular-nums leading-tight">
                        <Countdown to={c.ends_at} />
                      </p>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="font-black text-base text-foreground line-clamp-1 drop-shadow">{c.title}</h3>
                    {c.product?.name && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{c.product.name}</p>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-primary font-bold flex items-center justify-center gap-1">
                      <Target className="w-3 h-3" /> Palpite de
                    </p>
                    <p className="text-sm font-black text-foreground tabular-nums">
                      R$ 0,01 <span className="text-muted-foreground font-normal">a</span> R$ 100,00
                    </p>
                  </div>

                  {c.status === "finished" && c.winner_value != null ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Vencedor pagou</span>
                      <span className="font-black text-amber-400 tabular-nums">R$ {brl(c.winner_value)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 text-xs font-bold text-primary group-hover:gap-2 transition-all">
                      Dar meu palpite <ArrowRight className="w-3.5 h-3.5" />
                    </div>
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
