import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, RefreshCw, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/support-faqs")({
  component: SupportFaqsAdmin,
});

type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  active: boolean;
};

function emptyFaq(): Partial<Faq> {
  return { question: "", answer: "", category: "", sort_order: 0, active: true };
}

function SupportFaqsAdmin() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Partial<Faq>>(emptyFaq());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_faqs")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setFaqs((data || []) as Faq[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!draft.question?.trim() || !draft.answer?.trim()) {
      toast.error("Pergunta e resposta são obrigatórias");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("support_faqs").insert({
      question: draft.question!.trim(),
      answer: draft.answer!.trim(),
      category: draft.category?.trim() || null,
      sort_order: Number(draft.sort_order) || 0,
      active: draft.active ?? true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("FAQ adicionada");
    setDraft(emptyFaq());
    load();
  };

  const update = async (id: string, patch: Partial<Faq>) => {
    const { error } = await supabase.from("support_faqs").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta FAQ?")) return;
    const { error } = await supabase.from("support_faqs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removida");
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="min-h-screen bg-background text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
              <BookOpen className="text-primary" /> FAQ da <span className="text-primary">Fernanda</span>
            </h1>
            <p className="text-white/40 text-sm">
              Perguntas e respostas oficiais. A Fernanda usa esta base como fonte prioritária nas respostas.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Atualizar
          </Button>
        </div>

        {/* Form nova FAQ */}
        <div className="border border-white/10 rounded-xl p-5 mb-8 bg-zinc-950/40 space-y-4">
          <h2 className="font-bold uppercase text-sm tracking-widest text-primary">Nova pergunta</h2>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_120px] gap-3">
            <div>
              <Label>Pergunta</Label>
              <Input
                value={draft.question || ""}
                onChange={(e) => setDraft({ ...draft, question: e.target.value })}
                placeholder="Ex: Como funciona o leilão de centavos?"
              />
            </div>
            <div>
              <Label>Categoria (opcional)</Label>
              <Input
                value={draft.category || ""}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="Pagamento, Regras..."
              />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={draft.sort_order ?? 0}
                onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label>Resposta</Label>
            <Textarea
              rows={4}
              value={draft.answer || ""}
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
              placeholder="Resposta clara e direta que a Fernanda vai usar."
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={draft.active ?? true}
                onCheckedChange={(v) => setDraft({ ...draft, active: v })}
              />
              Ativa
            </label>
            <Button onClick={create} disabled={saving}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Button>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {faqs.length === 0 && (
            <div className="text-white/40 text-sm text-center py-10">Nenhuma FAQ cadastrada ainda.</div>
          )}
          {faqs.map((f) => (
            <div key={f.id} className="border border-white/10 rounded-xl p-4 bg-zinc-950/40 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_100px_auto] gap-3 items-start">
                <Input
                  value={f.question}
                  onChange={(e) => setFaqs((p) => p.map((x) => (x.id === f.id ? { ...x, question: e.target.value } : x)))}
                  onBlur={(e) => update(f.id, { question: e.target.value })}
                />
                <Input
                  value={f.category || ""}
                  placeholder="Categoria"
                  onChange={(e) => setFaqs((p) => p.map((x) => (x.id === f.id ? { ...x, category: e.target.value } : x)))}
                  onBlur={(e) => update(f.id, { category: e.target.value || null })}
                />
                <Input
                  type="number"
                  value={f.sort_order}
                  onChange={(e) => setFaqs((p) => p.map((x) => (x.id === f.id ? { ...x, sort_order: Number(e.target.value) } : x)))}
                  onBlur={(e) => update(f.id, { sort_order: Number(e.target.value) })}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={f.active}
                    onCheckedChange={(v) => update(f.id, { active: v })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => remove(f.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Textarea
                rows={3}
                value={f.answer}
                onChange={(e) => setFaqs((p) => p.map((x) => (x.id === f.id ? { ...x, answer: e.target.value } : x)))}
                onBlur={(e) => update(f.id, { answer: e.target.value })}
              />
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => update(f.id, { question: f.question, answer: f.answer, category: f.category, sort_order: f.sort_order, active: f.active })}>
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
