import { useState, useEffect, useCallback } from "react";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  User, Phone, Hash, Wallet, LogOut, Camera, Zap, Gavel, Trophy, Package,
  LifeBuoy, LayoutDashboard, Tag, Copy, ChevronDown, MessageSquare, Send, CheckCircle2, Clock,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFallbackAvatarUrl } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { AuctionClaimPanel } from "@/components/AuctionClaimPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/profile")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  component: ProfilePage,
});

const fmtBRL = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [winners, setWinners] = useState<any[]>([]);
  const [selectedAuctionForClaim, setSelectedAuctionForClaim] = useState<any>(null);

  // Account form
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [gender, setGender] = useState("");

  const refreshAll = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [pRes, sRes, stRes, wRes] = await Promise.all([
        (supabase.rpc("get_my_profile") as any).maybeSingle(),
        supabase.from("profile_secrets").select("cpf, phone").eq("id", session.user.id).maybeSingle(),
        supabase.rpc("get_my_dashboard_stats"),
        supabase.rpc("get_my_winners"),
      ]);
      const firstErr = pRes.error || sRes.error || stRes.error || wRes.error;
      if (firstErr) {
        console.error("[profile] refreshAll error:", firstErr);
        toast.error("Não foi possível carregar todas as informações do painel.");
      }
      const profileData: any = pRes.data;
      if (profileData) {
        setProfile(profileData);
        setUsername(profileData.username || "");
        setFullName(profileData.full_name || "");
        setGender(profileData.gender || "not_specified");
      }
      if (sRes.data) { setPhone((sRes.data as any).phone || ""); setCpf((sRes.data as any).cpf || ""); }
      setStats(stRes.data || null);
      setWinners((wRes.data as any[]) || []);
    } catch (err: any) {
      console.error("[profile] refreshAll exception:", err);
      toast.error(err?.message || "Erro ao carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error: pErr } = await supabase.from("profiles")
        .update({ username, full_name: fullName, gender, phone }).eq("id", session.user.id);
      if (pErr) throw pErr;
      const { error: sErr } = await supabase.from("profile_secrets")
        .update({ phone, cpf }).eq("id", session.user.id);
      if (sErr) throw sErr;
      toast.success("Perfil atualizado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <div className="animate-pulse text-primary font-black uppercase tracking-[0.3em]">Carregando…</div>
        </div>
      </div>
    );
  }

  const pendingCount = stats?.pending_payment_count || 0;
  const purchasesCount = stats?.purchases_count || 0;
  const couponCode = purchasesCount > 0 ? "VOLTOU10" : "PRIMEIRACOMPRA15";
  const couponPct = purchasesCount > 0 ? 10 : 15;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-muted/30 p-6 rounded-3xl border border-border">
            <div className="flex items-center gap-5">
              <div className="relative group">
                <Avatar className="w-20 h-20 border-4 border-primary/20 shadow-xl">
                  <AvatarImage src={profile?.avatar_url || getFallbackAvatarUrl(profile?.username)} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl font-black">
                    {profile?.username?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </button>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                  {profile?.username || "Usuário"}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Badge className="bg-primary/15 text-primary border border-primary/20 font-bold">
                    <Wallet className="w-3.5 h-3.5 mr-1" /> {profile?.bid_balance || 0} lances
                  </Badge>
                  {pendingCount > 0 && (
                    <Badge className="bg-amber-500 text-black font-black">
                      {pendingCount} pagamento(s) pendente(s)
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/packages"><Package className="w-4 h-4 mr-2" /> Comprar lances</Link>
              </Button>
              <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </Button>
            </div>
          </header>

          {/* Discount banner */}
          <DiscountBanner code={couponCode} pct={couponPct} firstPurchase={purchasesCount === 0} />

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-muted/30 p-1 rounded-2xl">
              <TabsTrigger value="overview"><LayoutDashboard className="w-4 h-4 mr-1.5" /> Visão geral</TabsTrigger>
              <TabsTrigger value="pending">
                <Zap className="w-4 h-4 mr-1.5" /> A pagar
                {pendingCount > 0 && <span className="ml-1.5 bg-amber-500 text-black rounded-full px-1.5 text-[10px] font-black">{pendingCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="bids"><Gavel className="w-4 h-4 mr-1.5" /> Meus lances</TabsTrigger>
              <TabsTrigger value="unique"><Trophy className="w-4 h-4 mr-1.5" /> Menor lance único</TabsTrigger>
              <TabsTrigger value="purchases"><Package className="w-4 h-4 mr-1.5" /> Pacotes</TabsTrigger>
              <TabsTrigger value="support"><LifeBuoy className="w-4 h-4 mr-1.5" /> Suporte</TabsTrigger>
              <TabsTrigger value="account"><User className="w-4 h-4 mr-1.5" /> Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <OverviewTab stats={stats} balance={profile?.bid_balance || 0} pendingCount={pendingCount} />
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              <PendingPaymentsTab winners={winners} onSelect={setSelectedAuctionForClaim} />
            </TabsContent>

            <TabsContent value="bids" className="mt-6">
              <BidsHistoryTab />
            </TabsContent>

            <TabsContent value="unique" className="mt-6">
              <UniqueBidsTab />
            </TabsContent>

            <TabsContent value="purchases" className="mt-6">
              <PurchasesTab couponCode={couponCode} couponPct={couponPct} />
            </TabsContent>

            <TabsContent value="support" className="mt-6">
              <SupportTab />
            </TabsContent>

            <TabsContent value="account" className="mt-6">
              <AccountTab
                username={username} setUsername={setUsername}
                fullName={fullName} setFullName={setFullName}
                phone={phone} setPhone={setPhone}
                cpf={cpf} setCpf={setCpf}
                gender={gender} setGender={setGender}
                loading={loading} onSubmit={handleUpdateProfile}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={!!selectedAuctionForClaim} onOpenChange={() => setSelectedAuctionForClaim(null)}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase italic">
              Reivindicar <span className="text-primary">prêmio</span>
            </DialogTitle>
          </DialogHeader>
          {selectedAuctionForClaim && (
            <AuctionClaimPanel
              auctionId={selectedAuctionForClaim.auction_id}
              winnerData={selectedAuctionForClaim}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Banner de desconto ---------- */
function DiscountBanner({ code, pct, firstPurchase }: { code: string; pct: number; firstPurchase: boolean }) {
  const copy = () => {
    navigator.clipboard?.writeText(code);
    toast.success(`Cupom ${code} copiado!`);
  };
  return (
    <Card className="bg-gradient-to-r from-primary/15 via-primary/10 to-amber-500/15 border-primary/30 rounded-3xl">
      <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Tag className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="font-black text-lg uppercase">
              {firstPurchase ? "Bônus de primeira compra" : "Bônus de volta"}: {pct}% OFF
            </div>
            <div className="text-sm text-muted-foreground">
              Use o cupom <span className="font-mono font-bold text-primary">{code}</span> ao finalizar a compra de qualquer pacote de lances.
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copy}><Copy className="w-4 h-4 mr-2" /> Copiar</Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/packages">Ver pacotes</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Visão geral ---------- */
function OverviewTab({ stats, balance, pendingCount }: { stats: any; balance: number; pendingCount: number }) {
  const items = [
    { label: "Saldo de lances", value: balance, icon: Wallet, accent: "text-primary" },
    { label: "Lances dados", value: stats?.bids_count ?? 0, icon: Gavel, accent: "text-foreground" },
    { label: "Leilões ganhos", value: stats?.wins_count ?? 0, icon: Trophy, accent: "text-amber-500" },
    { label: "Palpites únicos", value: stats?.unique_bids_count ?? 0, icon: Trophy, accent: "text-foreground" },
    { label: "Pacotes comprados", value: stats?.purchases_count ?? 0, icon: Package, accent: "text-foreground" },
    { label: "Total investido", value: fmtBRL(stats?.total_spent), icon: Wallet, accent: "text-primary" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {items.map((it) => (
        <Card key={it.label} className="bg-muted/30 border-border rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border">
                <it.icon className={`w-5 h-5 ${it.accent}`} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{it.label}</div>
                <div className={`text-2xl font-black ${it.accent}`}>{it.value}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {pendingCount > 0 && (
        <Card className="col-span-2 md:col-span-3 bg-amber-500/10 border-amber-500/30 rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <div className="font-black uppercase text-amber-500">Você tem {pendingCount} arremate(s) aguardando pagamento</div>
              <div className="text-sm text-muted-foreground">Vá até a aba "A pagar" para finalizar e receber seu produto.</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------- A pagar ---------- */
function PendingPaymentsTab({ winners, onSelect }: { winners: any[]; onSelect: (w: any) => void }) {
  if (!winners.length) {
    return <EmptyState icon={Trophy} title="Nenhum arremate ainda" subtitle="Quando você ganhar um leilão, ele aparece aqui com o valor exato a pagar." />;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {winners.map((w) => {
        const paid = w.payment_status === "approved" || w.payment_status === "paid";
        return (
          <Card key={w.id} className="bg-muted/30 border-border rounded-2xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex gap-4">
                <img
                  src={w.auction?.product?.images?.[0]}
                  alt=""
                  className="w-20 h-20 rounded-xl object-cover border border-border"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-black uppercase truncate">{w.auction?.product?.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">Arrematado em {fmtDate(w.created_at)}</div>
                  <div className="mt-2 flex items-center gap-2">
                    {paid
                      ? <Badge className="bg-green-500 text-white"><CheckCircle2 className="w-3 h-3 mr-1" /> Pago</Badge>
                      : <Badge className="bg-amber-500 text-black"><Clock className="w-3 h-3 mr-1" /> Aguardando pagamento</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-end justify-between border-t border-border pt-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Valor a pagar</div>
                  <div className="text-2xl font-black text-primary">{fmtBRL(w.final_price)}</div>
                  {w.savings_percentage != null && (
                    <div className="text-xs text-green-500 font-bold">Você economizou {Number(w.savings_percentage).toFixed(0)}%</div>
                  )}
                </div>
                <Button onClick={() => onSelect(w)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {paid ? "Ver detalhes" : "Pagar agora"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------- Histórico de lances ---------- */
function BidsHistoryTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.rpc("get_my_bids_history", { p_limit: 100, p_offset: 0 }).then(({ data, error }) => {
      if (error) { console.error(error); toast.error("Erro ao carregar histórico de lances."); }
      setRows((data as any[]) || []); setLoading(false);
    });
  }, []);
  if (loading) return <div className="text-muted-foreground p-6">Carregando…</div>;
  if (!rows.length) return <EmptyState icon={Gavel} title="Sem lances ainda" subtitle="Seus lances em leilões de centavos aparecerão aqui." />;
  return (
    <Card className="bg-muted/30 border-border rounded-2xl">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Valor do lance</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {r.product_image && <img src={r.product_image} className="w-10 h-10 rounded-lg object-cover border border-border" alt="" />}
                    <span className="font-bold truncate max-w-[200px]">{r.product_name || "—"}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono">{fmtBRL(r.price_at_bid)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                <TableCell>
                  {r.is_winner
                    ? <Badge className="bg-green-500 text-white">Você ganhou</Badge>
                    : r.auction_status === "live"
                      ? <Badge className="bg-primary text-primary-foreground">Ao vivo</Badge>
                      : <Badge variant="secondary">{r.auction_status}</Badge>}
                </TableCell>
                <TableCell>
                  {r.auction_slug && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/auctions/$id" params={{ id: r.auction_slug }}>Ver</Link>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------- Menor lance único ---------- */
function UniqueBidsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.rpc("get_my_unique_bids").then(({ data, error }) => {
      if (error) { console.error(error); toast.error("Erro ao carregar palpites."); }
      setRows((data as any[]) || []); setLoading(false);
    });
  }, []);
  if (loading) return <div className="text-muted-foreground p-6">Carregando…</div>;
  if (!rows.length) return <EmptyState icon={Trophy} title="Nenhum palpite enviado" subtitle="Participe de uma campanha de Menor Lance Único para ver seus palpites aqui." />;

  // group by campaign
  const groups = new Map<string, any[]>();
  rows.forEach((r) => {
    const k = r.campaign_id;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  });

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([cid, items]) => {
        const head = items[0];
        return (
          <Card key={cid} className="bg-muted/30 border-border rounded-2xl">
            <CardHeader className="flex flex-row items-center gap-4">
              {head.product_image && <img src={head.product_image} className="w-14 h-14 rounded-xl object-cover border border-border" alt="" />}
              <div className="flex-1">
                <CardTitle className="text-lg">{head.product_name}</CardTitle>
                <CardDescription>
                  Campanha {head.campaign_status === "finished" ? "encerrada" : "em andamento"} · {items.length} palpite(s)
                </CardDescription>
              </div>
              {head.campaign_status === "finished" && head.campaign_winner_value != null && (
                <Badge className="bg-amber-500 text-black">Ganhador: {fmtBRL(head.campaign_winner_value)}</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((b) => (
                <div key={b.id} className="flex items-center justify-between border border-border rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-black text-primary">{fmtBRL(b.value)}</span>
                    {b.is_winner
                      ? <Badge className="bg-amber-500 text-black"><Trophy className="w-3 h-3 mr-1" /> Vencedor</Badge>
                      : b.is_unique
                        ? <Badge className="bg-green-500 text-white">Único</Badge>
                        : <Badge variant="secondary">Repetido</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{fmtDate(b.created_at)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------- Pacotes / compras ---------- */
function PurchasesTab({ couponCode, couponPct }: { couponCode: string; couponPct: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.rpc("get_my_purchases").then(({ data, error }) => {
      if (error) { console.error(error); toast.error("Erro ao carregar compras."); }
      setRows((data as any[]) || []); setLoading(false);
    });
  }, []);
  return (
    <div className="space-y-4">
      <Card className="bg-primary/10 border-primary/30 rounded-2xl">
        <CardContent className="flex items-center justify-between p-5 gap-4">
          <div>
            <div className="font-black uppercase">Próxima compra com {couponPct}% OFF</div>
            <div className="text-sm text-muted-foreground">Cupom: <span className="font-mono font-bold text-primary">{couponCode}</span></div>
          </div>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/packages">Ver pacotes</Link>
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-muted-foreground p-6">Carregando…</div>
      ) : !rows.length ? (
        <EmptyState icon={Package} title="Você ainda não comprou pacotes" subtitle="Compre seu primeiro pacote e use o cupom acima para ganhar desconto." />
      ) : (
        <Card className="bg-muted/30 border-border rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Lances</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-bold">{r.package_name || r.description}</TableCell>
                    <TableCell>{r.bid_amount ?? "—"}</TableCell>
                    <TableCell className="font-mono">{fmtBRL(r.amount)}</TableCell>
                    <TableCell className="capitalize">{r.payment_method || "—"}</TableCell>
                    <TableCell>
                      {r.status === "completed"
                        ? <Badge className="bg-green-500 text-white">Pago</Badge>
                        : r.status === "pending"
                          ? <Badge className="bg-amber-500 text-black">Pendente</Badge>
                          : <Badge variant="secondary">{r.status}</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ---------- Suporte ---------- */
function SupportTab() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    supabase.rpc("get_my_tickets").then(({ data, error }) => {
      if (error) { console.error(error); toast.error("Erro ao carregar tickets."); }
      setTickets((data as any[]) || []); setLoading(false);
    });
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 3 || body.trim().length < 3) {
      toast.error("Preencha o assunto e a mensagem.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("open_support_ticket", { p_subject: subject, p_body: body });
    setSubmitting(false);
    if (error || !(data as any)?.success) {
      toast.error((data as any)?.message || error?.message || "Erro ao abrir ticket.");
      return;
    }
    toast.success("Ticket aberto! Em breve responderemos.");
    setSubject(""); setBody(""); load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-muted/30 border-border rounded-2xl">
        <CardHeader>
          <CardTitle>Abrir novo ticket</CardTitle>
          <CardDescription>Fale com nossa equipe — pagamentos, dúvidas ou suporte técnico.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Ex: Dúvida sobre pagamento" />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={6} placeholder="Descreva sua dúvida com detalhes…" />
            </div>
            <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Send className="w-4 h-4 mr-2" /> {submitting ? "Enviando…" : "Enviar ticket"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-border rounded-2xl">
        <CardHeader>
          <CardTitle>Meus tickets</CardTitle>
          <CardDescription>Acompanhe as respostas da equipe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <div className="text-muted-foreground">Carregando…</div>
            : !tickets.length ? <div className="text-muted-foreground text-sm">Você ainda não tem tickets.</div>
            : tickets.map((t) => (
              <Collapsible key={t.id} open={openId === t.id} onOpenChange={(o) => setOpenId(o ? t.id : null)}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between border border-border rounded-xl p-3 hover:bg-background/50 transition-colors">
                    <div className="text-left">
                      <div className="font-bold truncate">{t.subject}</div>
                      <div className="text-xs text-muted-foreground">{t.messages_count} mensagem(ns) · atualizado {fmtDate(t.updated_at)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        t.status === "answered" ? "bg-green-500 text-white" :
                        t.status === "closed" ? "bg-muted text-muted-foreground" : "bg-amber-500 text-black"
                      }>{t.status === "answered" ? "Respondido" : t.status === "closed" ? "Fechado" : "Aberto"}</Badge>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <TicketThread ticketId={t.id} onChanged={load} />
                </CollapsibleContent>
              </Collapsible>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TicketThread({ ticketId, onChanged }: { ticketId: string; onChanged: () => void }) {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    supabase.rpc("get_ticket_messages", { p_ticket_id: ticketId }).then(({ data, error }) => {
      if (error) { console.error(error); toast.error("Erro ao carregar mensagens."); return; }
      setMsgs((data as any[]) || []);
    });
  }, [ticketId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`ticket-${ticketId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticketId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ticketId, load]);

  const reply = async () => {
    if (!body.trim()) return;
    setSending(true);
    const { data, error } = await supabase.rpc("reply_support_ticket", { p_ticket_id: ticketId, p_body: body });
    setSending(false);
    if (error || !(data as any)?.success) {
      toast.error((data as any)?.message || error?.message || "Erro ao responder.");
      return;
    }
    setBody(""); load(); onChanged();
  };

  return (
    <div className="border border-border rounded-xl p-3 mt-2 space-y-3 bg-background/50">
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.is_admin_reply ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.is_admin_reply ? "bg-primary/15 border border-primary/30" : "bg-muted border border-border"
            }`}>
              <div className="whitespace-pre-wrap break-words">{m.body}</div>
              <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {m.is_admin_reply ? "Suporte" : "Você"} · {fmtDate(m.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva uma resposta…" onKeyDown={(e) => e.key === "Enter" && reply()} />
        <Button onClick={reply} disabled={sending}><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

/* ---------- Conta ---------- */
function AccountTab(props: {
  username: string; setUsername: (v: string) => void;
  fullName: string; setFullName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  cpf: string; setCpf: (v: string) => void;
  gender: string; setGender: (v: string) => void;
  loading: boolean; onSubmit: (e: React.FormEvent) => void;
}) {
  const { username, setUsername, fullName, setFullName, phone, setPhone, cpf, setCpf, gender, setGender, loading, onSubmit } = props;
  return (
    <Card className="bg-muted/30 border-border rounded-2xl">
      <CardHeader>
        <CardTitle>Dados da conta</CardTitle>
        <CardDescription>Mantenha seus dados atualizados para garantir seus arremates.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Nickname" icon={Hash}><Input value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10" /></Field>
            <Field label="Nome completo" icon={User}><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" /></Field>
            <Field label="Telefone" icon={Phone}><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" /></Field>
            <Field label="CPF" icon={Hash}><Input value={cpf} onChange={(e) => setCpf(e.target.value)} className="pl-10" placeholder="000.000.000-00" /></Field>
            <div className="space-y-2">
              <Label>Gênero</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                  <SelectItem value="not_specified">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {loading ? "Salvando…" : "Salvar alterações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}

/* ---------- Empty state ---------- */
function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <Card className="bg-muted/30 border-border rounded-2xl">
      <CardContent className="p-10 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-background border border-border flex items-center justify-center">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
        <div className="font-black uppercase">{title}</div>
        <div className="text-sm text-muted-foreground max-w-sm">{subtitle}</div>
      </CardContent>
    </Card>
  );
}
