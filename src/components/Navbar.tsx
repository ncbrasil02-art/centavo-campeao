import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User, LogOut, Wallet, Gavel, LayoutDashboard, Menu, X, Clock, Settings } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFallbackAvatarUrl } from "@/lib/constants";
import { useSettings } from "@/hooks/useSettings";
import { useTimeSync } from "@/hooks/useTimeSync";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { site_name, logo_url, logo_height, logo_height_mobile, logo_padding_x, logo_padding_y } = useSettings();
  const { getAdjustedNow, synced, formatBrasiliaTime } = useTimeSync();
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("--:--:--");
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(formatBrasiliaTime(getAdjustedNow()));
    }, 1000);
    return () => clearInterval(timer);
  }, [getAdjustedNow, formatBrasiliaTime]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        subscribeToProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        subscribeToProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function subscribeToProfile(userId: string) {
    const channel = supabase
      .channel(`profile_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          setProfile(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data);
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    navigate({ to: "/" });
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md text-foreground">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          {logo_url ? (
            <div 
              style={{ 
                padding: `${logo_padding_y || 0}px ${logo_padding_x || 0}px`,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <img 
                src={logo_url} 
                alt={site_name} 
                className="object-contain hidden md:block" 
                style={{ height: `${logo_height || 40}px` }} 
              />
              <img 
                src={logo_url} 
                alt={site_name} 
                className="object-contain block md:hidden" 
                style={{ height: `${logo_height_mobile || 32}px` }} 
              />
            </div>
          ) : (
            <>
              <div className="relative">
                <Gavel className="h-8 w-8 text-primary transition-transform group-hover:rotate-12" />
                <div className="absolute -inset-1 rounded-full bg-primary/20 blur-sm"></div>
              </div>
              <span className="text-2xl font-bold tracking-tighter text-foreground">
                {site_name.split(' ')[0]}<span className="text-primary">{site_name.split(' ').slice(1).join('')}</span>
              </span>
            </>
          )}
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <div className="flex flex-col items-center px-4 border-x border-border bg-muted/30 py-1 rounded-lg relative group/time">
            <span className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-0.5 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Horário Oficial
              {synced && <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]" title="Sincronizado em tempo real"></div>}
            </span>
            <span className="text-sm font-black tabular-nums text-foreground/90">
              {currentTimeStr}
            </span>
          </div>
          <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Leilões</Link>
          <Link to="/how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Como Funciona</Link>
          <Link to="/ranking" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Ranking</Link>
          <Link to="/packages" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Comprar Lances</Link>
          
          {(profile?.is_admin || user?.id === 'cdf027bb-f239-4ba0-b8a9-7bf52341df4b' || user?.id === 'ad8443eb-d096-46ad-ba39-07abdba01fdb') && (
            <Link 
              to="/admin" 
              className="p-2 text-primary transition-all hover:scale-110 bg-primary/10 rounded-full border border-primary/30 shadow-[0_0_20px_rgba(var(--color-primary),0.3)]"
              title="Painel Administrativo"
            >
              <LayoutDashboard className="w-5 h-5" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          <div className="flex lg:hidden flex-col items-center px-3 border-x border-border bg-muted/30 py-0.5 rounded-lg">
            <span className="text-[8px] font-black text-primary/60 uppercase tracking-widest mb-0 flex items-center gap-0.5">
              <Clock className="w-2 h-2" /> HORA
            </span>
            <span className="text-xs font-black tabular-nums text-foreground/90">
              {currentTimeStr}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-muted animate-pulse rounded-full"></div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Saldo</span>
                <div className="flex items-center gap-1 text-primary font-bold">
                  <Wallet className="h-4 w-4" />
                  <span>{profile?.bid_balance || 0}</span>
                </div>
              </div>
              
              {(profile?.is_admin || user?.id === 'cdf027bb-f239-4ba0-b8a9-7bf52341df4b' || user?.id === 'ad8443eb-d096-46ad-ba39-07abdba01fdb') && (
                <Button variant="outline" size="icon" className="hidden sm:flex border-primary/40 bg-primary/20 text-primary hover:bg-primary/30 h-10 w-10 shadow-[0_0_15px_rgba(var(--color-primary),0.2)]" asChild>
                  <Link to="/admin" title="Painel Administrativo">
                    <LayoutDashboard className="w-5 h-5" />
                  </Link>
                </Button>
              )}

              <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-border bg-muted/50 hover:bg-muted overflow-hidden" asChild>
                <Link to={"/profile" as any}>
                  <Avatar className="h-full w-full">
                    <AvatarImage src={profile?.avatar_url || getFallbackAvatarUrl(profile?.username)} />
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                      {profile?.username?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </Button>
              
              <Button onClick={handleLogout} variant="ghost" size="icon" className="hidden sm:flex h-9 w-9 text-muted-foreground hover:text-red-400">
                <LogOut className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden h-10 w-10 text-foreground"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="text-foreground hover:text-primary hover:bg-muted" asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" asChild>
                <Link to="/auth" search={{ register: "true" }}>Cadastrar</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
              <div className="flex items-center justify-between p-2 mb-2 bg-primary/5 rounded-xl border border-primary/10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Horário de Brasília</span>
                  <span className="text-xl font-black tabular-nums">{currentTimeStr}</span>
                </div>
                <Clock className="w-6 h-6 text-primary/40" />
              </div>
              <Link to={"/profile" as any} className="text-lg font-bold p-2 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Leilões</Link>
              <Link to="/ranking" className="text-lg font-bold p-2 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Ranking</Link>
              <Link to="/packages" className="text-lg font-bold p-2 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Comprar Lances</Link>
              <Link to={"/profile" as any} className="text-lg font-bold p-2 hover:text-primary transition-colors" onClick={() => setIsMenuOpen(false)}>Meu Perfil</Link>

              {(profile?.is_admin || user?.id === 'cdf027bb-f239-4ba0-b8a9-7bf52341df4b') && (
                <Link 
                  to="/admin" 
                  className="text-lg font-black p-3 text-primary flex items-center justify-center gap-3 bg-primary/10 rounded-2xl border border-primary/20"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LayoutDashboard className="w-6 h-6" /> PAINEL ADMIN
                </Link>
              )}
              <div className="h-px bg-border my-2" />
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <span className="font-bold">{profile?.bid_balance || 0} Lances</span>
                </div>
                <Button variant="ghost" className="text-red-400 p-0 h-auto" onClick={handleLogout}>Sair da conta</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
