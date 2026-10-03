import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  Clock3,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTimeSync } from "@/hooks/useTimeSync";
import { FALLBACK_PRODUCT_IMAGE, getFallbackAvatarUrl } from "@/lib/constants";

const sb = supabase as any;

type Campaign = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  ends_at?: string | null;
  closed_at?: string | null;
  min_bid_value: number;
  max_bid_value: number;
  winner_value?: number | null;
  product?: {
    name?: string | null;
    images?: string[] | null;
    market_value?: number | null;
  } | null;
  winner?: { username?: string | null; avatar_url?: string | null } | null;
};

type RecentBid = {
  id: string;
  created_at: string;
  profile?: { username?: string | null; avatar_url?: string | null } | null;
};

const brl = (value: number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Countdown({ to }: { to: string }) {
  const { getAdjustedNow } = useTimeSync();
  const [now, setNow] = useState(() => getAdjustedNow());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(getAdjustedNow()), 1000);
    return () => window.clearInterval(interval);
  }, [getAdjustedNow]);

  const difference = Math.max(0, new Date(to).getTime() - now);
  const values = [
    { label: "Dias", value: Math.floor(difference / 86400000) },
    { label: "Horas", value: Math.floor((difference % 86400000) / 3600000) },
    { label: "Min", value: Math.floor((difference % 3600000) / 60000) },
    { label: "Seg", value: Math.floor((difference % 60000) / 1000) },
  ];

  return (
    <div className="grid w-full grid-cols-4 divide-x divide-unique-line" aria-label="Tempo restante">
      {values.map(({ label, value }) => (
        <div className="px-1 text-center" key={label}>
          <div className="font-unique-display text-lg tabular-nums text-unique-foreground sm:text-xl">
            {String(value).padStart(2, "0")}
          </div>
          <div className="text-[9px] font-semibold uppercase text-unique-muted">{label}</div>
        </div>
      ))}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-unique-line bg-unique-card shadow-unique transition duration-300 hover:-translate-y-1 hover:border-unique-accent/60">
      <div className="relative aspect-[4/3] overflow-hidden bg-unique-surface">
        <img
          src={campaign.product?.images?.[0] || FALLBACK_PRODUCT_IMAGE}
          alt={campaign.product?.name || campaign.title}
          className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
          }}
        />
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-unique-line bg-unique-deep/90 px-3 py-1.5 text-[10px] font-bold uppercase text-unique-foreground backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-unique-live" /> Ao vivo
        </div>
        {campaign.ends_at && (
          <div className="absolute inset-x-4 bottom-3 rounded-md border border-unique-line bg-unique-deep/90 px-2 py-2 backdrop-blur-md">
            <Countdown to={campaign.ends_at} />
          </div>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="font-unique-display text-xl leading-tight text-unique-foreground">{campaign.title}</h3>
          {campaign.product?.name && (
            <p className="mt-1 line-clamp-1 text-sm text-unique-muted">{campaign.product.name}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-unique-line bg-unique-panel p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase text-unique-muted">Valor de referência</p>
            <p className="font-unique-display text-lg text-unique-foreground">
              {campaign.product?.market_value ? brl(campaign.product.market_value) : "Consulte a campanha"}
            </p>
          </div>
          <Button asChild className="h-11 bg-unique-accent px-6 font-bold text-unique-foreground shadow-unique-accent hover:bg-unique-accent/90">
            <Link to="/unique-bids/$id" params={{ id: campaign.id }}>
              Participar <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function WinnerCarousel({ campaigns }: { campaigns: Campaign[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (campaigns.length < 2) return;
    const interval = window.setInterval(() => {
      setActive((current) => (current + 1) % campaigns.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [campaigns.length]);

  if (campaigns.length === 0) return null;
  const current = campaigns[active];

  const move = (direction: number) => {
    setActive((currentIndex) => (currentIndex + direction + campaigns.length) % campaigns.length);
  };

  return (
    <div className="relative mx-auto max-w-3xl px-11">
      <Button variant="ghost" size="icon" onClick={() => move(-1)} aria-label="Campanha anterior" className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-unique-line bg-unique-panel text-unique-foreground hover:bg-unique-accent">
        <ArrowLeft />
      </Button>
      <div className="mx-auto grid max-w-xl animate-fade-in grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] overflow-hidden rounded-lg border border-unique-line bg-unique-card shadow-unique" key={current.id}>
        <div className="flex min-h-64 items-center bg-unique-surface p-4">
          <img
            src={current.product?.images?.[0] || FALLBACK_PRODUCT_IMAGE}
            alt={current.product?.name || current.title}
            className="h-full w-full object-contain"
            onError={(event) => { event.currentTarget.src = FALLBACK_PRODUCT_IMAGE; }}
          />
        </div>
        <div className="flex min-w-0 flex-col justify-center p-5 sm:p-7">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-unique-muted">
            <Trophy className="text-unique-live" /> Campanha encerrada
          </div>
          <h3 className="font-unique-display text-lg leading-tight text-unique-foreground sm:text-2xl">{current.title}</h3>
          <div className="mt-5 rounded-md bg-unique-accent/20 p-3 text-center">
            <p className="text-[10px] font-bold uppercase text-unique-muted">Lance vencedor</p>
            <p className="font-unique-display text-2xl text-unique-foreground">{brl(current.winner_value || 0)}</p>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <img
              src={current.winner?.avatar_url || getFallbackAvatarUrl(current.winner?.username || "Vencedor")}
              alt=""
              className="h-9 w-9 rounded-full border border-unique-line object-cover"
            />
            <div className="min-w-0">
              <p className="text-[10px] uppercase text-unique-muted">Vencedor</p>
              <p className="truncate text-sm font-bold text-unique-foreground">{current.winner?.username || "Participante premiado"}</p>
            </div>
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={() => move(1)} aria-label="Próxima campanha" className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-unique-line bg-unique-panel text-unique-foreground hover:bg-unique-accent">
        <ArrowRight />
      </Button>
      <div className="mt-5 flex justify-center gap-2">
        {campaigns.map((campaign, index) => (
          <button
            type="button"
            key={campaign.id}
            onClick={() => setActive(index)}
            aria-label={`Mostrar campanha ${index + 1}`}
            className={`h-2 rounded-full transition-all ${index === active ? "w-7 bg-unique-accent" : "w-2 bg-unique-line"}`}
          />
        ))}
      </div>
    </div>
  );
}

const faq = [
  ["Como funciona o menor lance único?", "Você escolhe um valor dentro da faixa da campanha. Vence o menor valor que tenha sido escolhido por apenas uma pessoa."],
  ["Posso enviar mais de um palpite?", "Sim. Cada palpite custa 1 lance e aumenta suas chances de encontrar um valor baixo que ninguém repetiu."],
  ["As dicas revelam o valor vencedor?", "Não. Elas mostram apenas uma faixa aproximada do menor lance único naquele momento e podem mudar a cada novo palpite."],
  ["Quando o vencedor é anunciado?", "A apuração é automática após o encerramento. O resultado aparece na campanha assim que a conferência termina."],
  ["O que acontece se meu palpite for repetido?", "Ele deixa de ser único, mas você pode enviar outro palpite enquanto a campanha estiver aberta."],
];

export function UniqueBidsBlock() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentBids, setRecentBids] = useState<RecentBid[]>([]);

  useEffect(() => {
    const load = async () => {
      const [campaignResult, bidResult] = await Promise.all([
        sb.from("unique_bid_campaigns")
          .select("*, product:products(*), winner:profiles!unique_bid_campaigns_winner_user_id_fkey(username, avatar_url)")
          .in("status", ["live", "finished"])
          .order("created_at", { ascending: false })
          .limit(12),
        sb.from("unique_bids")
          .select("id, created_at, profile:profiles!unique_bids_user_id_fkey(username, avatar_url)")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      setCampaigns(campaignResult.data || []);
      setRecentBids(bidResult.data || []);
    };

    load();
  }, []);

  const live = useMemo(() => campaigns.filter((campaign) => campaign.status === "live"), [campaigns]);
  const finished = useMemo(
    () => campaigns.filter((campaign) => campaign.status === "finished" && campaign.winner_value != null),
    [campaigns],
  );

  if (campaigns.length === 0) return null;

  const activity = recentBids.length > 0 ? [...recentBids, ...recentBids] : [];

  return (
    <section className="unique-experience overflow-hidden bg-unique-deep py-16 text-unique-foreground sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-unique-line bg-unique-panel px-4 py-2 text-[10px] font-bold uppercase">
            <Sparkles className="text-unique-live" /> Campanhas em andamento
          </div>
          <h2 className="font-unique-display text-3xl leading-tight sm:text-5xl">Participe com seus lances</h2>
          <p className="mx-auto mt-4 max-w-xl text-unique-muted">Encontre um valor baixo que ninguém mais escolheu e concorra a produtos incríveis.</p>
        </div>

        {live.length > 0 && (
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {live.map((campaign) => <CampaignCard campaign={campaign} key={campaign.id} />)}
          </div>
        )}

        <div className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-unique-line bg-unique-panel p-5 md:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-unique-live">Movimento agora</p>
                <h3 className="font-unique-display text-xl">Palpites recentes</h3>
              </div>
              <Users className="text-unique-accent" />
            </div>
            {activity.length > 0 ? (
              <div className="overflow-hidden">
                <div className="flex w-max animate-unique-marquee gap-3 motion-reduce:animate-none">
                  {activity.map((bid, index) => (
                    <div className="flex w-56 items-center gap-3 rounded-md border border-unique-line bg-unique-deep p-3" key={`${bid.id}-${index}`}>
                      <img src={bid.profile?.avatar_url || getFallbackAvatarUrl(bid.profile?.username || "Participante")} alt="" className="h-9 w-9 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{bid.profile?.username || "Participante"}</p>
                        <p className="text-xs text-unique-live">enviou um palpite</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-unique-muted">Os participantes aparecerão aqui assim que enviarem seus palpites.</p>
            )}
          </div>

          <div className="rounded-lg border border-unique-accent/40 bg-unique-accent/15 p-5">
            <Target className="mb-5 text-unique-live" />
            <p className="text-[10px] font-bold uppercase text-unique-live">Dica rápida</p>
            <h3 className="mt-1 font-unique-display text-lg">Comece baixo, pense único.</h3>
            <p className="mt-3 text-sm text-unique-muted">Evite números redondos. Valores menos óbvios costumam ter menor chance de repetição.</p>
          </div>
        </div>

        {finished.length > 0 && (
          <div className="py-24">
            <div className="mb-10 text-center">
              <div className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase text-unique-live"><Clock3 /> Histórico real</div>
              <h2 className="font-unique-display text-3xl sm:text-4xl">Últimas campanhas realizadas</h2>
            </div>
            <WinnerCarousel campaigns={finished} />
          </div>
        )}

        <div className="mx-auto max-w-3xl pt-12">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-unique-line px-4 py-2 text-[10px] font-bold uppercase"><CircleHelp className="text-unique-live" /> Tudo o que você precisa saber</div>
            <h2 className="font-unique-display text-3xl sm:text-4xl">Como funciona</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faq.map(([question, answer], index) => (
              <AccordionItem value={`faq-${index}`} key={question} className="rounded-lg border border-unique-line bg-unique-panel px-5">
                <AccordionTrigger className="text-left font-bold text-unique-foreground hover:no-underline">{question}</AccordionTrigger>
                <AccordionContent className="text-unique-muted">{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-lg border border-unique-line bg-unique-card p-6 text-center sm:flex-row sm:text-left">
            <div>
              <p className="font-unique-display text-lg">Pronto para tentar?</p>
              <p className="text-sm text-unique-muted">Escolha uma campanha e envie seu primeiro palpite.</p>
            </div>
            {live[0] && (
              <Button asChild className="h-11 bg-unique-accent px-6 font-bold text-unique-foreground hover:bg-unique-accent/90">
                <Link to="/unique-bids/$id" params={{ id: live[0].id }}><Zap /> Participar agora</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}