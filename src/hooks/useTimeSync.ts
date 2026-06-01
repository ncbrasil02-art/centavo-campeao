import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

let serverOffset = 0;
let isSynced = false;
let samples: number[] = [];

export function useTimeSync() {
  const [offset, setOffset] = useState(serverOffset);
  const [synced, setSynced] = useState(isSynced);

  useEffect(() => {
    if (isSynced && samples.length >= 3) return;

    async function syncTime() {
      try {
        // Perform multiple samples for better precision
        for (let i = 0; i < 3; i++) {
          const start = performance.now();
          const { data, error } = await supabase.rpc('get_server_time');
          const end = performance.now();
          
          if (!error && data) {
            const latency = (end - start) / 2;
            const serverTime = new Date(data as string).getTime();
            // Using Date.now() for the actual timestamp but performance.now() for latency measurement
            const currentLocalTime = Date.now();
            const currentOffset = (serverTime + latency) - currentLocalTime;
            samples.push(currentOffset);
          }
          // Small delay between samples
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (samples.length > 0) {
          // Use the median offset to avoid outliers
          const sortedSamples = [...samples].sort((a, b) => a - b);
          const medianOffset = sortedSamples[Math.floor(sortedSamples.length / 2)];
          
          serverOffset = medianOffset;
          isSynced = true;
          setOffset(medianOffset);
          setSynced(true);
          console.log(`[TimeSync] Highly precise server offset: ${medianOffset}ms (from ${samples.length} samples)`);
        }
      } catch (err) {
        console.error("[TimeSync] Error syncing time:", err);
      }
    }

    syncTime();
  }, []);

  const getAdjustedNow = useCallback(() => Date.now() + offset, [offset]);

  const formatBrasiliaTime = useCallback((date: Date | number, formatStr: string = "HH:mm:ss") => {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(typeof date === 'number' ? new Date(date) : date);
  }, []);

  return { offset, synced, getAdjustedNow, formatBrasiliaTime };
}
