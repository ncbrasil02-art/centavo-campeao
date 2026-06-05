import React from 'react';
import { motion } from 'framer-motion';
import { useSettings } from "@/hooks/useSettings";
import { useAssets } from "@/hooks/useAssets";

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
  Bot,
  Volume2,
  Lock,
  Globe,
  Headphones,
  Gamepad2,
  Rocket
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
  const assets = useAssets();


  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCTA = () => {
    const message = encodeURIComponent("Olá! Gostaria de saber mais sobre a plataforma NC BRASIL.");
    window.open(`https://wa.me/${support_whatsapp?.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-black">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="font-black text-black italic text-xl">NC</span>
            </div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">NC BRASIL</h1>
          </div>
          
          <nav className="hidden md:flex gap-10">
            <button onClick={() => scrollToSection('hero')} className="text-sm font-black uppercase tracking-widest hover:text-primary transition-colors">Início</button>
            <button onClick={() => scrollToSection('features')} className="text-sm font-black uppercase tracking-widest hover:text-primary transition-colors">Recursos</button>
            <button onClick={() => scrollToSection('presentation')} className="text-sm font-black uppercase tracking-widest hover:text-primary transition-colors">Plataforma</button>
            <button onClick={() => scrollToSection('faq')} className="text-sm font-black uppercase tracking-widest hover:text-primary transition-colors">FAQ</button>
          </nav>

          <Button 
            onClick={handleCTA}
            className="hidden md:flex bg-primary hover:bg-primary/90 text-black font-black italic uppercase tracking-tighter px-6 h-12 rounded-full"
          >
            Quero minha plataforma
          </Button>

          <button className="md:hidden text-white" onClick={handleCTA}>
            <Plus className="w-8 h-8" />
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section id="hero" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
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
                    Tecnologia NC BRASIL
                  </Badge>
                  <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.9] mb-8">
                    Sua plataforma de <span className="text-primary">Leilão de Centavos</span>
                  </h2>
                  <p className="text-xl md:text-2xl text-white/60 mb-10 max-w-xl font-medium leading-relaxed">
                    A solução mais completa do mercado para criar seu próprio negócio digital. Gestão total, automação de lances e visual premium.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      onClick={handleCTA}
                      className="h-16 px-10 bg-primary hover:bg-primary/90 text-black font-black italic uppercase text-xl rounded-full group"
                    >
                      Gostaria de ter um Sistema?
                      <ArrowRight className="ml-2 w-6 h-6 transition-transform group-hover:translate-x-2" />
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => scrollToSection('presentation')}
                      className="h-16 px-10 border-white/20 hover:bg-white/10 text-white font-black italic uppercase text-xl rounded-full"
                    >
                      Ver Recursos
                    </Button>
                  </div>

                  <div className="mt-12 flex items-center gap-6">
                    <div className="flex -space-x-4">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-12 h-12 rounded-full border-4 border-black overflow-hidden">
                          <img src={`https://i.pravatar.cc/150?u=${i + 15}`} alt="user" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-white/40 uppercase tracking-widest">
                      <span className="text-white">Líder em</span> criação de sites de leilão
                    </p>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="relative z-10 rounded-[40px] border border-white/10 overflow-hidden shadow-2xl shadow-primary/20 bg-black p-2 backdrop-blur-sm">
                  <div className="rounded-[32px] overflow-hidden border border-white/5 bg-zinc-900">
                    <img 
                      src={assets['header-settings.jpeg'] || assets['admin-panel.png'] || "https://images.unsplash.com/photo-1551288049-bbbda5366392?q=80&w=1200&auto=format&fit=crop"} 
                      alt="Painel Administrativo" 
                      className="w-full h-auto min-h-[400px] md:min-h-[600px] object-top object-cover"
                    />
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-[0_0_30px_rgba(var(--color-primary),0.5)]">
                    <Rocket className="w-10 h-10 text-black" />
                  </div>
                </div>
                <div className="absolute -inset-4 border border-primary/30 rounded-[48px] -z-10 animate-pulse"></div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Brand Bar */}
        <section className="py-12 border-y border-white/5 bg-white/[0.01]">
          <div className="container mx-auto px-6">
            <div className="flex flex-wrap justify-center md:justify-between items-center gap-8 opacity-40 grayscale">
              <span className="text-2xl font-black italic">MERCADO PAGO</span>
              <span className="text-2xl font-black italic">PIX SEGURO</span>
              <span className="text-2xl font-black italic">CLOUDFLARE</span>
              <span className="text-2xl font-black italic">SUPABASE</span>
              <span className="text-2xl font-black italic">NC TECH</span>
            </div>
          </div>
        </section>

        {/* Features Grid - Comprehensive List */}
        <section id="features" className="py-32 bg-white/[0.02]">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-24">
              <Badge variant="outline" className="mb-6 border-primary/30 text-primary uppercase font-black italic tracking-widest">Funcionalidades Completas</Badge>
              <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-8 leading-none">
                Tudo que você precisa em <span className="text-primary">um só lugar</span>
              </h2>
              <p className="text-xl text-white/60">A tecnologia NC BRASIL entrega a gestão completa do seu negócio, desde o financeiro até a automação de lances.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={Settings} 
                title="Gestão Administrativa" 
                description="Painel Geral com configurações do site, gestor de administradores, usuários e banners." 
              />
              <FeatureCard 
                icon={Bot} 
                title="Lances Automáticos" 
                description="Módulo de lances automáticos e robôs configuráveis para manter a liquidez dos leilões." 
              />
              <FeatureCard 
                icon={BarChart3} 
                title="Relatório Financeiro" 
                description="Gráficos detalhados de faturamento, vendas de pacotes, leilões pagos e pendentes." 
              />
              <FeatureCard 
                icon={ShieldCheck} 
                title="Segurança e Validação" 
                description="Cadastro com validação de CPF único, E-mail e recuperação de senha automática." 
              />
              <FeatureCard 
                icon={Smartphone} 
                title="Painel do Usuário" 
                description="Área exclusiva para editar perfil, histórico de lances, pagamentos e leilões ganhos." 
              />
              <FeatureCard 
                icon={Rocket} 
                title="Marketing Integrado" 
                description="Módulo de cupons, newsletter, notícias e depoimentos integrados com YouTube." 
              />
              <FeatureCard 
                icon={Lock} 
                title="Segurança de Lances" 
                description="Cancelamento de leilão com reembolso automático de lances e notificação por e-mail." 
              />
              <FeatureCard 
                icon={CheckCircle2} 
                title="Fidelização" 
                description="Lances grátis por cadastro ou depoimento, e leilões exclusivos para iniciantes." 
              />
              <FeatureCard 
                icon={Zap} 
                title="Logística e Fiscal" 
                description="Gestor de códigos de rastreio dos Correios e geração de nota fiscal eletrônica." 
              />
            </div>

            {/* Additional Features List */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div className="space-y-3 p-6 rounded-2xl bg-white/5 border border-white/5">
                <h4 className="font-black italic uppercase text-primary">Operação</h4>
                <ul className="space-y-2 text-white/40">
                  <li>• Gestor de Produtos e Categorias</li>
                  <li>• Busca inteligente por produtos</li>
                  <li>• SEO: URLs amigáveis</li>
                  <li>• Auto preenchimento via CEP</li>
                </ul>
              </div>
              <div className="space-y-3 p-6 rounded-2xl bg-white/5 border border-white/5">
                <h4 className="font-black italic uppercase text-primary">Financeiro</h4>
                <ul className="space-y-2 text-white/40">
                  <li>• Mercado Pago e PagSeguro</li>
                  <li>• Compra com desconto de lances</li>
                  <li>• Gestor de pacotes de lances</li>
                  <li>• Histórico completo de faturas</li>
                </ul>
              </div>
              <div className="space-y-3 p-6 rounded-2xl bg-white/5 border border-white/5">
                <h4 className="font-black italic uppercase text-primary">Engajamento</h4>
                <ul className="space-y-2 text-white/40">
                  <li>• Top 10 usuários (mais lances)</li>
                  <li>• Leilões em destaque</li>
                  <li>• Notificações push e e-mail</li>
                  <li>• Módulo de depoimentos</li>
                </ul>
              </div>
              <div className="space-y-3 p-6 rounded-2xl bg-white/5 border border-white/5">
                <h4 className="font-black italic uppercase text-primary">Conteúdo</h4>
                <ul className="space-y-2 text-white/40">
                  <li>• CMS: Gerenciador de páginas</li>
                  <li>• Página de leilões finalizados</li>
                  <li>• Detalhes técnicos do produto</li>
                  <li>• Ativação de conta automática</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="presentation" className="py-32 bg-black relative">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center">
              <div className="lg:col-span-7 relative">
                <div className="grid grid-cols-2 gap-4 md:gap-8">
                  <div className="space-y-4 md:space-y-8 mt-12">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="relative rounded-[24px] md:rounded-[40px] overflow-hidden border border-white/10 shadow-2xl shadow-primary/5"
                    >
                      <img src={assets['landing-auctions.png'] || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop"} alt="Interface de Leilões" className="w-full h-full object-cover" />
                      <div className="absolute top-4 left-4 md:top-6 md:left-6">
                        <Badge className="bg-primary text-black font-black italic text-[10px]">PLATAFORMA</Badge>
                      </div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="relative rounded-[24px] md:rounded-[40px] overflow-hidden border border-white/10 shadow-2xl shadow-primary/5 aspect-square"
                    >
                      <img src={assets['landing-winners.png'] || "https://images.unsplash.com/photo-1551288049-bbbda5366392?q=80&w=1200&auto=format&fit=crop"} alt="Ganhadores" className="w-full h-full object-cover" />
                      <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
                        <Badge className="bg-primary text-black font-black italic text-[10px]">GANHADORES</Badge>
                      </div>
                    </motion.div>
                  </div>
                  <div className="space-y-4 md:space-y-8">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="relative rounded-[24px] md:rounded-[40px] overflow-hidden border border-white/10 shadow-2xl shadow-primary/5 aspect-square"
                    >
                      <img src={assets['header-settings.jpeg'] || "https://images.unsplash.com/photo-1551288049-bbbda5366392?q=80&w=1200&auto=format&fit=crop"} alt="Configurações" className="w-full h-full object-cover" />
                      <div className="absolute top-4 right-4 md:top-6 md:right-6">
                        <Badge className="bg-primary text-black font-black italic text-[10px]">PAINEL ADM</Badge>
                      </div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="relative rounded-[24px] md:rounded-[40px] overflow-hidden border border-white/10 shadow-2xl shadow-primary/5"
                    >
                      <img src={assets['landing-winners.png'] || "https://images.unsplash.com/photo-1551288049-bbbda5366392?q=80&w=1200&auto=format&fit=crop"} alt="Interface Mobile" className="w-full h-full object-cover" />
                    </motion.div>
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -z-10 animate-pulse"></div>
              </div>
              
              <div className="lg:col-span-5">
                <Badge className="bg-primary/10 text-primary border-primary/20 mb-6 uppercase font-black italic">Interface Moderna</Badge>
                <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-8 leading-[0.9]">
                  Uma Experiência <br /> <span className="text-primary">Inigualável</span>
                </h2>
                <p className="text-lg md:text-xl text-white/60 mb-10 leading-relaxed font-medium">
                  Nossa plataforma foi desenvolvida com foco total na conversão e na experiência do usuário. Um design intuitivo que facilita a participação e aumenta o tempo de permanência no site.
                </p>
                
                <ul className="space-y-6 mb-12">
                  <li className="flex items-start gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-black italic uppercase tracking-tighter">Design Dark Mode</h4>
                      <p className="text-white/40 text-sm">Elegância e modernidade que destacam os produtos e leilões.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-black italic uppercase tracking-tighter">Animações Fluídas</h4>
                      <p className="text-white/40 text-sm">Lances em tempo real com feedback visual instantâneo para o usuário.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-black italic uppercase tracking-tighter">Otimização Mobile First</h4>
                      <p className="text-white/40 text-sm">Mais de 90% dos lances vêm do celular. Nossa plataforma é líder nisso.</p>
                    </div>
                  </li>
                </ul>

                <Button 
                  onClick={handleCTA}
                  className="h-16 px-10 bg-primary hover:bg-primary/90 text-black font-black italic uppercase text-xl rounded-full"
                >
                  Quero Ver Mais Telas
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32 bg-white/[0.02]">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-8 leading-none">
                Resultados de quem <span className="text-primary">Já é Parceiro</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <TestimonialCard 
                name="Marcos Vinícius" 
                role="Operador em Minas Gerais" 
                content="A NC Brasil é outro nível. O sistema de narrador e os robôs mudaram meu faturamento. Recuperei o investimento em 15 dias." 
                avatar="https://i.pravatar.cc/150?u=m1" 
              />
              <TestimonialCard 
                name="Aline Ferreira" 
                role="Empreendedora Digital" 
                content="O que mais me impressionou foi a segurança. Já sofri ataques em outras plataformas, mas na NC Brasil durmo tranquila." 
                avatar="https://i.pravatar.cc/150?u=f1" 
              />
              <TestimonialCard 
                name="Roberto Silva" 
                role="Dono de Site de Leilões" 
                content="Visual impecável e conversão altíssima. Os usuários amam a fluidez do site no celular. Recomendo fortemente a plataforma." 
                avatar="https://i.pravatar.cc/150?u=m2" 
              />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-32 bg-black">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                 <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-6">Dúvidas <span className="text-primary">Técnicas</span></h2>
                 <p className="text-white/60">Tudo o que você precisa saber para tomar sua decisão.</p>
              </div>

              <Accordion type="single" collapsible className="w-full space-y-4">
                <AccordionItem value="item-1" className="border border-white/10 rounded-3xl px-8 overflow-hidden bg-white/5">
                  <AccordionTrigger className="text-xl font-black italic uppercase tracking-tighter hover:no-underline py-6">
                    O sistema de robôs é configurável?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 text-lg pb-6 leading-relaxed">
                    Sim! Você tem controle total. Pode definir quantos robôs atuam, em quais horários, com qual agressividade e até criar perfis personalizados para eles. Tudo pelo painel.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border border-white/10 rounded-3xl px-8 overflow-hidden bg-white/5">
                  <AccordionTrigger className="text-xl font-black italic uppercase tracking-tighter hover:no-underline py-6">
                    Como funciona o Narrador por Voz?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 text-lg pb-6 leading-relaxed">
                    É uma tecnologia exclusiva NC BRASIL. O sistema usa síntese de voz neural para anunciar lances e vencedores em tempo real, aumentando absurdamente o engajamento e a adrenalina dos participantes.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border border-white/10 rounded-3xl px-8 overflow-hidden bg-white/5">
                  <AccordionTrigger className="text-xl font-black italic uppercase tracking-tighter hover:no-underline py-6">
                    A plataforma já vem com integração PIX?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 text-lg pb-6 leading-relaxed">
                    Sim, integração nativa via Mercado Pago. O usuário paga via PIX, o sistema confirma em segundos e os lances caem na conta dele automaticamente. Sem trabalho manual para você.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4" className="border border-white/10 rounded-3xl px-8 overflow-hidden bg-white/5">
                  <AccordionTrigger className="text-xl font-black italic uppercase tracking-tighter hover:no-underline py-6">
                    Tenho direito a atualizações?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 text-lg pb-6 leading-relaxed">
                    Com certeza. Nossa equipe de desenvolvimento está sempre criando novos recursos e otimizações de segurança que são replicadas para todos os nossos parceiros.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5" className="border border-white/10 rounded-3xl px-8 overflow-hidden bg-white/5">
                  <AccordionTrigger className="text-xl font-black italic uppercase tracking-tighter hover:no-underline py-6">
                    Posso usar meu próprio domínio?
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 text-lg pb-6 leading-relaxed">
                    Sim, configuramos a plataforma no seu domínio .com.br ou .com para que você tenha total autoridade de marca.
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
                Domine o Mercado de Leilões <span className="opacity-40">Agora</span>
              </h2>
              <p className="text-xl md:text-2xl font-bold mb-12 opacity-80 max-w-2xl mx-auto">
                Não perca tempo com sistemas amadores. Comece com a melhor tecnologia disponível.
              </p>
              <Button 
                onClick={handleCTA}
                className="h-20 px-12 bg-black text-white hover:bg-black/80 font-black italic uppercase text-2xl rounded-full shadow-2xl transition-transform hover:scale-105"
              >
                Garantir Minha Plataforma NC
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
                <span className="font-black text-black italic text-sm">NC</span>
              </div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter">NC BRASIL</h1>
            </div>
            
            <p className="text-white/40 text-sm font-medium">© 2024 NC BRASIL - Tecnologia para Leilões de Centavos.</p>
            
            <div className="flex gap-6">
               <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-primary transition-colors cursor-pointer">
                 <Globe className="w-5 h-5 text-white/60" />
               </div>
               <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-primary transition-colors cursor-pointer">
                 <ShieldCheck className="w-5 h-5 text-white/60" />
               </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
