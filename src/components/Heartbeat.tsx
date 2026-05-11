import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Heartbeat() {
  useEffect(() => {
    // Run initial tick
    supabase.rpc('tick_auctions').catch(console.error);

    const interval = setInterval(async () => {
      try {
        // 1. Tick auctions (start scheduled, finish expired)
        await supabase.rpc('tick_auctions');
        
        // 2. Process robot bids
        await supabase.rpc('process_robot_bids');
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    }, 2000); // 2 seconds to keep it responsive

    return () => clearInterval(interval);
  }, []);

  return null;
}
