import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Heartbeat() {
  useEffect(() => {
    async function runHeartbeat() {
      console.log("Heartbeat ticking...");
      try {
        // Process robot bids FIRST to ensure they can bid before tick_auctions finishes a live auction
        const { data: robotData, error: robotError } = await supabase.rpc('process_robot_bids');
        if (robotError) console.error("Robot error:", robotError);
        else if (robotData && (robotData as any).bids_placed > 0) console.log("Robot result:", robotData);

        const { data: tickData, error: tickError } = await supabase.rpc('tick_auctions');
        if (tickError) console.error("Tick error:", tickError);
        else console.log("Tick result:", tickData);
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
