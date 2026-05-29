import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getFallbackAvatarUrl } from '@/lib/constants';

export interface RecentWinner {
  id: string;
  winner_name: string;
  product_name: string;
  avatar_url?: string;
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
        // Randomize starting index to avoid same winner in multiple cards
        setCurrentIndex(Math.floor(Math.random() * cachedWinners.length));
        return;
      }

      const { data, error } = await supabase
        .from('auctions')
        .select(`
          id,
          product:products(name),
          last_bidder:profiles(username, avatar_url)
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
            product_name: a.product.name,
            avatar_url: a.last_bidder.avatar_url || getFallbackAvatarUrl(a.last_bidder.username)
          }));
        
        cachedWinners = formatted;
        lastFetch = Date.now();
        setWinners(formatted);
        // Randomize starting index
        setCurrentIndex(Math.floor(Math.random() * formatted.length));
      }
    }

    fetchWinners();
  }, []);

  useEffect(() => {
    if (winners.length <= 1) return;

    // Slow down rotation - every 8 seconds
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % winners.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [winners]);

  return {
    currentWinner: winners[currentIndex],
    allWinners: winners,
    hasWinners: winners.length > 0
  };
}

