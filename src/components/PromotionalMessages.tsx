import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, Gift, ShoppingCart } from "lucide-react";

export function PromotionalMessages() {
  const [lastShown, setLastShown] = useState(0);

  useEffect(() => {
    const checkBalance = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase.rpc("get_my_profile").maybeSingle() as any;

      if (profile && (profile.bid_balance || 0) <= 5) {
        const now = Date.now();
        // Show at most once every 5 minutes to not be annoying
        if (now - lastShown > 5 * 60 * 1000) {
          toast("⚡ Oferta Relâmpago!", {
            description: "Seu saldo de lances está baixo. Compre agora com 40% de bônus!",
            icon: <Zap className="w-5 h-5 text-yellow-500" />,
            action: {
              label: "Comprar",
              onClick: () => window.location.href = "/packages"
            },
            duration: 10000,
          });
          setLastShown(now);
        }
      }
    };

    // Check every 2 minutes
    const interval = setInterval(checkBalance, 2 * 60 * 1000);
    
    // Initial check after 30 seconds
    const timeout = setTimeout(checkBalance, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [lastShown]);

  return null;
}
