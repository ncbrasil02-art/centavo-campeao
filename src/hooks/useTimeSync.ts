import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

let serverOffset = 0;
let isSynced = false;
let syncFailed = false;
let samples: number[] = [];

export function useTimeSync() {
  const [offset, setOffset] = useState(serverOffset);
  const [synced, setSynced] = useState(isSynced);

  useEffect(() => {
    if (isSynced && samples.length >= 3) return;
    if (syncFailed) return;

    async function syncTime() {
      try {
        for (let i = 0; i < 3; i++) {
          const start = performance.now();
          const { data, error } = await supabase.rpc('get_server_time');
          const end = performance.now();

          if (error) {
            console.warn('[TimeSync] Server time sync unavailable, using local time:', error.message);
            syncFailed = true;
            isSynced = true;
            setSynced(true);
            return;
          }

          if (data) {
            const latency = (end - start) / 2;
            const serverTime = new Date(data as string).getTime();
            const currentLocalTime = Date.now();
            const currentOffset = (serverTime + latency) - currentLocalTime;
            samples.push(currentOffset);
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (samples.length > 0) {
          const sortedSamples = [...samples].sort((a, b) => a - b);
          const medianOffset = sortedSamples[Math.floor(sortedSamples.length / 2)];
          serverOffset = medianOffset;
          isSynced = true;
          setOffset(medianOffset);
          setSynced(true);
          console.log(`[TimeSync] Server offset: ${medianOffset}ms (from ${samples.length} samples)`);
        }
      } catch (err) {
        console.error('[TimeSync] Error syncing time:', err);
        syncFailed = true;
        isSynced = true;
        setSynced(true);
      }
    }

    syncTime();
  }, []);

  const getAdjustedNow = useCallback(() => Date.now() + offset, [offset]);

  const formatBrasiliaTime = useCallback((date: Date | number | string, formatStr: string = "HH:mm:ss") => {
    const d = typeof date === 'string' ? new Date(date) : (typeof date === 'number' ? new Date(date) : date);

    if (formatStr === "HH:mm:ss") {
      return new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(d);
    }

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d).replace(',', '');
  }, []);

  return { offset, synced, getAdjustedNow, formatBrasiliaTime };
}
