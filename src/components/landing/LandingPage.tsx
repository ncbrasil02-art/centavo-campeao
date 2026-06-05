import React from 'react';
import { motion } from 'framer-motion';
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  ShieldCheck, 
  Settings, 
  Users, 
  CheckCircle2, 
  MessageSquare, 
  ArrowRight, 
  Star,
  Plus,
  Minus,
  LayoutDashboard,
  Smartphone,
  BarChart3,
  Bot
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="p-8 rounded-[32px] bg-white/5 border border-white/10 hover:border-primary/50 transition-all duration-300"
  >
    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
      <Icon className="w-8 h-8 text-primary" />
    </div>
    <h3 className="text-xl font-black italic uppercase tracking-tighter mb-4">{title}</h3>
    <p className="text-white/60 leading-relaxed">{description}</p>
  </motion.div>
);

const TestimonialCard = ({ name, role, content, avatar }: { name: string, role: string, content: string, avatar: string }) => (
  <div className="p-8 rounded-[32px] bg-white/5 border border-white/10">
    <div className="flex gap-1 mb-6">
      {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
    </div>
    <p className="text-lg italic text-white/80 mb-8 leading-relaxed">"{content}"</p>
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20">
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
      <div>
        <h4 className="font-black italic uppercase tracking-tighter">{name}</h4>
        <p className="text-xs text-white/40 uppercase tracking-widest">{role}</p>
      </div>
    </div>
  </div>
);

export const LandingPage = () => {
  const { site_name, primary_color, support_whatsapp } = useSettings();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCTA = () => {
    const message = encodeURIComponent("Olá! Gostaria de saber mais sobre a plataforma MC BRASIL.");
    window.open(`https://wa.me/${support_whatsapp?.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-black">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="font-black text-black italic text-xl">MC</span>
            </div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">MC BRASIL</h1>
          </div>
          
          <nav className="hidden md:flex gap-10">
            <button onClick={() => scrollToSection('hero')} className="text-sm font-black uppercase tracking-widest hover:text-primary transition-colors">Início</button>
            <button onClick={() => scrollToSection('features')} className="text-sm font-black uppercase tracking-widest hover:text-primary transition-colors">Recursos</button>
            <button onClick={() => scrollToSection('faq')} className="text-sm font-black uppercase tracking-widest hover:text-primary transition-colors">FAQ</button>
            <button onClick={() => scrollToSection('contact')} className="text-sm font-black uppercase tracking-widest hover:text-primary transition-colors">Contato</button>
          </nav>

          <Button 
            onClick={handleCTA}
            className="hidden md:flex bg-primary hover:bg-primary/90 text-black font-black italic uppercase tracking-tighter px-6 h-12 rounded-full"
          >
            Quero minha plataforma
          </Button>

          {/* Mobile Menu Button - simple for now */}
          <button className="md:hidden text-white">
            <Plus className="w-8 h-8" />
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section id="hero" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-30"></div>
            <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-30"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <Badge className="bg-primary/10 text-primary border-primary/20 mb-6 px-4 py-1 font-black italic uppercase tracking-widest">
                    Oportunidade de Negócio Digital
                  </Badge>
                  <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.9] mb-8">
                    Transforme sua cidade em uma <span className="text-primary">Máquina de Vendas</span>
                  </h2>
                  <p className="text-xl md:text-2xl text-white/60 mb-10 max-w-xl font-medium leading-relaxed">
                    Lance o seu próprio site de Leilão de Centavos com a tecnologia mais avançada e segura do mercado brasileiro. 
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      onClick={handleCTA}
                      className="h-16 px-10 bg-primary hover:bg-primary/90 text-black font-black italic uppercase text-xl rounded-full group"
                    >
                      Solicitar Demonstração
                      <ArrowRight className="ml-2 w-6 h-6 transition-transform group-hover:translate-x-2" />
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => scrollToSection('presentation')}
                      className="h-16 px-10 border-white/20 hover:bg-white/10 text-white font-black italic uppercase text-xl rounded-full"
                    >
                      Ver Funcionando
                    </Button>
                  </div>

                  <div className="mt-12 flex items-center gap-6">
                    <div className="flex -space-x-4">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-12 h-12 rounded-full border-4 border-black overflow-hidden">
                          <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-white/40 uppercase tracking-widest">
                      <span className="text-white">+ de 50</span> proprietários faturando
                    </p>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="relative z-10 rounded-[40px] border border-white/10 overflow-hidden shadow-2xl shadow-primary/20 bg-white/5 p-4 backdrop-blur-sm">
                  <img 
                    src="https://images.unsplash.com/photo-1551288049-bbbda5366392?q=80&w=1200&auto=format&fit=crop" 
                    alt="Dashboard Preview" 
                    className="rounded-[32px] w-full"
                  />
                  {/* Floating badge */}
                  <div className="absolute top-10 -left-10 bg-white p-6 rounded-3xl shadow-2xl text-black">
                    <p className="text-xs font-black uppercase tracking-widest text-black/40 mb-1">Faturamento Médio</p>
                    <p className="text-3xl font-black italic uppercase tracking-tighter">R$ 15.400,00</p>
                  </div>
                </div>
                {/* Decorative element */}
                <div className="absolute -inset-4 border border-primary/30 rounded-[48px] -z-10 animate-pulse"></div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 bg-white/[0.02]">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-24">
              <Badge variant="outline" className="mb-6 border-primary/30 text-primary uppercase font-black italic tracking-widest">Tecnologia de Ponta</Badge>
              <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-8 leading-none">
                Recursos feitos para <span className="text-primary">Alta Conversão</span>
              </h2>
              <p className="text-xl text-white/60">Tudo o que você precisa para gerenciar seus leilões com total segurança e automação.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={Bot} 
                title="Automação Inteligente" 
                description="Robôs que mantêm o leilão ativo e estimulam a participação dos usuários reais de forma natural." 
              />
              <FeatureCard 
                icon={ShieldCheck} 
                title="Sistema Anti-Fraude" 
                description="Tecnologia avançada para garantir a integridade dos lances e proteção total contra ataques." 
              />
              <FeatureCard 
                icon={Zap} 
                title="Lances em Tempo Real" 
                description="Sincronização instantânea via WebSockets. Sem atrasos, garantindo a melhor experiência no desktop e mobile." 
              />
              <FeatureCard 
                icon={LayoutDashboard} 
                title="Painel Administrativo" 
                description="Gerencie tudo de forma simples: leilões, usuários, pagamentos, pacotes e configurações gerais." 
              />
              <FeatureCard 
                icon={Smartphone} 
                title="Totalmente Responsivo" 
                description="Experiência perfeita em qualquer dispositivo. Otimizado para conversão em smartphones." 
              />
              <FeatureCard 
                icon={BarChart3} 
                title="Gestão Financeira" 
                description="Integração nativa com Mercado Pago e Pix para recebimento automático e seguro." 
              />
            </div>
          </div>
        </section>

        {/* Presentation Section */}
        <section id="presentation" className="py-32 overflow-hidden">
          <div className="container mx-auto px-6">
            <div className="flex flex-col lg:flex-row gap-20 items-center">
              <div className="flex-1">
                <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-8 leading-tight">
                  Conheça a Plataforma <span className="text-primary">Mais Completa</span> do Mercado
                </h2>
                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="shrink-0 w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center text-primary font-black italic">01</div>
                    <div>
                      <h4 className="text-xl font-black italic uppercase tracking-tighter mb-2">Home Page Profissional</h4>
                      <p className="text-white/60">Design moderno focado em manter o usuário engajado e participando dos leilões ativos.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="shrink-0 w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center text-primary font-black italic">02</div>
                    <div>
                      <h4 className="text-xl font-black italic uppercase tracking-tighter mb-2">Sistema de Narrador</h4>
                      <p className="text-white/60">Anúncios por voz que aumentam a urgência e o entretenimento durante as disputas.</p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="shrink-0 w-12 h-12 rounded-full border border-primary/30 flex items-center justify-center text-primary font-black italic">03</div>
                    <div>
                      <h4 className="text-xl font-black italic uppercase tracking-tighter mb-2">Chat Global</h4>
                      <p className="text-white/60">Estimule a comunidade com chat em tempo real onde ganhadores são anunciados.</p>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleCTA}
                  className="mt-12 h-14 px-8 bg-primary hover:bg-primary/90 text-black font-black italic uppercase rounded-full"
                >
                  Conhecer todos os recursos
                </Button>
              </div>
              <div className="flex-1 relative">
                <div className="relative z-10 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl">
                   <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop" alt="System" className="w-full" />
                </div>
                <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -z-10"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32 bg-white/[0.02]">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-8 leading-none">
                O que nossos <span className="text-primary">Parceiros</span> dizem
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <TestimonialCard 
                name="Ricardo Santos" 
                role="Dono de plataforma em SP" 
                content="A MC Brasil mudou completamente minha forma de ganhar dinheiro na internet. O sistema é muito estável e os robôs funcionam perfeitamente." 
                avatar="https://i.pravatar.cc/150?u=a" 
              />
              <TestimonialCard 
                name="Carla Mendes" 
                role="Empreendedora Digital" 
                content="Já tive outras plataformas, mas nenhuma se compara à facilidade de gestão da MC Brasil. O suporte deles é excelente." 
                avatar="https://i.pravatar.cc/150?u=b" 
              />
              <TestimonialCard 
                name="Bruno Oliveira" 
                role="Investidor" 
                content="O visual é muito profissional e a conversão de novos usuários é altíssima. Em 2 meses recuperei todo o investimento inicial." 
                avatar="https://i.pravatar.cc/150?u=c" 
              />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-32">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                 <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-6">Perguntas <span className="text-primary">Frequentes</span></h2>
                 <p className="text-white/60">Tire suas principais dúvidas sobre a plataforma.</p>
              </div>

              <Accordion type="single" collapsible className="w-full space-y-4">
                <AccordionItem value="item-1" className="border border-white/10 rounded-3xl px-8 overflow-hidden bg-white/5">
                  <AccordionTrigger className="text-xl font-black italic uppercase tracking-tighter hover:no-underline py-6">
                    O sistema é seguro?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 text-lg pb-6 leading-relaxed">
                    Sim, utilizamos criptografia de ponta e sistemas anti-fraude avançados para garantir que todos os lances sejam reais e protegidos contra qualquer tipo de ataque.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border border-white/10 rounded-3xl px-8 overflow-hidden bg-white/5">
                  <AccordionTrigger className="text-xl font-black italic uppercase tracking-tighter hover:no-underline py-6">
                    Como recebo os pagamentos?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 text-lg pb-6 leading-relaxed">
                    A plataforma integra diretamente com Mercado Pago e sistema de Pix automático. O dinheiro cai direto na sua conta sem intermediários.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border border-white/10 rounded-3xl px-8 overflow-hidden bg-white/5">
                  <AccordionTrigger className="text-xl font-black italic uppercase tracking-tighter hover:no-underline py-6">
                    Preciso saber programar?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 text-lg pb-6 leading-relaxed">
                    Não! O sistema é entregue pronto para uso e todo o gerenciamento é feito através de um painel administrativo intuitivo e simples.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4" className="border border-white/10 rounded-3xl px-8 overflow-hidden bg-white/5">
                  <AccordionTrigger className="text-xl font-black italic uppercase tracking-tighter hover:no-underline py-6">
                    Quanto tempo leva para lançar?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 text-lg pb-6 leading-relaxed">
                    Após a aquisição e configuração do domínio, você pode estar com seu site no ar em menos de 24 horas.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id="contact" className="py-32 relative overflow-hidden">
          <div className="container mx-auto px-6 relative z-10 text-center">
            <div className="max-w-4xl mx-auto p-12 md:p-20 rounded-[48px] bg-gradient-to-br from-primary to-primary/80 text-black shadow-2xl shadow-primary/40">
              <h2 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter mb-8 leading-[0.9]">
                Comece sua própria Máquina de Vendas <span className="opacity-40">Hoje mesmo</span>
              </h2>
              <p className="text-xl md:text-2xl font-bold mb-12 opacity-80 max-w-2xl mx-auto">
                Fale com um de nossos especialistas e solicite seu orçamento personalizado.
              </p>
              <Button 
                onClick={handleCTA}
                className="h-20 px-12 bg-black text-white hover:bg-black/80 font-black italic uppercase text-2xl rounded-full shadow-2xl transition-transform hover:scale-105"
              >
                Garantir minha vaga na plataforma
              </Button>
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] -z-10"></div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="font-black text-black italic text-sm">MC</span>
              </div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter">MC BRASIL</h1>
            </div>
            
            <p className="text-white/40 text-sm font-medium">© 2024 MC BRASIL - Todos os direitos reservados.</p>
            
            <div className="flex gap-6">
               {/* Social placeholders */}
               <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-primary transition-colors cursor-pointer">
                 <Users className="w-5 h-5 text-white/60" />
               </div>
               <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-primary transition-colors cursor-pointer">
                 <MessageSquare className="w-5 h-5 text-white/60" />
               </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};