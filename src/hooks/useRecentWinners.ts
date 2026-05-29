import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecentWinner {
  id: string;
  winner_name: string;
  product_name: string;
}

let cachedWinners: RecentWinner[] = [];
let lastFetch = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export function useRecentWinners() {
  const [winners, setWinners] = useState<RecentWinner[]>(cachedWinners);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function fetchWinners() {
      if (cachedWinners.length > 0 && Date.now() - lastFetch < CACHE_DURATION) {
        setWinners(cachedWinners);
        return;
      }

      const { data, error } = await supabase
        .from('auctions')
        .select(`
          id,
          product:products(name),
          last_bidder:profiles(username)
        `)
        .eq('status', 'finished')
        .order('end_time', { ascending: false })
        .limit(10);

      if (!error && data) {
        const formatted = data
          .filter(a => a.last_bidder && a.product)
          .map((a: any) => ({
            id: a.id,
            winner_name: a.last_bidder.username,
            product_name: a.product.name
          }));
        
        cachedWinners = formatted;
        lastFetch = Date.now();
        setWinners(formatted);
      }
    }

    fetchWinners();
  }, []);

  useEffect(() => {
    if (winners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % winners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [winners]);

  return {
    currentWinner: winners[currentIndex],
    allWinners: winners,
    hasWinners: winners.length > 0
  };
}
