import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ShieldCheck, Wallet, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/packages")({
  component: PackagesPage,
});

function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPackages();
  }, []);

  async function fetchPackages() {
    const { data, error } = await supabase
      .from("bid_packages")
      .select("*")
      .order("price", { ascending: true });
    
    if (data) setPackages(data);
    setLoading(false);
  }

  const handlePurchase = async (pkg: any) => {
    setBuying(pkg.id);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Você precisa estar logado para comprar lances.");
      navigate({ to: "/auth" });
      return;
    }

    try {
      // Call the secure RPC to purchase credits
      const { data, error: rpcError } = await supabase.rpc("buy_credits", {
        p_package_id: pkg.id
      });

      if (rpcError) throw rpcError;
      
      if (data && !data.success) {
        toast.error(data.message || "Erro ao processar compra.");
        return;
      }

      toast.success(`Sucesso! Você recebeu ${pkg.bid_amount} lances.`);
      navigate({ to: "/" });
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao processar pagamento.");
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary uppercase">CRÉDITOS</Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 italic">Turbine seus <span className="text-primary">lances!</span></h1>
          <p className="text-white/40 text-lg leading-relaxed">
            Escolha o pacote que melhor se adapta à sua estratégia. Créditos liberados instantaneamente via PIX.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-[400px] rounded-2xl bg-white/5 animate-pulse"></div>
            ))
          ) : (
            packages.map((pkg) => (
              <Card key={pkg.id} className={`relative overflow-hidden bg-white/5 border-white/10 group transition-all duration-300 hover:border-primary/50 hover:bg-white/10 ${pkg.bid_amount >= 250 ? 'border-primary/30 scale-105 shadow-[0_0_30px_rgba(var(--color-primary),0.15)]' : ''}`}>
                {pkg.bid_amount >= 250 && (
                  <div className="absolute top-0 right-0 left-0 bg-primary py-1 text-[10px] font-black text-primary-foreground text-center uppercase tracking-widest">
                    Mais Popular
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Zap className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  <CardDescription className="text-white/60">{pkg.bid_amount} lances de disputa</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-6">
                  <div className="text-3xl font-black text-white">R$ {pkg.price.toFixed(2)}</div>
                  <div className="text-xs text-white/40 mt-1">R$ {(pkg.price / pkg.bid_amount).toFixed(2)} por lance</div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => handlePurchase(pkg)} 
                    disabled={buying === pkg.id}
                    className="w-full bg-white/10 hover:bg-primary hover:text-primary-foreground text-white font-bold h-12 transition-all"
                  >
                    {buying === pkg.id ? "PROCESSANDO..." : "COMPRAR AGORA"}
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Feature icon={<ShieldCheck className="w-6 h-6" />} title="Pagamento Seguro" description="Ambiente criptografado e certificado para sua total segurança." />
          <Feature icon={<Wallet className="w-6 h-6" />} title="Liberação Instantânea" description="Seus lances são creditados na hora após a aprovação do pagamento." />
          <Feature icon={<Check className="w-6 h-6" />} title="Sem Taxas Ocultas" description="O valor anunciado é o valor final. Sem surpresas no seu extrato." />
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
