import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TENANT_ID } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trophy, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/unique-bids")({
  component: AdminUniqueBids,
});

const sb = supabase as any;

type Campaign = {
  id: string;
  product_id: string | null;
  title: string;
  description: string | null;
  min_bid_value: number;
  max_bid_value: number;
  bid_step: number;
  status: "draft" | "live" | "closed" | "finished";
  winner_user_id: string | null;
  winner_value: number | null;
  closed_at: string | null;
};

function AdminUniqueBids() {
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState({
    product_id: "",
    title: "",
    description: "",
    min_bid_value: 0.01,
    max_bid_value: 100,
    bid_step: 0.01,
    status: "draft" as Campaign["status"],
    ends_at: "",
  });
  const [bidsCampaign, setBidsCampaign] = useState<any | null>(null);
  const [bids, setBids] = useState<any[]>([]);

  useEffect(() => {
    load();
    sb.from("products").select("id,name,images").order("name").then((r: any) => setProducts(r.data || []));
  }, []);

  const selectedProduct = products.find((p) => p.id === form.product_id);

  async function load() {
    setLoading(true);
    const { data, error } = await sb.rpc("admin_list_unique_campaigns");
    if (error) toast.error(error.message);
    setRows(data || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({
      product_id: "",
      title: "",
      description: "",
      min_bid_value: 0.01,
      max_bid_value: 100,
      bid_step: 0.01,
      status: "draft",
      ends_at: "",
    });
    setOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditing(c);
    setForm({
      product_id: c.product_id ?? "",
      title: c.title,
      description: c.description ?? "",
      min_bid_value: Number(c.min_bid_value),
      max_bid_value: Number(c.max_bid_value),
      bid_step: Number(c.bid_step),
      status: c.status,
      ends_at: (c as any).ends_at ? new Date((c as any).ends_at).toISOString().slice(0, 16) : "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) return toast.error("Informe o título.");
    if (form.min_bid_value >= form.max_bid_value) return toast.error("Mín. deve ser menor que máx.");
    if (form.bid_step <= 0) return toast.error("Incremento inválido.");

    const payload: any = {
      ...form,
      product_id: form.product_id || null,
      tenant_id: TENANT_ID,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };

    const { error } = editing
      ? await sb.from("unique_bid_campaigns").update(payload).eq("id", editing.id)
      : await sb.from("unique_bid_campaigns").insert(payload);

    if (error) return toast.error(error.message);
    toast.success(editing ? "Campanha atualizada." : "Campanha criada.");
    setOpen(false);
    load();
  }

  async function setStatus(id: string, status: Campaign["status"]) {
    const { error } = await sb.from("unique_bid_campaigns").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado.");
    load();
  }

  async function close(id: string) {
    if (!confirm("Encerrar a campanha e apurar o ganhador?")) return;
    const { data, error } = await sb.rpc("admin_close_unique_campaign", { p_campaign_id: id });
    if (error) return toast.error(error.message);
    if (data?.winner_value == null) toast.info("Encerrada. Não havia lance único — sem vencedor.");
    else toast.success(`Vencedor apurado: R$ ${Number(data.winner_value).toFixed(2)}`);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta campanha e todos os palpites?")) return;
    const { error } = await sb.from("unique_bid_campaigns").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function showBids(c: any) {
    setBidsCampaign(c);
    const { data, error } = await sb.rpc("admin_get_unique_campaign_bids", { p_campaign_id: c.id });
    if (error) return toast.error(error.message);
    setBids(data || []);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase tracking-tight">Menor Lance Único</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Nova campanha</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar campanha" : "Nova campanha"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Produto</Label>
                <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar produto" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          {p.images?.[0] && (
                            <img src={p.images[0]} alt="" className="w-6 h-6 rounded object-cover" />
                          )}
                          <span>{p.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct?.images?.[0] && (
                  <div className="mt-2 flex items-center gap-3 rounded-md border p-2">
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div className="text-sm">
                      <p className="font-semibold">{selectedProduct.name}</p>
                      <p className="text-xs text-muted-foreground">Imagem que aparecerá no site</p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label>Título</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Mínimo (R$)</Label>
                  <Input type="number" step="0.01" value={form.min_bid_value}
                    onChange={(e) => setForm({ ...form, min_bid_value: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Máximo (R$)</Label>
                  <Input type="number" step="0.01" value={form.max_bid_value}
                    onChange={(e) => setForm({ ...form, max_bid_value: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Incremento</Label>
                  <Input type="number" step="0.01" value={form.bid_step}
                    onChange={(e) => setForm({ ...form, bid_step: parseFloat(e.target.value) || 0.01 })} />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="live">Aberta</SelectItem>
                    <SelectItem value="closed">Fechada (sem apurar)</SelectItem>
                    <SelectItem value="finished">Finalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Encerramento (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Se vazio, encerra apenas manualmente.</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={save}>{editing ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Campanhas</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Faixa</TableHead>
                  <TableHead>Palpites</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vencedor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const c = row.campaign as Campaign;
                  const p = row.product;
                  const w = row.winner_profile;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold">{c.title}</TableCell>
                      <TableCell>{p?.name ?? "—"}</TableCell>
                      <TableCell>R$ {Number(c.min_bid_value).toFixed(2)} – R$ {Number(c.max_bid_value).toFixed(2)}</TableCell>
                      <TableCell>{row.bid_count}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "live" ? "default" : "secondary"}>{c.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {c.winner_value != null
                          ? <span className="text-primary font-semibold">R$ {Number(c.winner_value).toFixed(2)} ({w?.username ?? "?"})</span>
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => showBids({ id: c.id, title: c.title })}>Palpites</Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Editar</Button>
                        {c.status === "draft" && (
                          <Button size="sm" variant="secondary" onClick={() => setStatus(c.id, "live")}>Abrir</Button>
                        )}
                        {(c.status === "live" || c.status === "closed") && (
                          <Button size="sm" onClick={() => close(c.id)}>
                            <Trophy className="w-4 h-4 mr-1" /> Apurar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!bidsCampaign} onOpenChange={(v) => !v && setBidsCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Palpites — {bidsCampaign?.title}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Valor</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Repetições</TableHead>
                <TableHead>Quando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bids.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono">R$ {Number(b.value).toFixed(2)}</TableCell>
                  <TableCell>{b.username ?? b.full_name ?? "—"}</TableCell>
                  <TableCell>
                    {b.count_at_value === 1
                      ? <Badge className="bg-emerald-500/20 text-emerald-400"><CheckCircle2 className="w-3 h-3 mr-1" />Único</Badge>
                      : <Badge variant="secondary">{b.count_at_value}×</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(b.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
