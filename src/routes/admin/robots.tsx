import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { AdminSubNavbar } from "@/components/AdminSubNavbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bot, Settings2, Power, AlertCircle, LayoutDashboard, Users, Gavel, PlayCircle, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { useTimeSync } from "@/hooks/useTimeSync";

export const Route = createFileRoute("/admin/robots")({
  component: AdminRobotsPage,
});

function AdminRobotsPage() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [robots, setRobots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [automationActive, setAutomationActive] = useState(false);
  const automationRef = useRef<boolean>(false);
  const navigate = useNavigate();
  const { getAdjustedNow } = useTimeSync();

  useEffect(() => {
    fetchAuctionsWithRobots();
    fetchRobotUsers();
  }, []);

  async function fetchRobotUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("is_bot", true);
    if (data) setRobots(data);
  }

  async function fetchAuctionsWithRobots() {
    const { data, error } = await supabase
      .from("auctions")
      .select(`
        *,
        product:products(name),
        robot_settings(*)
      `)
      .eq("status", "live");
    
    if (data) {
      for (const auction of data) {
        if (!auction.robot_settings || auction.robot_settings.length === 0) {
          await supabase.from("robot_settings").insert({ auction_id: auction.id });
        }
      }
      const { data: updatedData } = await supabase
        .from("auctions")
        .select(`
          *,
          product:products(name),
          robot_settings(*)
        `)
        .eq("status", "live");
      
      if (updatedData) setAuctions(updatedData);
    }
    setLoading(false);
  }

  async function runAutomation() {
    if (!automationRef.current) return;
    
    for (const auction of auctions) {
      const settings = auction.robot_settings?.[0];
      if (!settings?.active) continue;

      const end = new Date(auction.end_time).getTime();
      const now = getAdjustedNow();
      const diff = Math.max(0, Math.ceil((end - now) / 1000));

      let bidChance = 0.1; 
      if (diff < 10) bidChance = 0.4;
      if (diff < 5) bidChance = 0.8;

      if (Math.random() < bidChance) {
        const randomRobot = robots[Math.floor(Math.random() * robots.length)];
        if (randomRobot && auction.last_bidder_id !== randomRobot.id) {
          triggerRobotBid(auction.id, randomRobot.id);
        }
      }
    }
  }

  const triggerRobotBid = async (auctionId: string, robotId: string) => {
    await supabase.rpc('place_robot_bid', {
      p_auction_id: auctionId,
      p_robot_id: robotId
    });
    fetchAuctionsWithRobots();
  };

  const toggleRobot = async (auctionId: string, currentStatus: boolean, settingsId: string) => {
    const { error } = await supabase
      .from("robot_settings")
      .update({ active: !currentStatus })
      .eq("id", settingsId);
    
    if (!error) {
      toast.success(`Robô ${!currentStatus ? 'ativado' : 'desativado'}`);
      fetchAuctionsWithRobots();
    }
  };

  const toggleInnerDispute = async (settingsId: string, currentStatus: boolean, minutes: number = 50) => {
    const endAt = !currentStatus ? new Date(Date.now() + minutes * 60 * 1000).toISOString() : null;
    
    const { error } = await supabase
      .from("robot_settings")
      .update({ 
        inner_dispute_enabled: !currentStatus,
        inner_dispute_end_at: endAt
      })
      .eq("id", settingsId);
    
    if (!error) {
      toast.success(`Disputa interna ${!currentStatus ? 'ativada' : 'desativada'}`);
      fetchAuctionsWithRobots();
    }
  };

  const updateDelay = async (settingsId: string, min: number, max: number) => {
    const { error } = await supabase
      .from("robot_settings")
      .update({ min_delay: min, max_delay: max })
      .eq("id", settingsId);
    
    if (!error) {
      toast.success("Delay atualizado");
      fetchAuctionsWithRobots();
    }
  };

  

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <AdminSubNavbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter">Gestão de <span className="text-primary">Robôs</span></h1>
            </div>
            <p className="text-white/40">Controle a inteligência artificial dos seus leilões em tempo real.</p>
          </div>
          
          <div className="flex gap-4">
            <Button 
              onClick={() => setAutomationActive(!automationActive)}
              variant={automationActive ? "destructive" : "default"}
              className={`font-bold ${!automationActive ? 'bg-green-600 hover:bg-green-500 shadow-[0_0_20px_rgba(22,163,74,0.4)]' : ''}`}
            >
              {automationActive ? <><StopCircle className="w-4 h-4 mr-2" /> PARAR AUTOMAÇÃO</> : <><PlayCircle className="w-4 h-4 mr-2" /> INICIAR AUTOMAÇÃO</>}
            </Button>
            <Button variant="outline" className="border-white/10 hover:bg-white/5" asChild>
              <Link to="/"><LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard icon={<Gavel className="w-5 h-5" />} label="Leilões Ativos" value={auctions.length.toString()} />
          <StatCard icon={<Bot className="w-5 h-5" />} label="Robôs Rodando" value={auctions.filter(a => a.robot_settings?.[0]?.active).length.toString()} />
          <StatCard icon={<Users className="w-5 h-5" />} label="Robôs Prontos" value={robots.length.toString()} />
          <StatCard icon={<AlertCircle className="w-5 h-5" />} label="Automação" value={automationActive ? "LIGADA" : "DESLIGADA"} />
        </div>

        <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <CardTitle>Configurações de Robô por Leilão</CardTitle>
            <CardDescription>Ajuste os parâmetros de comportamento dos robôs fictícios para cada disputa ativa.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60 font-bold">Produto</TableHead>
                  <TableHead className="text-white/60 font-bold">Status Robô</TableHead>
                  <TableHead className="text-white/60 font-bold">Delays (Min/Max)</TableHead>
                  <TableHead className="text-white/60 font-bold">Disputa Interna</TableHead>
                  <TableHead className="text-white/60 font-bold">Lances Atuais</TableHead>
                  <TableHead className="text-white/60 font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 animate-pulse">Carregando dados...</TableCell></TableRow>
                ) : auctions.map((auction) => {
                  const settings = auction.robot_settings?.[0] || {};
                  return (
                    <TableRow key={auction.id} className="border-white/10 hover:bg-white/5 transition-colors">
                      <TableCell className="font-bold py-6">
                        <div className="flex flex-col">
                          <span>{auction.product?.name}</span>
                          <span className="text-[10px] text-white/40 font-mono italic">Preço: R$ {auction.current_price?.toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch 
                            checked={settings.active} 
                            onCheckedChange={() => toggleRobot(auction.id, settings.active, settings.id)}
                            className="data-[state=checked]:bg-primary"
                          />
                          <Badge variant="outline" className={settings.active ? "border-primary text-primary bg-primary/10" : "border-white/10 text-white/40"}>
                            {settings.active ? "ATIVO" : "OFF"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <Switch 
                              checked={settings.inner_dispute_enabled} 
                              onCheckedChange={() => toggleInnerDispute(settings.id, settings.inner_dispute_enabled)}
                              className="data-[state=checked]:bg-amber-500"
                              disabled={!settings.active}
                            />
                            <Badge variant="outline" className={settings.inner_dispute_enabled ? "border-amber-500 text-amber-500 bg-amber-500/10" : "border-white/10 text-white/40"}>
                              {settings.inner_dispute_enabled ? "ROBÔ vs ROBÔ" : "OFF"}
                            </Badge>
                          </div>
                          {settings.inner_dispute_enabled && settings.inner_dispute_end_at && (
                            <span className="text-[9px] text-amber-500/60 font-bold uppercase">
                              Expira em: {new Date(settings.inner_dispute_end_at).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            className="w-16 bg-black/40 border-white/10 h-8 text-xs text-center" 
                            defaultValue={settings.min_delay} 
                            onBlur={(e) => updateDelay(settings.id, parseInt(e.target.value), settings.max_delay)}
                          />
                          <span className="text-white/20">/</span>
                          <Input 
                            type="number" 
                            className="w-16 bg-black/40 border-white/10 h-8 text-xs text-center" 
                            defaultValue={settings.max_delay} 
                            onBlur={(e) => updateDelay(settings.id, settings.min_delay, parseInt(e.target.value))}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Gavel className="w-3 h-3 text-white/20" />
                          <span className="font-mono text-sm">{auction.bid_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="text-white/40 hover:text-primary hover:bg-primary/10">
                          <Settings2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <Card className="bg-white/5 border-white/10 p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
        <Badge variant="outline" className="border-white/10 text-[10px] uppercase">Real-time</Badge>
      </div>
      <div className="text-2xl font-black text-white mb-1">{value}</div>
      <div className="text-xs text-white/40 uppercase tracking-widest font-bold">{label}</div>
    </Card>
  );
}
