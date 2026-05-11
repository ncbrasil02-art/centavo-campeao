import { Link, useLocation } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  Users, 
  Bot, 
  Settings, 
  Gavel,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminSubNavbar() {
  const location = useLocation();
  
  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Usuários", href: "/admin/users", icon: Users },
    { label: "Robôs", href: "/admin/robots", icon: Bot },
  ];

  return (
    <div className="border-b border-white/5 bg-white/[0.02] mb-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all relative",
                  isActive 
                    ? "text-primary border-b-2 border-primary" 
                    : "text-white/40 hover:text-white/60"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
