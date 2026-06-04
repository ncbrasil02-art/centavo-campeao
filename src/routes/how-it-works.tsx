import { createFileRoute } from '@tanstack/react-router';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Zap, ArrowRight, ShieldCheck, Clock, Wallet, Trophy, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { useSettings } from '@/hooks/useSettings';
import { Footer } from '@/components/Footer';
import { DemoAuctionBlock } from '@/components/DemoAuctionBlock';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/how-it-works')({
  component: HowItWorks,
});

function Step({ icon, step, title, desc }: { icon: React.ReactNode, step: string, title: string, desc: string }) {
  return (
    <div className="group relative p-8 rounded-[40px] bg-white/[0.03] border border-white/5 hover:border-primary/30 transition-all duration-500 hover:-translate-y-2">
      <div className="absolute -top-6 -left-6 w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-black font-black text-2xl shadow-xl shadow-primary/20 rotate-[-12deg] group-hover:rotate-0 transition-transform">
        {step}
      </div>
      <div className="mb-6 text-primary group-hover:scale-110 transition-transform duration-500 origin-left">
        {icon}
      </div>
      <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-4">{title}</h3>
      <p className="text-white/60 leading-relaxed">{desc}</p>
    </div>
  );
}

function HowItWorks() {
  const { site_name } = useSettings();
  const [demoAuctions, setDemoAuctions] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDemo() {
      const { data } = await supabase
        .from("demo_auctions")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true })
        .limit(1); // Only one for how it works page as requested
      
      if (data) setDemoAuctions(data);
    }
    fetchDemo();
  }, []);

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-20">
            <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/10 text-primary uppercase tracking-widest px-4 py-1">TRANSPARÊNCIA TOTAL</Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-8 italic uppercase">Como o <span className="text-primary">{site_name}</span> funciona?</h1>
            <p className="text-xl text-white/60 leading-relaxed italic">
              Nossa plataforma foi desenhada para ser emocionante, justa e extremamente econômica. 
              Entenda a dinâmica que permite arrematar iPhones e Consoles por valores inacreditáveis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-32">
            <Step 
              icon={<Wallet className="w-10 h-10" />} 
              step="1" 
              title="Adquira Lances" 
              desc="Para participar, você precisa de lances. Escolha um pacote que combine com sua estratégia. Cada lance custa menos que um cafezinho." 
            />
            <Step 
              icon={<Clock className="w-10 h-10" />} 
              step="2" 
              title="Escolha o Produto" 
              desc="Navegue pelos leilões ativos. Temos desde eletrônicos premium até créditos para usar no site. Todos começam em R$ 0,01." 
            />
            <Step 
              icon={<Trophy className="w-10 h-10" />} 
              step="3" 
              title="Dê o seu Lance" 
              desc="Cada vez que alguém dá um lance, o cronômetro reinicia (geralmente em 15 segundos) e o preço sobe apenas R$ 0,01." 
            />
          </div>

          {demoAuctions.length > 0 && (
            <div className="mb-32">
              <div className="text-center mb-12">
                <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/10 text-primary uppercase">SIMULAÇÃO REAL</Badge>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Veja na <span className="text-primary">prática</span></h2>
              </div>
              <div className="max-w-7xl mx-auto">
                <DemoAuctionBlock auctions={demoAuctions} />
              </div>

            </div>
          )}

          <div className="bg-white/[0.02] border border-white/5 rounded-[48px] p-8 md:p-16 mb-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10 translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <Badge className="bg-accent text-accent-foreground mb-6">REGRA DE OURO</Badge>
                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-6">O Vencedor leva Tudo!</h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                    <p className="text-white/70"><span className="text-white font-bold">O Cronômetro zerou?</span> Se você foi o último a dar o lance quando o tempo acabou, parabéns! Você arrematou o produto.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                    <p className="text-white/70"><span className="text-white font-bold">Pagamento do Arremate:</span> Você paga apenas o valor final que estava no site (que costuma ser centavos ou poucos reais).</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                    <p className="text-white/70"><span className="text-white font-bold">Entrega Garantida:</span> Nós enviamos o produto para sua casa com nota fiscal e garantia original de fábrica.</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-[40px] bg-gradient-to-br from-primary/20 to-transparent border border-white/10 p-1 flex items-center justify-center">
                   <div className="w-full h-full rounded-[38px] bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
                      <Zap className="w-16 h-16 text-primary mb-6 animate-pulse" />
                      <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Dica de Mestre</h4>
                      <p className="text-white/60">Os lances dados nos últimos 2 segundos são os mais estratégicos. Fique atento e mantenha sua conexão estável!</p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-8">Pronto para sua primeira vitória?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-16 px-10 text-xl font-black uppercase italic bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_rgba(var(--color-primary),0.4)]" asChild>
                <Link to="/auth">Criar minha conta agora</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-16 px-10 text-xl font-black uppercase italic border-white/10 hover:bg-white/5" asChild>
                <Link to="/">Ver leilões ativos</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}