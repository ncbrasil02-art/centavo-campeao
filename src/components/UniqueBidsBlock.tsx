import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Target } from "lucide-react";

const sb = supabase as any;

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
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-end justify-between mb-8 gap-4">
          <div>
            <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/10 text-primary uppercase">
              <Sparkles className="w-3 h-3 mr-1" /> Novo modo
            </Badge>
            <h2 className="text-4xl font-black tracking-tight italic">
              Menor <span className="text-primary">Lance Único</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mt-2">
              Dê o menor valor que ninguém mais escolheu e leve o produto. Quanto mais estratégico, maior a chance.
            </p>
          </div>
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
                      R$ {Number(c.min_bid_value).toFixed(2)} – {Number(c.max_bid_value).toFixed(2)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                  {c.status === "finished" && c.winner_value != null && (
                    <p className="text-xs text-amber-400 mt-2">
                      Vencedor: R$ {Number(c.winner_value).toFixed(2)}
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
