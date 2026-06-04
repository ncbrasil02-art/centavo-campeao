import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Mic
} from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // Track online users via Presence
    const channel = supabase.channel('admin_presence');
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setStats(prev => ({ ...prev, onlineUsers: count + 12 })); // +12 for simulation of other users
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchStats() {
    try {
      const { data, error } = await supabase.rpc('get_admin_stats');
      
      if (error) throw error;
      
      const statsData = data as any;

      setStats(prev => ({
        ...prev,
        totalUsers: Number(statsData.totalUsers) || 0,
        activeAuctions: Number(statsData.activeAuctions) || 0,
        totalRevenue: Number(statsData.totalRevenue) || 0,
        totalBids: Number(statsData.totalBids) || 0
      }));
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="md:col-span-2 bg-white/5 border-white/10 p-6">
            <CardHeader className="px-0 pt-0 border-b border-white/5 pb-4 mb-4">
              <CardTitle className="text-lg font-bold">Resumo Geral de Usuários</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-xl text-primary"><Users className="w-5 h-5" /></div>
                  <div>
                    <p className="font-bold">Total de Cadastros</p>
                    <p className="text-xs text-white/40">Acumulado desde o início</p>
                  </div>
                </div>
                <span className="text-2xl font-black">{stats.totalUsers}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-xl text-green-500"><Bot className="w-5 h-5" /></div>
                  <div>
                    <p className="font-bold">Robôs Ativos</p>
                    <p className="text-xs text-white/40">Simulando participação agora</p>
                  </div>
                </div>
                <span className="text-2xl font-black">12</span>
              </div>
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
