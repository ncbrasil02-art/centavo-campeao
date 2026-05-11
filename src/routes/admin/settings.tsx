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
import { Settings, Save, Palette, CreditCard, Layout } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
          primary_color: data.primary_color || "",
          secondary_color: data.secondary_color || "",
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

  if (loading) return <div className="p-8 text-center text-white/40">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <AdminSubNavbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Configurações <span className="text-primary">Gerais</span>
            </h1>
            <p className="text-white/40">Personalize a aparência e meios de pagamento do seu site</p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvando..." : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
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
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url">URL do Logotipo</Label>
                  <Input 
                    id="logo_url" 
                    value={settings.logo_url || ""} 
                    onChange={(e) => setSettings({...settings, logo_url: e.target.value})}
                    placeholder="https://..."
                    className="bg-white/5 border-white/10"
                  />
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="primary_color" 
                        type="color"
                        value={settings.primary_color || "#8B5CF6"} 
                        onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                        className="w-12 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                      />
                      <Input 
                        value={settings.primary_color || ""} 
                        onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Cor Secundária</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="secondary_color" 
                        type="color"
                        value={settings.secondary_color || "#7C3AED"} 
                        onChange={(e) => setSettings({...settings, secondary_color: e.target.value})}
                        className="w-12 h-10 p-1 bg-white/5 border-white/10 cursor-pointer"
                      />
                      <Input 
                        value={settings.secondary_color || ""} 
                        onChange={(e) => setSettings({...settings, secondary_color: e.target.value})}
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Settings */}
          <div className="space-y-8">
            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-500" />
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
                    className="bg-white/5 border-white/10"
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
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 overflow-hidden backdrop-blur-md">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
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
                    placeholder="E-mail, CPF ou Aleatória"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pix_name">Nome do Beneficiário</Label>
                  <Input 
                    id="pix_name" 
                    value={settings.pix_name || ""} 
                    onChange={(e) => setSettings({...settings, pix_name: e.target.value})}
                    className="bg-white/5 border-white/10"
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