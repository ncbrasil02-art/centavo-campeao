import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Heartbeat() {
  useEffect(() => {
    async function runHeartbeat() {
      try {
        await supabase.rpc('tick_auctions');
        await supabase.rpc('process_robot_bids');
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    }

    runHeartbeat();

    const interval = setInterval(runHeartbeat, 2000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
