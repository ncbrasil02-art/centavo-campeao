import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Settings, 
  Save, 
  Palette, 
  CreditCard, 
  Layout, 
  Upload, 
  Loader2, 
  Image as ImageIcon, 
  Type, 
  Monitor, 
  Search, 
  Globe, 
  BarChart,
  Sun,
  Moon
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { DARK_PALETTES, LIGHT_PALETTES, ColorPalette } from "@/constants/palettes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [settings, setSettings] = useState({
    id: "",
    site_name: "",
    logo_url: "",
    favicon_url: "",
    primary_color: "",
    secondary_color: "",
    mercado_pago_public_key: "",
    mercado_pago_access_token: "",
    pix_key: "",
    pix_name: "",
    hero_display_mode: "phrases",
    theme_mode: "dark",
    ga_id: "",
    fb_pixel_id: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    google_site_verification: "",
    font_color_primary: "",
    font_color_secondary: "",
    card_background_color: "",
    block_background_color: "",
    page_background_color: "",
    border_color: "",
    logo_height: 40,
    google_reviews_widget: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .single();

      if (error) throw error;
      if (data) {
        setSettings({
          id: data.id,
          site_name: data.site_name || "",
          logo_url: data.logo_url || "",
          favicon_url: data.favicon_url || "",
          primary_color: data.primary_color || "#8B5CF6",
          secondary_color: data.secondary_color || "#7C3AED",
          mercado_pago_public_key: data.mercado_pago_public_key || "",
          mercado_pago_access_token: data.mercado_pago_access_token || "",
          pix_key: data.pix_key || "",
          pix_name: data.pix_name || "",
          hero_display_mode: data.hero_display_mode || "phrases",
          theme_mode: data.theme_mode || "dark",
          ga_id: data.ga_id || "",
          fb_pixel_id: data.fb_pixel_id || "",
          meta_title: data.meta_title || "",
          meta_description: data.meta_description || "",
          meta_keywords: data.meta_keywords || "",
          google_site_verification: data.google_site_verification || "",
          font_color_primary: data.font_color_primary || "",
          font_color_secondary: data.font_color_secondary || "",
          card_background_color: data.card_background_color || "",
          block_background_color: data.block_background_color || "",
          page_background_color: data.page_background_color || "",
          border_color: data.border_color || "",
          logo_height: data.logo_height || 40,
          google_reviews_widget: data.google_reviews_widget || "",
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'logo') setUploadingLogo(true);
    else setUploadingFavicon(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("site-assets")
        .getPublicUrl(filePath);

      setSettings({ ...settings, [type === 'logo' ? 'logo_url' : 'favicon_url']: publicUrl });
      toast.success(`${type === 'logo' ? 'Logotipo' : 'Favicon'} carregado com sucesso!`);
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Erro ao carregar ${type}`);
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  };

  const applyPalette = (palette: ColorPalette) => {
    setSettings({
      ...settings,
      theme_mode: palette.theme,
      primary_color: palette.primary,
      secondary_color: palette.secondary,
      font_color_primary: palette.foreground,
      font_color_secondary: palette.mutedForeground,
      card_background_color: palette.card,
      block_background_color: palette.block,
      page_background_color: palette.background,
      border_color: palette.border,
    });
    toast.success(`Paleta "${palette.name}" aplicada!`);
  };

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .update(settings)
        .eq("id", settings.id);

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-white">
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Configurações <span className="text-primary">Gerais</span>
            </h1>
            <p className="text-white/40">Personalize a aparência, SEO e integrações do seu site</p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Identity & Hero Section */}
          <div className="space-y-8">
            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Layout className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Identidade Visual</CardTitle>
                    <CardDescription className="text-white/40">Nome, logo e modo de exibição</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="site_name">Nome do Site</Label>
                  <Input 
                    id="site_name" 
                    value={settings.site_name || ""} 
                    onChange={(e) => setSettings({...settings, site_name: e.target.value})}
                    placeholder="Ex: Leilão Top"
                    className="bg-white/5 border-white/10 h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hero_mode">Modo de Exibição do Hero (Topo)</Label>
                  <Select 
                    value={settings.hero_display_mode} 
                    onValueChange={(value) => setSettings({...settings, hero_display_mode: value})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 h-12">
                      <SelectValue placeholder="Selecione o modo" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      <SelectItem value="phrases">
                        <div className="flex items-center gap-2">
                          <Type className="w-4 h-4" />
                          <span>Frases Rolantes (Mensagens)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="banners">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          <span>Banners Hero de Produtos</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-4">
                    <Label>Logotipo</Label>
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-full h-32 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        {settings.logo_url ? (
                          <img src={settings.logo_url} alt="Logo preview" className="max-w-full max-h-full object-contain p-2" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-white/20" />
                        )}
                      </div>
                      <div className="w-full">
                        <input
                          type="file"
                          id="logo-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'logo')}
                          disabled={uploadingLogo}
                        />
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="w-full border-white/10 hover:bg-white/5 text-white"
                          disabled={uploadingLogo}
                        >
                          <label htmlFor="logo-upload" className="cursor-pointer">
                            {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Alterar Logo
                          </label>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Favicon (Ícone)</Label>
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-full h-32 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                        {settings.favicon_url ? (
                          <img src={settings.favicon_url} alt="Favicon preview" className="w-12 h-12 object-contain" />
                        ) : (
                          <Globe className="w-8 h-8 text-white/20" />
                        )}
                      </div>
                      <div className="w-full">
                        <input
                          type="file"
                          id="favicon-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'favicon')}
                          disabled={uploadingFavicon}
                        />
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="w-full border-white/10 hover:bg-white/5 text-white"
                          disabled={uploadingFavicon}
                        >
                          <label htmlFor="favicon-upload" className="cursor-pointer">
                            {uploadingFavicon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Alterar Favicon
                          </label>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo_height">Altura do Logotipo (px)</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      id="logo_height" 
                      type="number"
                      value={settings.logo_height} 
                      onChange={(e) => setSettings({...settings, logo_height: parseInt(e.target.value)})}
                      className="bg-white/5 border-white/10 h-12 w-32"
                    />
                    <span className="text-sm text-white/40">Recomendado: 32px a 64px</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Paletas de Cores Prontas</CardTitle>
                    <CardDescription className="text-white/40">Escolha uma combinação profissional pré-definida</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Moon className="w-4 h-4 text-purple-400" /> Paletas Escuras (Modo Dark)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {DARK_PALETTES.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => applyPalette(p)}
                        className="group flex flex-col gap-2 p-2 rounded-xl border border-white/10 hover:border-primary/50 transition-all bg-black/20"
                      >
                        <div className="flex w-full h-8 rounded-md overflow-hidden border border-white/5">
                          <div className="w-1/2 h-full" style={{ backgroundColor: p.primary }} />
                          <div className="w-1/4 h-full" style={{ backgroundColor: p.background }} />
                          <div className="w-1/4 h-full" style={{ backgroundColor: p.card }} />
                        </div>
                        <span className="text-[10px] font-medium truncate w-full text-center">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-400" /> Paletas Claras (Modo Light)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {LIGHT_PALETTES.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => applyPalette(p)}
                        className="group flex flex-col gap-2 p-2 rounded-xl border border-white/10 hover:border-primary/50 transition-all bg-black/20"
                      >
                        <div className="flex w-full h-8 rounded-md overflow-hidden border border-white/5">
                          <div className="w-1/2 h-full" style={{ backgroundColor: p.primary }} />
                          <div className="w-1/4 h-full" style={{ backgroundColor: p.background }} />
                          <div className="w-1/4 h-full" style={{ backgroundColor: p.card }} />
                        </div>
                        <span className="text-[10px] font-medium truncate w-full text-center">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Cores do Sistema</CardTitle>
                    <CardDescription className="text-white/40">Identidade visual de cores</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="primary_color">Cor Primária</Label>
                    <div className="flex gap-2">
                      <div 
                        className="w-12 h-12 rounded-lg border border-white/10 overflow-hidden"
                        style={{ backgroundColor: settings.primary_color }}
                      >
                        <Input 
                          id="primary_color" 
                          type="color"
                          value={settings.primary_color || "#8B5CF6"} 
                          onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                          className="w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <Input 
                        value={settings.primary_color || ""} 
                        onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                        className="bg-white/5 border-white/10 h-12 font-mono"
                        placeholder="#HEX"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="secondary_color">Cor Secundária</Label>
                    <div className="flex gap-2">
                      <div 
                        className="w-12 h-12 rounded-lg border border-white/10 overflow-hidden"
                        style={{ backgroundColor: settings.secondary_color }}
                      >
                        <Input 
                          id="secondary_color" 
                          type="color"
                          value={settings.secondary_color || "#7C3AED"} 
                          onChange={(e) => setSettings({...settings, secondary_color: e.target.value})}
                          className="w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <Input 
                        value={settings.secondary_color || ""} 
                        onChange={(e) => setSettings({...settings, secondary_color: e.target.value})}
                        className="bg-white/5 border-white/10 h-12 font-mono"
                        placeholder="#HEX"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="theme_mode">Modo de Fundo (Tema)</Label>
                  <Select 
                    value={settings.theme_mode} 
                    onValueChange={(value: any) => setSettings({...settings, theme_mode: value})}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 h-12">
                      <SelectValue placeholder="Selecione o tema" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4" />
                          <span>Fundo Claro (Automático)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4" />
                          <span>Fundo Escuro</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-white/40">O tema claro ajusta automaticamente as cores das fontes para garantir visibilidade total.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-yellow-500" />
                  <div>
                    <CardTitle className="text-lg">Cores Avançadas (Detalhadas)</CardTitle>
                    <CardDescription className="text-white/40">Controle total sobre cada elemento do site</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>Cor da Fonte Principal</Label>
                    <div className="flex gap-2">
                      <div className="w-10 h-10 rounded border border-white/10 overflow-hidden" style={{ backgroundColor: settings.font_color_primary }}>
                        <Input type="color" value={settings.font_color_primary || "#000000"} onChange={(e) => setSettings({...settings, font_color_primary: e.target.value})} className="w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      <Input value={settings.font_color_primary || ""} onChange={(e) => setSettings({...settings, font_color_primary: e.target.value})} className="bg-white/5 border-white/10 flex-1 font-mono" placeholder="#HEX" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Cor da Fonte Secundária</Label>
                    <div className="flex gap-2">
                      <div className="w-10 h-10 rounded border border-white/10 overflow-hidden" style={{ backgroundColor: settings.font_color_secondary }}>
                        <Input type="color" value={settings.font_color_secondary || "#666666"} onChange={(e) => setSettings({...settings, font_color_secondary: e.target.value})} className="w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      <Input value={settings.font_color_secondary || ""} onChange={(e) => setSettings({...settings, font_color_secondary: e.target.value})} className="bg-white/5 border-white/10 flex-1 font-mono" placeholder="#HEX" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>Fundo dos Cards</Label>
                    <div className="flex gap-2">
                      <div className="w-10 h-10 rounded border border-white/10 overflow-hidden" style={{ backgroundColor: settings.card_background_color }}>
                        <Input type="color" value={settings.card_background_color || "#ffffff"} onChange={(e) => setSettings({...settings, card_background_color: e.target.value})} className="w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      <Input value={settings.card_background_color || ""} onChange={(e) => setSettings({...settings, card_background_color: e.target.value})} className="bg-white/5 border-white/10 flex-1 font-mono" placeholder="#HEX" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Fundo dos Blocos/Seções</Label>
                    <div className="flex gap-2">
                      <div className="w-10 h-10 rounded border border-white/10 overflow-hidden" style={{ backgroundColor: settings.block_background_color }}>
                        <Input type="color" value={settings.block_background_color || "#f3f4f6"} onChange={(e) => setSettings({...settings, block_background_color: e.target.value})} className="w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      <Input value={settings.block_background_color || ""} onChange={(e) => setSettings({...settings, block_background_color: e.target.value})} className="bg-white/5 border-white/10 flex-1 font-mono" placeholder="#HEX" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>Fundo da Página (Body)</Label>
                    <div className="flex gap-2">
                      <div className="w-10 h-10 rounded border border-white/10 overflow-hidden" style={{ backgroundColor: settings.page_background_color }}>
                        <Input type="color" value={settings.page_background_color || "#ffffff"} onChange={(e) => setSettings({...settings, page_background_color: e.target.value})} className="w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      <Input value={settings.page_background_color || ""} onChange={(e) => setSettings({...settings, page_background_color: e.target.value})} className="bg-white/5 border-white/10 flex-1 font-mono" placeholder="#HEX" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Cor das Bordas</Label>
                    <div className="flex gap-2">
                      <div className="w-10 h-10 rounded border border-white/10 overflow-hidden" style={{ backgroundColor: settings.border_color }}>
                        <Input type="color" value={settings.border_color || "#e5e7eb"} onChange={(e) => setSettings({...settings, border_color: e.target.value})} className="w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      <Input value={settings.border_color || ""} onChange={(e) => setSettings({...settings, border_color: e.target.value})} className="bg-white/5 border-white/10 flex-1 font-mono" placeholder="#HEX" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SEO & Integrations */}
          <div className="space-y-8">
            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-green-500" />
                  <div>
                    <CardTitle className="text-lg">SEO & Indexação Google</CardTitle>
                    <CardDescription className="text-white/40">Meta tags e otimização para buscas</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="meta_title">Título SEO (Meta Title)</Label>
                  <Input 
                    id="meta_title" 
                    value={settings.meta_title || ""} 
                    onChange={(e) => setSettings({...settings, meta_title: e.target.value})}
                    placeholder="Título otimizado para o Google"
                    className="bg-white/5 border-white/10 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta_description">Descrição SEO (Meta Description)</Label>
                  <Textarea 
                    id="meta_description" 
                    value={settings.meta_description || ""} 
                    onChange={(e) => setSettings({...settings, meta_description: e.target.value})}
                    placeholder="Descrição que aparece nos resultados de busca"
                    className="bg-white/5 border-white/10 min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta_keywords">Palavras-chave (Separadas por vírgula)</Label>
                  <Input 
                    id="meta_keywords" 
                    value={settings.meta_keywords || ""} 
                    onChange={(e) => setSettings({...settings, meta_keywords: e.target.value})}
                    placeholder="leilão, centavos, arremate, iphone"
                    className="bg-white/5 border-white/10 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_verify">Google Site Verification Code</Label>
                  <Input 
                    id="google_verify" 
                    value={settings.google_site_verification || ""} 
                    onChange={(e) => setSettings({...settings, google_site_verification: e.target.value})}
                    placeholder="Código de verificação do Google Search Console"
                    className="bg-white/5 border-white/10 h-12"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <div>
                    <CardTitle className="text-lg">Rastreamento & Analytics</CardTitle>
                    <CardDescription className="text-white/40">Google Analytics e Pixel do Facebook</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="ga_id" className="flex items-center gap-2">
                    <BarChart className="w-4 h-4 text-orange-500" /> ID Google Analytics (G-XXXXX)
                  </Label>
                  <Input 
                    id="ga_id" 
                    value={settings.ga_id || ""} 
                    onChange={(e) => setSettings({...settings, ga_id: e.target.value})}
                    placeholder="G-XXXXXXXXXX"
                    className="bg-white/5 border-white/10 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fb_pixel_id" className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" /> ID Facebook Pixel
                  </Label>
                  <Input 
                    id="fb_pixel_id" 
                    value={settings.fb_pixel_id || ""} 
                    onChange={(e) => setSettings({...settings, fb_pixel_id: e.target.value})}
                    placeholder="123456789012345"
                    className="bg-white/5 border-white/10 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_reviews">Widget de Depoimentos do Google (Script/HTML)</Label>
                  <Textarea 
                    id="google_reviews" 
                    value={settings.google_reviews_widget || ""} 
                    onChange={(e) => setSettings({...settings, google_reviews_widget: e.target.value})}
                    placeholder="Cole aqui o script ou HTML do widget de depoimentos (ex: Elfsight, SociableKit, etc.)"
                    className="bg-white/5 border-white/10 min-h-[120px] font-mono text-xs"
                  />
                  <p className="text-[10px] text-white/40">Este código será renderizado na seção de depoimentos da página inicial.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Pagamentos Mercado Pago</CardTitle>
                    <CardDescription className="text-white/40">Chaves de API para checkout</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mp_public">Public Key</Label>
                  <Input 
                    id="mp_public" 
                    value={settings.mercado_pago_public_key || ""} 
                    onChange={(e) => setSettings({...settings, mercado_pago_public_key: e.target.value})}
                    placeholder="APP_USR-..."
                    className="bg-white/5 border-white/10 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mp_token">Access Token</Label>
                  <Input 
                    id="mp_token" 
                    type="password"
                    value={settings.mercado_pago_access_token || ""} 
                    onChange={(e) => setSettings({...settings, mercado_pago_access_token: e.target.value})}
                    placeholder="APP_USR-..."
                    className="bg-white/5 border-white/10 h-12"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
