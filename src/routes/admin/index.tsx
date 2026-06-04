import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Gavel, 
  TrendingUp, 
  Wallet, 
  Bot, 
  ArrowUpRight, 
  Activity,
  Circle,
  Package,
  Mic,
  MessageSquare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CardDescription } from "@/components/ui/card";
import { 

  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    activeAuctions: 0,
    totalRevenue: 0,
    totalBids: 0
  });
  const [onlineProfiles, setOnlineProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchOnlineProfiles();
    
    // Subscribe to profile changes to update online list
    const channel = supabase
      .channel('admin_presence_tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchOnlineProfiles();
        fetchStats();
      })
      .subscribe();

    const statsInterval = setInterval(fetchStats, 30000); // Refresh stats every 30s

    return () => {
      supabase.removeChannel(channel);
      clearInterval(statsInterval);
    };
  }, []);

  async function fetchStats() {
    try {
      const { data, error } = await supabase.rpc('get_admin_stats_v2');
      if (error) throw error;
      if (data) setStats(data as any);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOnlineProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .gt('last_seen_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('last_seen_at', { ascending: false });
    
    if (data) setOnlineProfiles(data);
  }


  // Mock data for charts
  const chartData = [
    { name: "Seg", bids: 450, revenue: 1200 },
    { name: "Ter", bids: 520, revenue: 1500 },
    { name: "Qua", bids: 480, revenue: 1100 },
    { name: "Qui", bids: 610, revenue: 1800 },
    { name: "Sex", bids: 750, revenue: 2400 },
    { name: "Sab", bids: 890, revenue: 3100 },
    { name: "Dom", bids: 920, revenue: 3500 },
  ];

  return (
    <div className="min-h-screen bg-background text-white">
      
      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">
              Painel de <span className="text-primary">Controle</span>
            </h1>
            <p className="text-white/40 flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" /> 
              Visão geral do sistema em tempo real
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" className="border-white/10 hover:bg-white/5" asChild>
              <Link to="/admin/products"><Package className="w-4 h-4 mr-2" /> Gerenciar Lotes</Link>
            </Button>
            <Button variant="outline" className="border-white/10 hover:bg-white/5" asChild>
              <Link to="/admin/packages"><TrendingUp className="w-4 h-4 mr-2" /> Pacotes de Lances</Link>
            </Button>
            <Button className="bg-primary text-primary-foreground font-bold" asChild>
              <Link to="/admin/auctions"><Gavel className="w-4 h-4 mr-2" /> Novo Leilão</Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard 
            title="Usuários Online" 
            value={stats.onlineUsers.toString()} 
            icon={<Circle className="w-4 h-4 fill-green-500 text-green-500 animate-pulse" />} 
            description="Participantes ativos agora"
          />
          <StatCard 
            title="Leilões Ativos" 
            value={stats.activeAuctions.toString()} 
            icon={<Gavel className="w-4 h-4 text-primary" />} 
            description="Disputas em andamento"
          />
          <StatCard 
            title="Receita Total" 
            value={`R$ ${stats.totalRevenue.toFixed(2)}`} 
            icon={<Wallet className="w-4 h-4 text-green-500" />} 
            description="Vendas de pacotes concluídas"
          />
          <StatCard 
            title="Total de Lances" 
            value={stats.totalBids.toString()} 
            icon={<TrendingUp className="w-4 h-4 text-blue-500" />} 
            description="Interações totais no sistema"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <Card className="bg-white/5 border-white/10 p-6 backdrop-blur-md">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Volume de Lances (Semanal)
                <ArrowUpRight className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #ffffff10", borderRadius: "12px" }}
                    itemStyle={{ color: "#ffffff" }}
                  />
                  <Bar dataKey="bids" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-6 backdrop-blur-md">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Faturamento Estimado
                <TrendingUp className="w-4 h-4 text-green-500" />
              </CardTitle>
            </CardHeader>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #ffffff10", borderRadius: "12px" }}
                    itemStyle={{ color: "#ffffff" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="var(--color-primary)" 
                    strokeWidth={3} 
                    dot={{ fill: "var(--color-primary)", strokeWidth: 2, r: 4 }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Recent Activity / Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 bg-white/5 border-white/10 p-6 backdrop-blur-md">
            <CardHeader className="px-0 pt-0 border-b border-white/5 pb-4 mb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Usuários Ativos Agora</CardTitle>
                <CardDescription className="text-white/40 text-xs uppercase font-bold tracking-tighter">Quem está navegando no site agora</CardDescription>
              </div>
              <Badge className="bg-green-500/20 text-green-500 border-green-500/20">{onlineProfiles.length} ONLINE</Badge>
            </CardHeader>
            <div className="space-y-3">
              {onlineProfiles.length > 0 ? (
                onlineProfiles.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border border-primary/30">
                          <AvatarImage src={p.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black">{p.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#121212] animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                      </div>
                      <div>
                        <p className="font-bold text-sm">{p.full_name || p.username || "Usuário"}</p>
                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1.5">
                          <Activity className="w-2.5 h-2.5" /> 
                          {p.current_page || "Página Inicial"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-white/40 font-bold uppercase">Último Acesso</p>
                        <p className="text-xs font-mono">{new Date(p.last_seen_at).toLocaleTimeString()}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-primary bg-primary/10 hover:bg-primary hover:text-black transition-all rounded-full" asChild>
                         <Link to="/admin/users"><Users className="w-4 h-4" /></Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <p className="text-white/40 italic text-sm">Nenhum usuário ativo nos últimos 5 minutos.</p>
                </div>
              )}
            </div>
          </Card>


          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20 p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                <Gavel className="w-20 h-20" />
              </div>
              <h3 className="font-bold text-xl mb-4 relative z-10">Atalhos Administrativos</h3>
              <div className="grid grid-cols-1 gap-3 relative z-10">
                <Button variant="secondary" className="justify-start bg-white/5 hover:bg-white/10 border-white/10" asChild>
                  <Link to="/admin/products">Gerenciar Lotes (Produtos)</Link>
                </Button>
                <Button variant="secondary" className="justify-start bg-white/5 hover:bg-white/10 border-white/10" asChild>
                  <Link to="/admin/packages">Configurar Pacotes de Lances</Link>
                </Button>
                <Button variant="secondary" className="justify-start bg-white/5 hover:bg-white/10 border-white/10" asChild>
                  <Link to="/admin/settings">Configurações Globais</Link>
                </Button>
                <Button variant="secondary" className="justify-start bg-primary/20 hover:bg-primary/30 border-primary/30 text-primary font-bold" asChild>
                  <Link to="/admin/phrases">
                    <Mic className="w-4 h-4 mr-2" /> Gerenciar Narração
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, description }: { title: string, value: string, icon: React.ReactNode, description: string }) {
  return (
    <Card className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-all border-l-4 border-l-primary/40">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{title}</span>
        <div className="bg-white/5 p-2 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-black text-white mb-1">{value}</div>
      <p className="text-[10px] text-white/40 font-bold uppercase">{description}</p>
    </Card>
  );
}
