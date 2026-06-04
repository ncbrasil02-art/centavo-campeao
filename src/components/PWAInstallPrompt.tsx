import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { X, Smartphone, Download, Apple, PlayCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PWAInstallPrompt() {
  const { pwa_enabled, android_app_url, ios_app_url, site_name } = useSettings();
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (!pwa_enabled) return;

    // Standard PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not already installed and on mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // iOS detection (iOS doesn't support beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIOS && !isStandalone && pwa_enabled) {
      // Small delay to not annoy the user immediately
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    const handleShowPrompt = () => setShowPrompt(true);
    window.addEventListener("show-pwa-install", handleShowPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("show-pwa-install", handleShowPrompt);
    };
  }, [pwa_enabled]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else if (android_app_url || ios_app_url) {
      // If we have direct links, use them
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS && ios_app_url) {
        window.open(ios_app_url, '_blank');
      } else if (android_app_url) {
        window.open(android_app_url, '_blank');
      }
    }
  };

  if (!showPrompt || !pwa_enabled) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-[100] md:left-auto md:right-8 md:bottom-8 md:w-80"
      >
        <div className="bg-zinc-900 border border-primary/30 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform">
             <Smartphone className="w-20 h-20 text-primary" />
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 h-8 w-8 text-white/40 hover:text-white"
            onClick={() => setShowPrompt(false)}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-black text-white uppercase italic text-sm tracking-tighter">Instale o App</h4>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Leilões em tempo real</p>
            </div>
          </div>

          <p className="text-xs text-white/70 mb-4 leading-relaxed">
            Participe dos leilões do <span className="text-primary font-bold">{site_name}</span> com muito mais rapidez e notificações exclusivas.
          </p>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleInstall}
              className="w-full bg-primary text-black font-black uppercase italic text-xs h-10 group/btn"
            >
              <Download className="w-3.5 h-3.5 mr-2 group-hover:bounce transition-all" /> 
              Baixar Agora
            </Button>
            
            <div className="flex justify-center gap-4 mt-1">
               <div className="flex items-center gap-1 text-[8px] font-bold text-white/20 uppercase">
                  <PlayCircle className="w-2.5 h-2.5" /> Android
               </div>
               <div className="flex items-center gap-1 text-[8px] font-bold text-white/20 uppercase">
                  <Apple className="w-2.5 h-2.5" /> iOS / iPhone
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
