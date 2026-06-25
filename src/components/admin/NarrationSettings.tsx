import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, Megaphone, Sparkles, MessageSquare, Zap, LayoutTemplate } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

export function NarrationSettings() {
  const [phrases, setPhrases] = useState<any[]>([]);
  const [appPhrases, setAppPhrases] = useState<any[]>([]);
  const [futureTemplates, setFutureTemplates] = useState<any[]>([]);
  const [newPhrase, setNewPhrase] = useState("");
  const [newAppPhrase, setNewAppPhrase] = useState("");
  const [newTemplate, setNewTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const { marquee_text, marquee_enabled, updateSettings } = useSettings();

  const [localMarqueeText, setLocalMarqueeText] = useState(marquee_text || "");
  const [localMarqueeEnabled, setLocalMarqueeEnabled] = useState(marquee_enabled || false);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    const [narrationRes, appPhrasesRes, futureRes] = await Promise.all([
      supabase.from("narration_phrases").select("*").order("created_at", { ascending: false }),
      supabase.from("app_phrases").select("*").eq("type", "incentive").order("created_at", { ascending: false }),
      supabase.from("future_auction_templates").select("*").order("created_at", { ascending: false })
    ]);
    
    if (narrationRes.data) setPhrases(narrationRes.data);
    if (appPhrasesRes.data) setAppPhrases(appPhrasesRes.data);
    if (futureRes.data) setFutureTemplates(futureRes.data);
    setLoading(false);
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
      fetchAllData();
    }
    setLoading(false);
  }

  async function handleAddAppPhrase() {
    if (!newAppPhrase.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("app_phrases")
      .insert({ text: newAppPhrase.trim(), type: 'incentive', active: true });
    
    if (error) {
      toast.error("Erro ao adicionar frase");
    } else {
      toast.success("Frase adicionada!");
      setNewAppPhrase("");
      fetchAllData();
    }
    setLoading(false);
  }

  async function handleAddTemplate() {
    if (!newTemplate.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("future_auction_templates")
      .insert({ template_text: newTemplate.trim(), is_active: true });
    
    if (error) {
      toast.error("Erro ao adicionar template");
    } else {
      toast.success("Template adicionado!");
      setNewTemplate("");
      fetchAllData();
    }
    setLoading(false);
  }

  async function togglePhrase(id: string, active: boolean) {
    const { error } = await supabase
      .from("narration_phrases")
      .update({ is_active: active })
      .eq("id", id);
    
    if (error) toast.error("Erro ao atualizar frase");
    else fetchAllData();
  }

  async function deletePhrase(id: string) {
    const { error } = await supabase
      .from("narration_phrases")
      .delete()
      .eq("id", id);
    
    if (error) toast.error("Erro ao excluir frase");
    else {
      toast.success("Frase removida");
      fetchAllData();
    }
  }

  async function toggleAppPhrase(id: string, active: boolean) {
    const { error } = await supabase
      .from("app_phrases")
      .update({ active })
      .eq("id", id);
    
    if (error) toast.error("Erro ao atualizar frase");
    else fetchAllData();
  }

  async function deleteAppPhrase(id: string) {
    const { error } = await supabase
      .from("app_phrases")
      .delete()
      .eq("id", id);
    
    if (error) toast.error("Erro ao excluir frase");
    else {
      toast.success("Frase removida");
      fetchAllData();
    }
  }

  async function toggleTemplate(id: string, active: boolean) {
    const { error } = await supabase
      .from("future_auction_templates")
      .update({ is_active: active })
      .eq("id", id);
    
    if (error) toast.error("Erro ao atualizar template");
    else fetchAllData();
  }

  async function deleteTemplate(id: string) {
    const { error } = await supabase
      .from("future_auction_templates")
      .delete()
      .eq("id", id);
    
    if (error) toast.error("Erro ao excluir template");
    else {
      toast.success("Template removido");
      fetchAllData();
    }
  }


  async function handleUpdateMarquee() {
    setLoading(true);
    try {
      await updateSettings?.({
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

      <Card className="bg-white/5 border-white/10 rounded-[32px]">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-xl font-black uppercase italic">Frases dos <span className="text-primary">Cards de Leilão</span></CardTitle>
          </div>
          <CardDescription>Gerencie as frases curtas de incentivo que aparecem dentro dos cards dos leilões.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Input 
              value={newAppPhrase}
              onChange={(e) => setNewAppPhrase(e.target.value)}
              placeholder="Nova frase curta (ex: Super Oferta!)..."
              className="bg-white/5 border-white/10"
              maxLength={25}
            />
            <Button onClick={handleAddAppPhrase} disabled={loading} className="bg-primary text-black">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {appPhrases.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Sparkles className="w-4 h-4 text-primary/40 flex-shrink-0" />
                  <span className="text-sm truncate">{p.text}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Switch 
                    checked={p.active} 
                    onCheckedChange={(val) => toggleAppPhrase(p.id, val)} 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white/20 hover:text-red-500 transition-colors"
                    onClick={() => deleteAppPhrase(p.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10 rounded-[32px]">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 rounded-xl">
              <LayoutTemplate className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-xl font-black uppercase italic">Templates de <span className="text-primary">Leilões Futuros</span></CardTitle>
          </div>
          <CardDescription>Configure como o sistema anuncia leilões agendados. Use {'{product}'}, {'{date}'} e {'{time}'} como variáveis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Input 
              value={newTemplate}
              onChange={(e) => setNewTemplate(e.target.value)}
              placeholder="Template (ex: O leilão do {product} será {date})..."
              className="bg-white/5 border-white/10"
            />
            <Button onClick={handleAddTemplate} disabled={loading} className="bg-primary text-black">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {futureTemplates.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <LayoutTemplate className="w-4 h-4 text-primary/40 flex-shrink-0" />
                  <span className="text-sm truncate">{p.template_text}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Switch 
                    checked={p.is_active} 
                    onCheckedChange={(val) => toggleTemplate(p.id, val)} 
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white/20 hover:text-red-500 transition-colors"
                    onClick={() => deleteTemplate(p.id)}
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
