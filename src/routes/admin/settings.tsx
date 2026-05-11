import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { AdminSubNavbar } from "@/components/AdminSubNavbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Save, Palette, CreditCard, Layout, Upload, Loader2, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState({
    id: "",
    site_name: "",
    logo_url: "",
    primary_color: "",
    secondary_color: "",
    mercado_pago_public_key: "",
    mercado_pago_access_token: "",
    pix_key: "",
    pix_name: "",
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
          primary_color: data.primary_color || "#8B5CF6",
          secondary_color: data.secondary_color || "#7C3AED",
          mercado_pago_public_key: data.mercado_pago_public_key || "",
          mercado_pago_access_token: data.mercado_pago_access_token || "",
          pix_key: data.pix_key || "",
          pix_name: data.pix_name || "",
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("site-assets")
        .getPublicUrl(filePath);

      setSettings({ ...settings, logo_url: publicUrl });
      toast.success("Logotipo carregado com sucesso!");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao carregar logotipo");
    } finally {
      setUploading(false);
    }
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
      
      // Force update context/CSS
      document.documentElement.style.setProperty("--primary", settings.primary_color);
      document.title = settings.site_name;
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
      <Navbar />
      <AdminSubNavbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Configurações <span className="text-primary">Gerais</span>
            </h1>
            <p className="text-white/40">Personalize a aparência e meios de pagamento do seu site</p>
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
          {/* Visual Settings */}
          <div className="space-y-8">
            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Layout className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Identidade Visual</CardTitle>
                    <CardDescription className="text-white/40">Nome e logo da plataforma</CardDescription>
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
                
                <div className="space-y-4">
                  <Label>Logotipo do Site</Label>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                      {settings.logo_url ? (
                        <img src={settings.logo_url} alt="Logo preview" className="max-w-full max-h-full object-contain p-2" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-white/20" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="relative">
                        <input
                          type="file"
                          id="logo-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                        <Button
                          asChild
                          variant="outline"
                          className="w-full border-white/10 hover:bg-white/5 text-white"
                          disabled={uploading}
                        >
                          <label htmlFor="logo-upload" className="cursor-pointer">
                            {uploading ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando...</>
                            ) : (
                              <><Upload className="w-4 h-4 mr-2" /> Alterar Logotipo</>
                            )}
                          </label>
                        </Button>
                      </div>
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">
                        Recomendado: PNG ou SVG transparente, 512x512px
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Paleta de Cores</CardTitle>
                    <CardDescription className="text-white/40">Cores principais do sistema</CardDescription>
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
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary/80 leading-relaxed font-medium">
                    A cor primária é aplicada automaticamente em botões, links e destaques em toda a plataforma.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Settings */}
          <div className="space-y-8">
            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  <div>
                    <CardTitle className="text-lg">Mercado Pago</CardTitle>
                    <CardDescription className="text-white/40">Integração para pagamentos automáticos</CardDescription>
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
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-xs text-blue-400 space-y-1">
                    <p className="font-bold uppercase tracking-wider">Atenção:</p>
                    <p>Mantenha suas chaves em segredo. Elas são necessárias para processar vendas de pacotes de lances.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-500" />
                  <div>
                    <CardTitle className="text-lg">Pagamento PIX (Manual)</CardTitle>
                    <CardDescription className="text-white/40">Dados para transferência direta</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pix_key">Chave PIX</Label>
                  <Input 
                    id="pix_key" 
                    value={settings.pix_key || ""} 
                    onChange={(e) => setSettings({...settings, pix_key: e.target.value})}
                    placeholder="E-mail, CPF, Telefone ou Chave Aleatória"
                    className="bg-white/5 border-white/10 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pix_name">Nome do Beneficiário</Label>
                  <Input 
                    id="pix_name" 
                    value={settings.pix_name || ""} 
                    onChange={(e) => setSettings({...settings, pix_name: e.target.value})}
                    placeholder="Nome completo ou Razão Social"
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