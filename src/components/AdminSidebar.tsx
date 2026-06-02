import { Link, useLocation } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  Users, 
  Bot, 
  Settings, 
  Gavel,
  History,
  Package,
  MessageSquare,
  Image as ImageIcon,
  LogOut,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/useSettings";

export function AdminSidebar() {
  const location = useLocation();
  const { site_name, logo_url, logo_height } = useSettings();
  
  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Usuários", href: "/admin/users", icon: Users },
    { label: "Lotes / Produtos", href: "/admin/products", icon: Package },
    { label: "Leilões", href: "/admin/auctions", icon: Gavel },
    { label: "Robôs", href: "/admin/robots", icon: Bot },
    { label: "Pacotes", href: "/admin/packages", icon: History },
    { label: "Frases", href: "/admin/phrases", icon: MessageSquare },
    { label: "Vendas", href: "/admin/sales", icon: History },
    { label: "Banners", href: "/admin/banners", icon: ImageIcon },
    { label: "Depoimentos", href: "/admin/testimonials", icon: MessageSquare },
    { label: "Configurações", href: "/admin/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="w-64 min-h-screen bg-zinc-950 border-r border-white/5 flex flex-col sticky top-0">
      <div className="p-6 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2">
          {logo_url ? (
            <img src={logo_url} alt={site_name} style={{ height: `${(logo_height || 40) * 0.8}px` }} className="object-contain" />
          ) : (
            <>
              <Gavel className="h-6 w-6 text-primary" />
              <span className="text-xl font-black italic tracking-tighter text-white">
                ADMIN<span className="text-primary">PANEL</span>
              </span>
            </>
          )}
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center justify-between group px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--color-primary),0.2)]" 
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-primary/60")} />
                {item.label}
              </div>
              <ChevronRight className={cn("w-3 h-3 transition-transform", isActive ? "rotate-90" : "opacity-0 group-hover:opacity-100")} />
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10 gap-3 font-bold uppercase tracking-widest text-[10px]"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Sair do Painel
        </Button>
      </div>
    </aside>
  );
}
