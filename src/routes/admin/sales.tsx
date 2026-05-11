import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { AdminSubNavbar } from "@/components/AdminSubNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Wallet, Search, Filter, Download, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/sales")({
  component: AdminSales,
});

function AdminSales() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, profile:profiles(full_name, username), package:bid_packages(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Erro ao carregar vendas");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      if (status === "completed") {
        const { error } = await supabase.rpc("complete_payment", {
          p_transaction_id: id,
          p_external_id: "Manual Admin"
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("transactions")
          .update({ status })
          .eq("id", id);
        if (error) throw error;
      }
      
      toast.success("Status atualizado");
      fetchSales();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    }
  }

  const filteredSales = sales.filter(sale => 
    sale.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.id.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <AdminSubNavbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Gerenciamento de <span className="text-primary">Vendas</span>
            </h1>
            <p className="text-white/40">Monitore todos os pagamentos e recargas de lances</p>
          </div>
          
          <div className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input 
                placeholder="Buscar por cliente ou ID..." 
                className="bg-white/5 border-white/10 pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="border-white/10 hover:bg-white/5">
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
          </div>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5">
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Cliente</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Pacote / Descrição</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Valor</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Data</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px]">Status</TableHead>
                <TableHead className="text-white/40 font-bold uppercase text-[10px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-white/40">Carregando...</TableCell></TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-white/40">Nenhuma venda encontrada</TableCell></TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{sale.profile?.full_name || "Usuário"}</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">{sale.profile?.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{sale.package?.name || sale.description}</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest">{sale.payment_method}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-green-500">
                      R$ {Number(sale.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sale.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {sale.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 hover:bg-green-500/20 text-green-500"
                            onClick={() => updateStatus(sale.id, "completed")}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 hover:bg-red-500/20 text-red-500"
                            onClick={() => updateStatus(sale.id, "cancelled")}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Recusar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    completed: "bg-green-500/10 text-green-500 border-green-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20"
  };
  
  const labels = {
    pending: "Pendente",
    completed: "Concluído",
    cancelled: "Cancelado",
    failed: "Falhou"
  };

  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status as keyof typeof styles] || "bg-white/10 text-white/40 border-white/10"}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}