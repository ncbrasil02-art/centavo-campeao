import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, Megaphone, Sparkles, MessageSquare } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

export function NarrationSettings() {
  const [phrases, setPhrases] = useState<any[]>([]);
  const [newPhrase, setNewPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const { marquee_text, marquee_enabled, updateSettings } = useSettings();
  const [localMarqueeText, setLocalMarqueeText] = useState(marquee_text || "");
  const [localMarqueeEnabled, setLocalMarqueeEnabled] = useState(marquee_enabled || false);

  useEffect(() => {
    fetchPhrases();
  }, []);

  useEffect(() => {
    setLocalMarqueeText(marquee_text || "");
    setLocalMarqueeEnabled(marquee_enabled || false);
  }, [marquee_text, marquee_enabled]);

  async function fetchPhrases() {
    const { data } = await supabase
      .from("narration_phrases")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPhrases(data);
  }

  async function handleAddPhrase() {
    if (!newPhrase.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("narration_phrases")
      .insert({ phrase: newPhrase.trim(), category: 'encouragement' });
    
    if (error) {
      toast.error("Erro ao adicionar frase");
    } else {
      toast.success("Frase adicionada!");
      setNewPhrase("");
      fetchPhrases();
    }
    setLoading(false);
  }

  async function togglePhrase(id: string, active: boolean) {
    const { error } = await supabase
      .from("narration_phrases")
      .update({ is_active: active })
      .eq("id", id);
    
    if (error) toast.error("Erro ao atualizar frase");
    else fetchPhrases();
  }

  async function deletePhrase(id: string) {
    const { error } = await supabase
      .from("narration_phrases")
      .delete()
      .eq("id", id);
    
    if (error) toast.error("Erro ao excluir frase");
    else {
      toast.success("Frase removida");
      fetchPhrases();
    }
  }

  async function handleUpdateMarquee() {
    setLoading(true);
    try {
      await updateSettings({
        marquee_text: localMarqueeText,
        marquee_enabled: localMarqueeEnabled
      });
      toast.success("Configurações do letreiro atualizadas!");
    } catch (error) {
      toast.error("Erro ao atualizar letreiro");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <Card className="bg-white/5 border-white/10 rounded-[32px]">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-xl font-black uppercase italic">Letreiro de <span className="text-primary">Destaque (Marquee)</span></CardTitle>
          </div>
          <CardDescription>Configure a faixa que aparece no topo do site com avisos importantes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="space-y-1">
              <Label className="text-sm font-bold uppercase italic">Ativar Letreiro</Label>
              <p className="text-xs text-white/40">Exibe a faixa no topo de todas as páginas.</p>
            </div>
            <Switch 
              checked={localMarqueeEnabled} 
              onCheckedChange={setLocalMarqueeEnabled} 
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold uppercase italic">Texto do Letreiro</Label>
            <Input 
              value={localMarqueeText}
              onChange={(e) => setLocalMarqueeText(e.target.value)}
              placeholder="Digite a frase de impacto..."
              className="bg-white/5 border-white/10"
            />
          </div>

          <Button 
            className="w-full bg-primary text-black font-black uppercase italic"
            onClick={handleUpdateMarquee}
            disabled={loading}
          >
            Salvar Configurações do Letreiro
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10 rounded-[32px]">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-xl font-black uppercase italic">Controle de <span className="text-primary">Narração</span></CardTitle>
          </div>
          <CardDescription>Gerencie as frases que o sistema fala durante os leilões para incentivar lances.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Input 
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              placeholder="Nova frase de incentivo..."
              className="bg-white/5 border-white/10"
            />
            <Button onClick={handleAddPhrase} disabled={loading} className="bg-primary text-black">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {phrases.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className="w-4 h-4 text-primary/40 flex-shrink-0" />
                  <span className="text-sm truncate">{p.phrase}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Switch 
                    checked={p.is_active} 
                    onCheckedChange={(val) => togglePhrase(p.id, val)} 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white/20 hover:text-red-500 transition-colors"
                    onClick={() => deletePhrase(p.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}