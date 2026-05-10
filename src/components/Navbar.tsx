import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User, LogOut, Wallet, Gavel, LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getFallbackAvatarUrl } from "@/lib/constants";

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

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
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Gavel className="h-8 w-8 text-primary transition-transform group-hover:rotate-12" />
            <div className="absolute -inset-1 rounded-full bg-primary/20 blur-sm"></div>
          </div>
          <span className="text-2xl font-bold tracking-tighter text-white">
            LANCE<span className="text-primary">CERTO</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link to="/" className="text-sm font-medium text-white/70 transition-colors hover:text-primary">Leilões</Link>
          <Link to="/packages" className="text-sm font-medium text-white/70 transition-colors hover:text-primary">Comprar Lances</Link>
          <Link to="/admin/robots" className="text-sm font-medium text-white/70 transition-colors hover:text-primary">Painel Robôs</Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden flex-col items-end md:flex">
                <span className="text-xs font-medium text-white/50">Saldo</span>
                <div className="flex items-center gap-1 text-primary font-bold">
                  <Wallet className="h-4 w-4" />
                  <span>{profile?.bid_balance || 0} Lances</span>
                </div>
              </div>
              <Button variant="outline" size="icon" className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 overflow-hidden" asChild>
                <Link to="/">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={profile?.avatar_url || getFallbackAvatarUrl(profile?.username)} />
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                      {profile?.username?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </Button>
              <Button onClick={handleLogout} variant="ghost" size="icon" className="text-white/50 hover:text-red-400">
                <LogOut className="h-4 w-4" />
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
    </nav>
  );
}
