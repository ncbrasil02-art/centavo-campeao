import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Target } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
            <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/10 text-primary uppercase tracking-widest">
              <Sparkles className="w-3 h-3 mr-1" /> Exclusivo • Edição limitada • Poucos lugares
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight italic leading-[1.05]">
              Pague o <span className="text-primary">menor lance único</span>
              <br className="hidden md:block" /> e leve para casa por <span className="text-primary">centavos</span>.
            </h2>
            <p className="text-muted-foreground max-w-2xl mt-4 text-base md:text-lg leading-relaxed">
              Esqueça leilão tradicional. Aqui <span className="text-foreground font-semibold">não existe disputa de quem dá mais</span> — vence quem teve a coragem de escolher <span className="text-foreground font-semibold">o valor que ninguém mais pensou</span>. Um iPhone por R$ 3,47? Um PlayStation por R$ 1,12? Já aconteceu. Pode ser sua vez.
            </p>
            <p className="text-sm md:text-base mt-3 text-foreground/80 max-w-2xl">
              💡 <span className="font-semibold">A lógica é simples:</span> entre todos os palpites, ganha o <span className="text-primary font-semibold">menor valor que apareceu uma única vez</span>. Pense como ninguém pensaria — e leve produtos premium por uma fração do preço de mercado.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-xs md:text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> Sem disputa, sem stress</span>
              <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-primary" /> Você define quanto pagar</span>
              <span className="flex items-center gap-1.5"><ArrowRight className="w-3.5 h-3.5 text-primary" /> Resultado garantido em horas</span>
              <span className="flex items-center gap-1.5">🔒 100% transparente e auditável</span>
            </div>
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

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <div className="text-2xl mb-1">🔒</div>
            <p className="text-xs font-bold">Pagamento seguro</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">PIX e cartão com criptografia</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <div className="text-2xl mb-1">✅</div>
            <p className="text-xs font-bold">Apuração auditável</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Resultado público e verificável</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <div className="text-2xl mb-1">🚚</div>
            <p className="text-xs font-bold">Entrega garantida</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Enviamos para todo o Brasil</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <div className="text-2xl mb-1">💬</div>
            <p className="text-xs font-bold">Suporte humano</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Atendimento via WhatsApp</p>
          </div>
        </div>

        <Card className="mt-6 p-6 md:p-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary uppercase tracking-widest text-[10px]">
              <Sparkles className="w-3 h-3 mr-1" /> FAQ
            </Badge>
          </div>
          <h3 className="text-2xl md:text-3xl font-black tracking-tight mb-1">Tudo o que você precisa saber</h3>
          <p className="text-sm text-muted-foreground mb-6">Respostas diretas para você palpitar com confiança.</p>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1">
              <AccordionTrigger className="text-left font-semibold">O que é o Menor Lance Único?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                É uma modalidade exclusiva onde vence quem escolher o <span className="text-foreground font-semibold">menor valor que apareceu uma única vez</span> entre todos os palpites. Sem disputa, sem leilão — pura estratégia.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2">
              <AccordionTrigger className="text-left font-semibold">Posso dar quantos palpites quiser?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sim. Cada palpite consome <span className="text-foreground font-semibold">1 lance</span> do seu saldo e aumenta suas chances de cobrir um valor único dentro da faixa permitida.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3">
              <AccordionTrigger className="text-left font-semibold">Os lances de boas-vindas valem aqui?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Não. No Menor Lance Único só são aceitos <span className="text-foreground font-semibold">lances comprados em pacotes</span>. Isso garante a integridade da apuração.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4">
              <AccordionTrigger className="text-left font-semibold">E se ninguém der um valor único?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Caso nenhum palpite seja único, a campanha encerra <span className="text-foreground font-semibold">sem vencedor</span>. Os lances utilizados não são reembolsados, mas você pode tentar em campanhas futuras.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q5">
              <AccordionTrigger className="text-left font-semibold">Quanto vou pagar se eu ganhar?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Apenas o <span className="text-foreground font-semibold">valor exato do seu lance vencedor</span> — pode ser centavos ou poucos reais. Pagamento por PIX ou cartão, e enviamos para todo o Brasil.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q6">
              <AccordionTrigger className="text-left font-semibold">A apuração é transparente?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Totalmente. Quando o cronômetro encerra, todos os palpites ficam <span className="text-foreground font-semibold">públicos e auditáveis</span>. Você consegue verificar exatamente por que aquele valor foi o vencedor.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q7">
              <AccordionTrigger className="text-left font-semibold">Quando recebo meu prêmio?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Após confirmação do pagamento, despachamos em até <span className="text-foreground font-semibold">3 dias úteis</span>, com código de rastreio. O suporte humano acompanha você por WhatsApp até a entrega.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>


    </section>
  );
}
