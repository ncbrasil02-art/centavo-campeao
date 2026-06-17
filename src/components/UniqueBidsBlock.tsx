import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
                      Palpite R$ {brl(c.min_bid_value)} a R$ {brl(c.max_bid_value)}
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
                      Vencedor: R$ {brl(c.winner_value)}
                    </p>
                  )}
                </div>
              </Link>
            </Card>
          ))}
        </div>

        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <Card className="p-6 border-primary/20 bg-primary/5">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Como funciona
            </h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Escolha um valor dentro da faixa permitida.</li>
              <li>Cada palpite custa 1 lance do seu saldo.</li>
              <li>Vence quem deu o <span className="text-foreground font-semibold">menor valor que ninguém mais escolheu</span>.</li>
              <li>Quando o cronômetro encerra, o vencedor é apurado e paga apenas o valor do lance.</li>
            </ol>
          </Card>
          <Card className="p-6">
            <h3 className="font-bold mb-3">Regras rápidas</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Você pode dar quantos palpites quiser (1 lance cada).</li>
              <li>• Lances de boas-vindas <span className="text-foreground font-semibold">não valem</span> aqui — só lances comprados.</li>
              <li>• Sem vencedor único, a campanha encerra sem premiação.</li>
              <li>• Pagamento do prêmio via PIX ou cartão.</li>
            </ul>
          </Card>
        </div>
      </div>

    </section>
  );
}
