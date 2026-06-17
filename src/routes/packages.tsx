import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ShieldCheck, Wallet, Check, CreditCard, Copy, Loader2, QrCode, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/packages")({
  component: PackagesPage,
});

function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<any | null>(null);
  const [paymentStep, setPaymentStep] = useState<"method" | "pix" | "processing">("method");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();
  const settings = useSettings();
  const search = useSearch({ from: "/packages" }) as any;

  useEffect(() => {
    fetchPackages();
    if (search.status === "success") {
      toast.success("Pagamento aprovado! Seus lances serão creditados em instantes.");
    } else if (search.status === "failure") {
      toast.error("O pagamento não pôde ser concluído.");
    }
  }, [search.status]);

  async function fetchPackages() {
    const { data } = await supabase
      .from("bid_packages")
      .select("*")
      .order("price", { ascending: true });
    if (data) setPackages(data);
    setLoading(false);
  }

  const handlePurchaseClick = async (pkg: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Você precisa estar logado para comprar lances.");
      navigate({ to: "/auth" });
      return;
    }
    setBuying(pkg);
    setPaymentStep("method");
    setIsDialogOpen(true);
  };

  const handlePixPayment = async () => {
    if (!buying) return;
    setPaymentStep("processing");
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-pix', {
        body: { package_id: buying.id }
      });
      if (error) {
        const msg = (error as any).context?.message || error.message || "Erro desconhecido";
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error + (data.details ? `: ${data.details}` : ""));

      setBuying({ ...buying, transaction_id: data.transaction_id, pix_copy_paste: data.pix_copy_paste, pix_qr_code: data.pix_qr_code });
      setPaymentStep("pix");

      const channel = supabase
        .channel(`payment_${data.transaction_id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `id=eq.${data.transaction_id}` },
          (payload) => {
            if (payload.new.status === 'completed') {
              toast.success(`Pagamento confirmado! Você recebeu ${buying.bid_amount} lances.`);
              setIsDialogOpen(false);
              supabase.removeChannel(channel);
            } else if (payload.new.status === 'failed') {
              toast.error("O pagamento foi recusado ou cancelado.");
              setPaymentStep("method");
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar PIX");
      setPaymentStep("method");
    }
  };

  const handleCardPayment = async () => {
    if (!buying) return;
    setPaymentStep("processing");
    try {
      // Cria transação pendente primeiro
      const { data: t, error: tErr } = await supabase.rpc("create_pending_payment", {
        p_package_id: buying.id,
        p_method: "card",
      });
      if (tErr) throw tErr;
      const tx = t as any;
      if (!tx?.success) throw new Error(tx?.message || "Erro ao criar transação");

      const { data, error } = await supabase.functions.invoke("create-mp-preference", {
        body: { package_id: buying.id, transaction_id: tx.transaction_id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("Checkout indisponível.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao iniciar pagamento com cartão.");
      setPaymentStep("method");
    }
  };

  const copyPixKey = () => {
    const key = buying?.pix_copy_paste;
    if (key) {
      navigator.clipboard.writeText(key);
      toast.success("Código PIX copiado!");
    }
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary uppercase">CRÉDITOS</Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 italic">Turbine seus <span className="text-primary">lances!</span></h1>
          <p className="text-white/40 text-lg leading-relaxed">
            Escolha o pacote que melhor se adapta à sua estratégia. Créditos liberados após confirmação do pagamento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-[400px] rounded-2xl bg-white/5 animate-pulse"></div>
            ))
          ) : (
            packages.map((pkg) => {
              const isPopular = pkg.bid_amount >= 250;
              const perBid = pkg.price / pkg.bid_amount;
              return (
                <Card key={pkg.id} className={`relative overflow-hidden bg-white/5 border-white/10 group transition-all duration-300 hover:border-primary/50 hover:bg-white/10 ${isPopular ? 'border-primary/40 lg:scale-105 shadow-[0_0_30px_-10px_hsl(var(--primary)/0.5)]' : ''}`}>
                  {isPopular && (
                    <div className="absolute top-0 right-0 left-0 bg-primary py-1 text-[10px] font-black text-primary-foreground text-center uppercase tracking-widest flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3" /> Mais Popular
                    </div>
                  )}
                  <CardHeader className="text-center pt-10">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <CardDescription className="text-white/60">{pkg.bid_amount} lances</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center py-6">
                    <div className="text-3xl font-black text-white">R$ {pkg.price.toFixed(2)}</div>
                    <div className="text-xs text-white/40 mt-1">R$ {perBid.toFixed(2)} por lance</div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={() => handlePurchaseClick(pkg)} className="w-full bg-white/10 hover:bg-primary hover:text-primary-foreground text-white font-bold h-12 transition-all">
                      COMPRAR AGORA
                    </Button>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase italic">
                Finalizar <span className="text-primary">Compra</span>
              </DialogTitle>
              <DialogDescription className="text-white/40">
                {buying?.name} — R$ {buying?.price.toFixed(2)} · {buying?.bid_amount} lances
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              {paymentStep === "method" && (
                <div className="grid grid-cols-1 gap-4">
                  <Button variant="outline" className="h-20 border-white/10 hover:border-primary hover:bg-white/5 flex flex-col items-center justify-center gap-1" onClick={handlePixPayment}>
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-primary" />
                      <span className="font-bold">Pagar com PIX</span>
                    </div>
                    <span className="text-[10px] text-white/40 uppercase font-black">Liberação Instantânea</span>
                  </Button>

                  <Button variant="outline" className="h-20 border-white/10 hover:border-primary hover:bg-white/5 flex flex-col items-center justify-center gap-1" onClick={handleCardPayment}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                      <span className="font-bold">Cartão de Crédito</span>
                    </div>
                    <span className="text-[10px] text-white/40 uppercase font-black">Mercado Pago · até 12x</span>
                  </Button>
                </div>
              )}

              {paymentStep === "pix" && (
                <div className="text-center space-y-6">
                  <div className="w-48 h-48 bg-white p-2 mx-auto rounded-lg flex items-center justify-center overflow-hidden">
                    {buying?.pix_qr_code ? (
                      <img src={`data:image/png;base64,${buying.pix_qr_code}`} alt="QR Code PIX" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-zinc-100 flex items-center justify-center border-2 border-dashed border-zinc-300">
                        <QrCode className="w-20 h-20 text-zinc-400" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-left">
                      <p className="text-[10px] text-white/40 uppercase font-black mb-1">Código PIX (Copia e Cola)</p>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-[10px] break-all line-clamp-2 text-white/60">{buying?.pix_copy_paste || "Gerando código..."}</code>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyPixKey}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <div className="flex items-center justify-center gap-2 text-xs text-white/60 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Aguardando confirmação automática do pagamento…</span>
                    </div>
                    <p className="text-[11px] text-white/40">Assim que o Mercado Pago confirmar, seus lances são creditados automaticamente.</p>
                    <Button variant="ghost" className="w-full text-white/40 text-xs" onClick={() => setPaymentStep("method")}>
                      Mudar forma de pagamento
                    </Button>
                  </div>
                </div>
              )}

              {paymentStep === "processing" && (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-white/40 animate-pulse">Processando transação…</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Feature icon={<ShieldCheck className="w-6 h-6" />} title="Pagamento Seguro" description="Processado pelo Mercado Pago, com criptografia de ponta a ponta." />
          <Feature icon={<Wallet className="w-6 h-6" />} title="Liberação Automática" description="Lances creditados assim que o pagamento for confirmado." />
          <Feature icon={<Check className="w-6 h-6" />} title="Sem Taxas Ocultas" description="O valor anunciado é o valor final. Sem surpresas." />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex gap-4 p-6 rounded-2xl bg-white/5 border border-white/10">
      <div className="text-primary shrink-0">{icon}</div>
      <div>
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-white/40 text-sm">{description}</p>
      </div>
    </div>
  );
}
