import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User, LogOut, Wallet, Gavel, LayoutDashboard, Menu, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFallbackAvatarUrl } from "@/lib/constants";
import { useSettings } from "@/hooks/useSettings";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { site_name, logo_url } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) setProfile(data);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    navigate({ to: "/" });
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          {logo_url ? (
            <img src={logo_url} alt={site_name} className="h-10 object-contain" />
          ) : (
            <>
              <div className="relative">
                <Gavel className="h-8 w-8 text-primary transition-transform group-hover:rotate-12" />
                <div className="absolute -inset-1 rounded-full bg-primary/20 blur-sm"></div>
              </div>
              <span className="text-2xl font-bold tracking-tighter text-white">
                {site_name.split(' ')[0]}<span className="text-primary">{site_name.split(' ').slice(1).join('')}</span>
              </span>
            </>
          )}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 lg:flex">
          <Link to="/" className="text-sm font-medium text-white/70 transition-colors hover:text-primary">Leilões</Link>
          <Link to="/packages" className="text-sm font-medium text-white/70 transition-colors hover:text-primary">Comprar Lances</Link>
          {profile?.is_admin && (
            <Link to="/admin" className="text-sm font-medium text-white/70 transition-colors hover:text-primary flex items-center gap-1">
              <LayoutDashboard className="w-4 h-4" /> Painel Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-[10px] font-medium text-white/50 uppercase tracking-widest">Saldo</span>
                <div className="flex items-center gap-1 text-primary font-bold">
                  <Wallet className="h-4 w-4" />
                  <span>{profile?.bid_balance || 0}</span>
                </div>
              </div>
              
              {profile?.is_admin && (
                <Button variant="outline" size="sm" className="flex border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 gap-2 h-9" asChild>
                  <Link to="/admin">
                    <LayoutDashboard className="w-4 h-4" /> Admin
                  </Link>
                </Button>
              )}

              <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-white/10 bg-white/5 hover:bg-white/10 overflow-hidden" asChild>
                <Link to={profile?.is_admin ? "/admin" : "/"}>
                  <Avatar className="h-full w-full">
                    <AvatarImage src={profile?.avatar_url || getFallbackAvatarUrl(profile?.username)} />
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                      {profile?.username?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </Button>
              
              <Button onClick={handleLogout} variant="ghost" size="icon" className="hidden sm:flex h-9 w-9 text-white/50 hover:text-red-400">
                <LogOut className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden h-10 w-10 text-white"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="text-white hover:text-primary hover:bg-white/5" asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--color-primary),0.5)]" asChild>
                <Link to="/auth">Cadastrar</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-white/10 bg-background/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
              <Link 
                to="/" 
                className="text-lg font-bold p-2 hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Leilões
              </Link>
              <Link 
                to="/packages" 
                className="text-lg font-bold p-2 hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Comprar Lances
              </Link>
              {profile?.is_admin && (
                <Link 
                  to="/admin" 
                  className="text-lg font-bold p-2 text-primary flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LayoutDashboard className="w-5 h-5" /> Painel Administrativo
                </Link>
              )}
              <div className="h-px bg-white/10 my-2" />
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <span className="font-bold">{profile?.bid_balance || 0} Lances</span>
                </div>
                <Button 
                  variant="ghost" 
                  className="text-red-400 p-0 h-auto"
                  onClick={handleLogout}
                >
                  Sair da conta
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}