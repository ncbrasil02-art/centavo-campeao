import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@tanstack/react-router";

export function Heartbeat() {
  const location = useLocation();

  useEffect(() => {
    async function runHeartbeat() {
      console.log("Heartbeat ticking...");
      try {
        // O tick_auctions agora processa internamente os robôs e as transições de status
        void supabase.rpc('tick_auctions');

        // Track user presence
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          void supabase.rpc('track_user_presence', {
            p_user_id: session.user.id,
            p_page: location.pathname
          });
        }
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    }

    runHeartbeat();

    const interval = setInterval(runHeartbeat, 5000); // 5 seconds is enough for presence

    return () => clearInterval(interval);
  }, [location.pathname]);

  return null;
}

