import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

let serverOffset = 0;
let isSynced = false;

export function useTimeSync() {
  const [offset, setOffset] = useState(serverOffset);
  const [synced, setSynced] = useState(isSynced);

  useEffect(() => {
    if (isSynced) return;

    async function syncTime() {
      const start = Date.now();
      const { data, error } = await supabase.rpc('get_server_time');
      const end = Date.now();
      
      if (!error && data) {
        // Estimate latency as half of roundtrip
        const latency = (end - start) / 2;
        const serverTime = new Date(data as string).getTime();
        // Offset is server - local
        // Adjusted now = Date.now() + offset
        const newOffset = (serverTime + latency) - end;
        
        serverOffset = newOffset;
        isSynced = true;
        setOffset(newOffset);
        setSynced(true);
        console.log(`[TimeSync] Server offset: ${newOffset}ms, Latency: ${latency}ms`);
      }
    }

    syncTime();
  }, []);

  const getAdjustedNow = useCallback(() => Date.now() + offset, [offset]);

  return { offset, synced, getAdjustedNow };
}
