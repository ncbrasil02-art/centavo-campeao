import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Heartbeat() {
  useEffect(() => {
    async function runHeartbeat() {
      console.log("Heartbeat ticking...");
      try {
        // O tick_auctions agora processa internamente os robôs e as transições de status
        const { data: tickData, error: tickError } = await supabase.rpc('tick_auctions');
        if (tickError) console.error("Tick error:", tickError);
        else if (tickData) console.log("Tick result:", tickData);
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    }

    runHeartbeat();

    const interval = setInterval(runHeartbeat, 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
