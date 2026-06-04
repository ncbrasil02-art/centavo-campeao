import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuctionVoiceAnnouncementsProps {
  auctionId?: string;
  auctionName?: string;
  isLive?: boolean;
}

export function AuctionVoiceAnnouncements({ auctionId, auctionName, isLive }: AuctionVoiceAnnouncementsProps) {
  const { narration_enabled, site_name } = useSettings();
  const lastAnnouncedMinute = useRef<number>(-1);
  const [recentWinners, setRecentWinners] = useState<any[]>([]);
  const lastPhrasesTime = useRef<number>(0);

  useEffect(() => {
    if (!narration_enabled) return;

    const fetchWinners = async () => {
      const { data } = await supabase
        .from('auctions')
        .select(`
          end_time,
          product:products(name),
          last_bidder:profiles(username),
          bid_count
        `)
        .eq('status', 'finished')
        .not('last_bidder_id', 'is', null)
        .order('end_time', { ascending: false })
        .limit(5);
      
      if (data) setRecentWinners(data);
    };

    fetchWinners();
  }, [narration_enabled]);

  const speak = (text: string) => {
    if (!narration_enabled) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!narration_enabled || !isLive || !auctionId) return;

    const phrases = [
      "Este leilão está muito concorrido, não perca a sua esperança!",
      "Quem tem mais lances no pacote tem muito mais chances de ganhar!",
      "Vários produtos estão saindo agora, aproveite para garantir o seu!",
      "Incentive sua sorte, compre um pacote de lances maior e domine a disputa!",
      "Não deixe para o último segundo, garanta sua liderança agora!",
      "A estratégia é a alma do negócio, use seus lances com sabedoria!",
      "Imagine este produto chegando na sua casa por este precinho!",
      "Muitos usuários já ganharam hoje, você pode ser o próximo!"
    ];

    const announcePhrasesAndWinners = () => {
      const now = Date.now();
      // Announce every 2 minutes (120000 ms)
      if (now - lastPhrasesTime.current >= 120000) {
        lastPhrasesTime.current = now;

        // 70% chance to speak a phrase, 30% chance to announce a winner if available
        if (Math.random() > 0.3 || recentWinners.length === 0) {
          const phrase = phrases[Math.floor(Math.random() * phrases.length)];
          speak(phrase);
        } else {
          const winner = recentWinners[Math.floor(Math.random() * recentWinners.length)];
          if (winner && winner.last_bidder && winner.product) {
            const dateStr = format(new Date(winner.end_time), "dd/MM/yyyy", { locale: ptBR });
            speak(`${winner.last_bidder.username} ganhou no dia ${dateStr} um ${winner.product.name} gastando apenas ${winner.bid_count} lances!`);
          }
        }
      }
    };

    const interval = setInterval(announcePhrasesAndWinners, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [narration_enabled, isLive, auctionId, recentWinners]);

  return null;
}
