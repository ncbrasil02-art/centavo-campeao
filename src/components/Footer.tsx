import { Link } from "@tanstack/react-router";
import { MessageSquare, ShieldCheck, Heart, Clock, Gavel, Mail, Phone, Info, Smartphone } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";

export function Footer() {
  const { site_name, logo_url, logo_height, support_whatsapp } = useSettings();

  return (
    <footer className="relative mt-20 border-t border-border bg-card/50 backdrop-blur-xl overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand & Social */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2 group">
              {logo_url ? (
                <img 
                  src={logo_url} 
                  alt={site_name} 
                  className="object-contain" 
                  style={{ height: `${(logo_height || 40) * 0.8}px` }} 
                />
              ) : (
                <>
                  <Gavel className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold tracking-tighter uppercase italic">
                    {site_name.split(' ')[0]}<span className="text-primary">{site_name.split(' ').slice(1).join('')}</span>
                  </span>
                </>
              )}
            </Link>
            <p className="text-muted-foreground text-xs leading-relaxed italic">
              O {site_name} é a plataforma líder em leilões de centavos, oferecendo transparência total e economia real em produtos premium.
            </p>
            <div className="flex gap-4">
              {support_whatsapp && (
                <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(22,163,74,0.3)]">
                  <a href={support_whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* About & Security */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-primary">Nossa Missão</h4>
            <p className="text-muted-foreground text-[10px] leading-relaxed uppercase tracking-tight">
              Nosso cronômetro é sincronizado via servidor atômico, garantindo que cada lance seja processado em milissegundos. Nossa responsabilidade é com a sua diversão e economia segura.
            </p>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-primary">Ambiente Seguro</span>
                <span className="text-[8px] text-muted-foreground uppercase">Criptografia de ponta a ponta</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-primary">Links Úteis</h4>
            <nav className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">Leilões</Link>
              <Link to="/how-it-works" className="hover:text-primary transition-colors">Como Funciona</Link>
              <Link to="/ranking" className="hover:text-primary transition-colors">Ranking</Link>
              <Link to="/packages" className="hover:text-primary transition-colors">Comprar Lances</Link>
              <Link to="/terms-of-use" className="hover:text-primary transition-colors">Termos</Link>
              <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacidade</Link>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('show-pwa-install'))}
                className="hover:text-primary transition-colors text-left flex items-center gap-1.5"
              >
                <Smartphone className="w-3 h-3" /> Baixar App
              </button>

            </nav>
          </div>

          {/* Contact & Credits */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-primary">Contato</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                <Mail className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase">suporte@{site_name.toLowerCase().replace(/\s+/g, '')}.com.br</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase">Suporte 24/7 Ativo</span>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest leading-relaxed">
                DESENVOLVIDO POR&nbsp;&nbsp;
                <a href="https://ncbrasil.com.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-all font-black italic border-b border-primary/30">NC BRASIL</a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} {site_name}</span>
            <span className="hidden md:inline">•</span>
            <span>Todos os direitos reservados</span>
            <span className="hidden md:inline">•</span>
            <span className="text-primary/40">v1.2</span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              FEITO COM <Heart className="w-2.5 h-2.5 text-red-500/40 fill-red-500/40" /> PARA VENCEDORES.
            </div>
            <a 
              href="https://www.ncbrasil.com.br/sistema-de-leilao-de-centavos/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors duration-300 tracking-[0.3em] font-black"
            >
              sistema leilão centavos
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
