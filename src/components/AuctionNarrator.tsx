import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/useSettings";

export function AuctionNarrator() {
  const { site_name, narration_enabled } = useSettings();
  const spokenRef = useRef<Set<string>>(new Set());
  const lastRandomNarrationRef = useRef<number>(0);

  useEffect(() => {
    if (!narration_enabled) return;

    const checkAuctionsAndEncourage = async () => {
      // 1. Check for upcoming auctions
      const { data: auctions } = await supabase
        .from("auctions")
        .select("id, product:products(name), start_time")
        .eq("status", "scheduled")
        .gt("start_time", new Date().toISOString());

      // 2. Check for active auctions to say random phrases
      const { data: activeAuctions } = await supabase
        .from("auctions")
        .select("id")
        .eq("status", "active");

      const now = new Date().getTime();

      // Random encouragement every 3 minutes if there are active auctions
      if (activeAuctions && activeAuctions.length > 0 && (now - lastRandomNarrationRef.current) > 180000) {
        const { data: phrases } = await supabase
          .from("narration_phrases")
          .select("phrase")
          .eq("is_active", true);

        if (phrases && phrases.length > 0) {
          const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)].phrase;
          speak(randomPhrase);
          lastRandomNarrationRef.current = now;
        }
      }

      if (!auctions) return;

      const now = new Date().getTime();

      auctions.forEach((auction: any) => {
        const startTime = new Date(auction.start_time).getTime();
        const diffMs = startTime - now;
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffSeconds = Math.floor(diffMs / 1000);

        const productName = auction.product?.name || "produto";
        
        // 5 minute warning
        const key5 = `${auction.id}-5min`;
        if (diffMinutes === 5 && diffSeconds <= 305 && !spokenRef.current.has(key5)) {
          speak(`Não perca! Em 5 minutos o leilão do ${productName} vai começar no ${site_name}. Participe!`);
          spokenRef.current.add(key5);
        }

        // 1 minute warning
        const key1 = `${auction.id}-1min`;
        if (diffMinutes === 1 && diffSeconds <= 65 && !spokenRef.current.has(key1)) {
          speak(`Um minuto faltando! O leilão do ${productName} vai começar pessoal! Fiquem ligados no ${site_name}!`);
          spokenRef.current.add(key1);
        }
      });
    };

    const speak = (text: string) => {
      if (!window.speechSynthesis) return;
      
      // Cancel any ongoing speech to avoid overlapping
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    };

    const interval = setInterval(checkAuctionsAndEncourage, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [narration_enabled, site_name]);

  return null;
}
