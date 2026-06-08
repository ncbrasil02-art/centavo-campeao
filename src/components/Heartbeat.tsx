import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@tanstack/react-router";

export function Heartbeat() {
  const location = useLocation();

  useEffect(() => {
    let isRunning = false;

    async function runHeartbeat() {
      if (isRunning) return;
      isRunning = true;
      
      // console.log("Heartbeat ticking at", new Date().toISOString());
      try {
        // O tick_auctions agora processa internamente os robôs e as transições de status
        const { error: tickError } = await supabase.rpc('tick_auctions');
        if (tickError) console.error("Tick auctions error:", tickError);

        // Track user presence
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { error: presenceError } = await supabase.rpc('track_user_presence', {
            p_user_id: session.user.id,
            p_page: location.pathname
          });
          if (presenceError) console.error("Track presence error:", presenceError);
        }
      } catch (err) {
        console.error("Heartbeat fatal error:", err);
      } finally {
        isRunning = false;
      }
    }

    // Run immediately on mount or path change
    runHeartbeat();

    const interval = setInterval(runHeartbeat, 1000);

    return () => clearInterval(interval);
  }, [location.pathname]);

  return null;
}


