import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Zap, Trophy, TrendingUp, Sparkles, Rocket, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MODALITY_CONFIG, getFallbackAvatarUrl, FICTITIOUS_PARTICIPANTS } from "@/lib/constants";

interface DemoAuction {
  id: string;
  product_name: string;
  product_image: string;
  market_value: number;
  current_price: number;
  modality: string;
  last_bidder_name?: string;
  last_bidder_avatar?: string;
  timer_seconds: number;
}

export function DemoAuctionBlock({ auctions: initialAuctions }: { auctions: DemoAuction[] }) {
  const [auctions, setAuctions] = useState<DemoAuction[]>(initialAuctions);
  const [localTimes, setLocalTimes] = useState<Record<string, number>>({});
  const [winners, setWinners] = useState<Record<string, boolean>>({});
  const [randomPhrases, setRandomPhrases] = useState<Record<string, string>>({});

  const incentivePhrases = [
    { text: "Economia Real!", icon: TrendingUp },
    { text: "Lances Rápidos!", icon: Zap },
    { text: "Preço Baixo!", icon: Sparkles },
    { text: "Vai Acabar!", icon: Clock },
    { text: "Super Chance!", icon: Rocket },
    { text: "Oportunidade!", icon: Star },
  ];


  useEffect(() => {
    // Initialize timers
    const initialTimers: Record<string, number> = {};
    initialAuctions.forEach(a => {
      initialTimers[a.id] = Math.floor(Math.random() * 5) + 10;
      initialPhrases[a.id] = incentivePhrases[Math.floor(Math.random() * incentivePhrases.length)].text;
    });
    setLocalTimes(initialTimers);
    setRandomPhrases(initialPhrases);


    const interval = setInterval(() => {
      setLocalTimes(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          if (winners[id]) return;

          if (next[id] > 0) {
            next[id] -= 1;
          } else {
            const auctionIndex = auctions.findIndex(a => a.id === id);
            if (auctionIndex !== -1) {
              const auction = auctions[auctionIndex];
              
              // 10% chance to end the auction when timer hits 0
              if (Math.random() < 0.1) {
                setWinners(prevWinners => ({ ...prevWinners, [id]: true }));
                next[id] = 0;
                return;
              }

              const bot = FICTITIOUS_PARTICIPANTS[Math.floor(Math.random() * FICTITIOUS_PARTICIPANTS.length)];
              const botName = typeof bot === 'string' ? bot : (bot as any).name;
              
              setAuctions(prevAuctions => {
                const newAuctions = [...prevAuctions];
                newAuctions[auctionIndex] = {
                  ...newAuctions[auctionIndex],
                  current_price: newAuctions[auctionIndex].current_price + 0.01,
                  last_bidder_name: botName,
                  last_bidder_avatar: getFallbackAvatarUrl(botName)
                };
                return newAuctions;
              });
              setRandomPhrases(prev => ({
                ...prev,
                [id]: incentivePhrases[Math.floor(Math.random() * incentivePhrases.length)].text
              }));
              next[id] = auction.timer_seconds;

            }
          }
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [initialAuctions, winners]);

  return (
    <div className="py-12 px-4 bg-primary/5 rounded-[48px] border border-primary/10 mb-16 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Zap className="w-64 h-64 text-primary" />
      </div>
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <Badge className="bg-primary/20 text-primary border-primary/30 mb-4 px-4 py-1 rounded-full text-xs font-black uppercase italic">
            Área de Demonstração
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">
            Veja como <span className="text-primary">funciona</span> na prática
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Acompanhe estas disputas em tempo real. Os robôs estão simulando lances para você entender as diferentes modalidades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {auctions.map((auction) => {
            const time = localTimes[auction.id] || 0;
            const modality = (MODALITY_CONFIG as any)[auction.modality] || (MODALITY_CONFIG as any).standard || (MODALITY_CONFIG as any).novice;
            const Icon = modality.icon;
            
            return (
              <Card key={auction.id} className={`bg-zinc-900/50 border-white/10 rounded-[32px] overflow-hidden flex flex-col h-full group transition-all duration-500 ${winners[auction.id] ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'hover:border-primary/50'}`}>
                <div className="relative aspect-square">
                  <img 
                    src={auction.product_image} 
                    alt={auction.product_name} 
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop";
                    }}
                  />
                  <div className="absolute top-4 left-4 z-10">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 ${modality.bgColor} ${modality.color}`}>
                      <Icon className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-wider">{modality.label}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col">
                  <div>
                    <h3 className="font-bold text-sm line-clamp-1 mb-1">{auction.product_name}</h3>
                    {!winners[auction.id] && (
                      <div className="flex justify-start mb-2">
                        <span className="text-[9px] font-black text-primary/80 uppercase tracking-widest animate-pulse italic bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
                          {(() => {
                            const phraseObj = incentivePhrases.find(p => p.text === randomPhrases[auction.id]);
                            const PhraseIcon = phraseObj?.icon || Sparkles;
                            return <PhraseIcon className="w-2.5 h-2.5" />;
                          })()}
                          {randomPhrases[auction.id]}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">

                      <span className="text-xs text-white/40 line-through">R$ {auction.market_value.toFixed(2)}</span>
                      <Badge variant="outline" className="text-[10px] border-green-500/20 text-green-500 bg-green-500/5">99% OFF</Badge>
                    </div>
                  </div>

                  <div className={`rounded-2xl p-4 flex flex-col items-center justify-center border relative overflow-hidden transition-colors duration-500 ${winners[auction.id] ? 'bg-red-500/20 border-red-500/50' : 'bg-black/40 border-white/5'}`}>
                    <div className={`text-2xl font-black tabular-nums ${winners[auction.id] ? 'text-red-500' : 'text-primary'}`}>R$ {auction.current_price.toFixed(2)}</div>
                    <div className="text-[10px] font-medium text-white/40 uppercase tracking-widest mt-1">{winners[auction.id] ? 'Arrematado por' : 'Preço Atual'}</div>
                    
                    <div className="w-full mt-4 space-y-1.5">
                      <div className="flex justify-between items-end mb-1">
                        <span className={`text-xl font-black italic tabular-nums ${winners[auction.id] ? 'text-red-500' : time <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                          00:{time.toString().padStart(2, '0')}
                        </span>
                        <Clock className={`w-4 h-4 ${winners[auction.id] || time <= 5 ? 'text-red-500' : 'text-white/20'}`} />
                      </div>
                      <Progress value={winners[auction.id] ? 0 : (time / auction.timer_seconds) * 100} className="h-1.5 bg-white/5" />
                    </div>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className={`flex items-center gap-3 p-2 rounded-xl border transition-colors duration-500 ${winners[auction.id] ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/5'}`}>
                      <div className={`w-8 h-8 rounded-full overflow-hidden border ${winners[auction.id] ? 'border-red-500' : 'border-primary/30'}`}>
                        <img src={auction.last_bidder_avatar || getFallbackAvatarUrl("Bot")} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className={`text-[10px] uppercase font-black ${winners[auction.id] ? 'text-red-500' : 'text-white/40'}`}>{winners[auction.id] ? 'Ganhador' : 'Líder'}</p>
                        <p className={`text-xs font-bold truncate ${winners[auction.id] ? 'text-red-500' : ''}`}>{auction.last_bidder_name || "Aguardando..."}</p>
                      </div>
                      <Trophy className={`w-4 h-4 ${winners[auction.id] ? 'text-red-500 animate-bounce' : 'text-yellow-500/50'}`} />
                    </div>

                    <Button 
                      disabled 
                      className={`w-full font-black uppercase italic text-xs h-12 transition-all duration-500 ${winners[auction.id] ? 'bg-red-500 text-white border-none' : 'bg-primary/20 text-primary border border-primary/30'}`}
                    >
                      {winners[auction.id] ? 'ARREMATADO' : 'LANCE (DEMO)'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}