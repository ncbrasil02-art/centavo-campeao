import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Trophy, Medal, Star, ArrowUpRight, Crown, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getFallbackAvatarUrl } from "@/lib/constants";
import { motion } from "framer-motion";
import { useSettings } from "@/hooks/useSettings";

export const Route = createFileRoute("/ranking")({
  component: RankingPage,
});

function RankingPage() {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, []);

  async function fetchRanking() {
    const { data, error } = await supabase
      .from("v_user_ranking")
      .select("*")
      .order("total_wins", { ascending: false })
      .limit(50);

    if (!error && data) {
      setRanking(data);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary selection:text-primary-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-6"
            >
              <Trophy className="w-8 h-8" />
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-4">
              Hall da <span className="text-primary">Fama</span>
            </h1>
            <p className="text-white/40 max-w-xl mx-auto">
              Os maiores arrematadores da plataforma. Conheça as lendas que dominam os leilões do {useSettings().site_name}.
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : ranking.length > 0 ? (
            <div className="space-y-6">
              {/* Top 3 Spotlight */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {ranking.slice(0, 3).map((user, idx) => (
                  <motion.div
                    key={user.user_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <TopUserCard user={user} rank={idx + 1} />
                  </motion.div>
                ))}
              </div>

              {/* Table Style List */}
              <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-6 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-white/30 italic">
                  <div className="col-span-1 text-center">POS</div>
                  <div className="col-span-5 sm:col-span-6">USUÁRIO</div>
                  <div className="col-span-3 text-center">VITÓRIAS</div>
                  <div className="col-span-3 sm:col-span-2 text-right">ECONOMIA</div>
                </div>

                {ranking.slice(3).map((user, idx) => (
                  <motion.div
                    key={user.user_id}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="grid grid-cols-12 gap-4 p-6 items-center hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="col-span-1 text-center font-black italic text-white/40 group-hover:text-primary">
                      #{idx + 4}
                    </div>
                    <div className="col-span-5 sm:col-span-6 flex items-center gap-4">
                      <Avatar className="h-10 w-10 border border-white/10 group-hover:border-primary/30 transition-all">
                        <AvatarImage src={user.avatar_url || getFallbackAvatarUrl(user.username)} />
                        <AvatarFallback>{user.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white truncate">{user.username}</span>
                        <span className="text-[10px] text-white/30 truncate">{user.full_name || "Membro Gold"}</span>
                      </div>
                    </div>
                    <div className="col-span-3 text-center">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black italic">
                        {user.total_wins}
                      </Badge>
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-right">
                      <span className="text-green-500 font-black italic tracking-tighter">
                        {Number(user.avg_savings).toFixed(1)}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-[32px] border border-dashed border-white/10">
              <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40">Nenhum dado de ranking disponível ainda.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TopUserCard({ user, rank }: { user: any, rank: number }) {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;

  return (
    <Card className={`relative overflow-hidden p-8 flex flex-col items-center gap-6 border-2 transition-all duration-500 hover:scale-[1.05] ${
      isFirst ? "bg-primary/10 border-primary/40 shadow-[0_0_50px_rgba(var(--color-primary),0.2)]" : "bg-white/5 border-white/10"
    }`}>
      <div className="absolute top-4 left-4">
        {isFirst && <Crown className="w-8 h-8 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />}
        {!isFirst && <Medal className={`w-8 h-8 ${isSecond ? "text-slate-400" : "text-amber-700"}`} />}
      </div>

      <div className="relative">
        <div className={`w-24 h-24 rounded-3xl overflow-hidden border-4 p-1 ${
          isFirst ? "border-primary" : "border-white/10"
        }`}>
          <Avatar className="h-full w-full rounded-2xl">
            <AvatarImage src={user.avatar_url || getFallbackAvatarUrl(user.username)} />
            <AvatarFallback>{user.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
        <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full font-black italic text-xs uppercase ${
          isFirst ? "bg-primary text-primary-foreground" : "bg-white text-black"
        }`}>
          #{rank}
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-1">{user.username}</h3>
        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">{user.full_name || "Membro Premium"}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-white/5">
        <div className="text-center">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Vitórias</p>
          <p className="text-2xl font-black italic text-primary">{user.total_wins}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Economia</p>
          <p className="text-2xl font-black italic text-green-500">{Number(user.avg_savings).toFixed(0)}%</p>
        </div>
      </div>

      {isFirst && (
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent opacity-50 pointer-events-none" />
      )}
    </Card>
  );
}
