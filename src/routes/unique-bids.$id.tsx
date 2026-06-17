import { useEffect, useState, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Users, Sparkles, ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/unique-bids/$id")({
  component: UniqueBidPage,
});

const sb = supabase as any;
const brl = (n: number) =>
  Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = new Date(to).getTime() - now;
  if (diff <= 0) return <span>Encerrado</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    <span className="tabular-nums">
      {d > 0 && <>{d}d </>}{pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

function UniqueBidPage() {
  const { id } = Route.useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [value, setValue] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCampaign = useCallback(async () => {
    const { data } = await sb
      .from("unique_bid_campaigns")
      .select("*, product:products(*)")
      .eq("id", id)
      .maybeSingle();
    setCampaign(data);
    setProduct(data?.product ?? null);
    setLoading(false);
  }, [id]);

  const loadStatus = useCallback(async () => {
    const { data } = await sb.rpc("get_my_unique_bid_status", { p_campaign_id: id });
    setStatus(data);
  }, [id]);

  const loadBalance = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setBalance(null); return; }
    const { data } = await sb.from("profiles").select("bid_balance").eq("id", session.user.id).maybeSingle();
    setBalance(data?.bid_balance ?? 0);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    loadCampaign();
    loadStatus();
    loadBalance();
  }, [loadCampaign, loadStatus, loadBalance]);

  useEffect(() => {
    const ch = supabase
      .channel(`unique-bids-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "unique_bids", filter: `campaign_id=eq.${id}` }, () => {
        loadStatus();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "unique_bid_campaigns", filter: `id=eq.${id}` }, () => {
        loadCampaign();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, loadStatus, loadCampaign]);

  async function placeBid() {
    if (!user) return toast.error("Faça login para participar.");
    const v = parseFloat(value);
    if (!Number.isFinite(v)) return toast.error("Informe um valor.");
    setSubmitting(true);
    const { data, error } = await sb.rpc("place_unique_bid", { p_campaign_id: id, p_value: v });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    if (!data?.success) return toast.error(data?.message || "Não foi possível registrar.");
    toast.success(`Palpite de R$ ${v.toFixed(2)} registrado!`);
    setValue("");
    loadStatus();
    loadBalance();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Campanha não encontrada.</h1>
          <Link to="/" className="text-primary underline mt-4 inline-block">Voltar</Link>
        </div>
      </div>
    );
  }

  const isFinished = campaign.status === "finished";
  const isLive = campaign.status === "live";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Produto */}
          <Card className="overflow-hidden">
            <div className="aspect-square bg-muted">
              {product?.images?.[0] && (
                <img src={product.images[0]} alt={product?.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="p-6 space-y-2">
              <Badge variant="outline" className="border-primary/40 text-primary">
                <Sparkles className="w-3 h-3 mr-1" /> Menor Lance Único
              </Badge>
              <h1 className="text-3xl font-black tracking-tight">{campaign.title}</h1>
              {product?.name && <p className="text-muted-foreground">{product.name}</p>}
              {campaign.description && <p className="text-sm mt-2">{campaign.description}</p>}
              {product?.market_value && (
                <p className="text-sm text-muted-foreground">
                  Valor de mercado: <span className="font-semibold">R$ {Number(product.market_value).toFixed(2)}</span>
                </p>
              )}
            </div>
          </Card>

          {/* Painel */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Status</h2>
                <Badge variant={isLive ? "default" : "secondary"}>
                  {isLive ? "Aberta" : campaign.status === "finished" ? "Finalizada" : "Fechada"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Participantes</div>
                  <div className="text-xl font-bold">{status?.total_participants ?? 0}</div>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Total de palpites</div>
                  <div className="text-xl font-bold">{status?.total_bids ?? 0}</div>
                </div>
              </div>

              <div className="mt-4 text-sm">
                Faixa permitida: <span className="font-semibold">R$ {brl(campaign.min_bid_value)}</span> a{" "}
                <span className="font-semibold">R$ {brl(campaign.max_bid_value)}</span>
                <span className="text-muted-foreground"> (incremento R$ {brl(campaign.bid_step)})</span>
              </div>

              {isLive && status?.has_unique && (
                <div className="mt-4 p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="text-xs uppercase tracking-wider text-primary mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Dica
                  </div>
                  <p className="text-sm">
                    O menor lance único agora está entre{" "}
                    <span className="font-bold text-primary">R$ {Number(status.hint_min).toFixed(2)}</span> e{" "}
                    <span className="font-bold text-primary">R$ {Number(status.hint_max).toFixed(2)}</span>.
                  </p>
                </div>
              )}

              {isFinished && (
                <div className="mt-4 p-4 rounded-lg border border-amber-500/40 bg-amber-500/5 text-center">
                  <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  {campaign.winner_value != null ? (
                    <>
                      <p className="text-sm text-muted-foreground">Lance vencedor</p>
                      <p className="text-3xl font-black text-amber-400">R$ {Number(campaign.winner_value).toFixed(2)}</p>
                    </>
                  ) : (
                    <p className="text-sm">Nenhum lance único — sem vencedor.</p>
                  )}
                </div>
              )}
            </Card>

            {isLive && (
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-2">Enviar palpite</h2>
                <div className="flex items-center justify-between mb-3 p-3 rounded-lg bg-muted/60 border border-border">
                  <div>
                    <div className="text-xs text-muted-foreground">Seu saldo</div>
                    <div className="text-xl font-black">{balance ?? 0} <span className="text-xs font-normal text-muted-foreground">lances</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Custo por palpite</div>
                    <div className="text-xl font-black text-primary">1 <span className="text-xs font-normal text-muted-foreground">lance</span></div>
                  </div>
                </div>
                <div className="mb-3">
                  <Link to="/packages">
                    <Button variant="outline" size="sm" className="w-full">
                      <Sparkles className="w-3 h-3 mr-1" /> Comprar lances
                    </Button>
                  </Link>
                  {user && balance !== null && balance < 1 && (
                    <p className="text-xs text-amber-400 mt-2 text-center">
                      Saldo insuficiente para palpitar.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step={campaign.bid_step}
                    min={campaign.min_bid_value}
                    max={campaign.max_bid_value}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`R$ ${Number(campaign.min_bid_value).toFixed(2)}`}
                    disabled={submitting || !user}
                  />
                  <Button onClick={placeBid} disabled={submitting || !user}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Palpitar"}
                  </Button>
                </div>
                {!user && (
                  <p className="text-xs text-amber-400 mt-2">
                    <Link to="/auth" className="underline">Faça login</Link> para participar.
                  </p>
                )}
              </Card>
            )}

            {user && status?.my_bids?.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-bold mb-3">Meus palpites</h2>
                <ul className="space-y-2">
                  {status.my_bids.map((b: any, i: number) => (
                    <li key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <span className="font-mono font-bold">R$ {Number(b.value).toFixed(2)}</span>
                      {b.is_unique ? (
                        <span className="flex items-center gap-2 text-sm">
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Único
                          </Badge>
                          <span className="text-xs text-muted-foreground">posição #{b.rank}</span>
                        </span>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <XCircle className="w-3 h-3 mr-1" /> Repetido
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {isLive && campaign.ends_at && (
              <Card className="p-6 text-center">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Encerra em</div>
                <div className="text-3xl font-black text-primary">
                  <Countdown to={campaign.ends_at} />
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h2 className="text-lg font-bold mb-3">Como funciona</h2>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Escolha um valor dentro da faixa permitida, respeitando o incremento.</li>
                <li>Cada palpite custa 1 lance do seu saldo (você precisa ter comprado um pacote).</li>
                <li>Vence quem deu o <span className="text-foreground font-semibold">menor valor que ninguém mais escolheu</span>.</li>
                <li>Quando o cronômetro zerar (ou a equipe encerrar manualmente), o vencedor é apurado.</li>
              </ol>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold mb-3">Perguntas frequentes</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold">Posso dar vários palpites?</p>
                  <p className="text-muted-foreground">Sim. Cada palpite custa 1 lance e aumenta suas chances de ter um valor único.</p>
                </div>
                <div>
                  <p className="font-semibold">Os lances de boas-vindas valem aqui?</p>
                  <p className="text-muted-foreground">Não. No Menor Lance Único só valem lances comprados em pacotes.</p>
                </div>
                <div>
                  <p className="font-semibold">E se ninguém der um lance único?</p>
                  <p className="text-muted-foreground">A campanha encerra sem vencedor e os lances não são reembolsados.</p>
                </div>
                <div>
                  <p className="font-semibold">Como pago o prêmio se ganhar?</p>
                  <p className="text-muted-foreground">Você paga apenas o valor do seu lance vencedor, via PIX ou cartão.</p>
                </div>
              </div>
            </Card>

            <p className="text-xs text-muted-foreground text-center">
              Vence o menor valor escolhido por um único participante.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
