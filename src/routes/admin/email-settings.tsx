import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TENANT_ID } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendTestTenantEmail } from "@/lib/tenant-email.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/email-settings")({
  component: EmailSettingsPage,
});

type Config = {
  tenant_id: string;
  provider: string;
  api_key: string;
  from_email: string;
  from_name: string;
  reply_to: string | null;
  enabled: boolean;
};

type Template = {
  id?: string;
  tenant_id: string;
  template_key: string;
  subject: string;
  html_body: string;
  enabled: boolean;
};

const DEFAULT_TEMPLATES: Omit<Template, "tenant_id">[] = [
  {
    template_key: "welcome",
    subject: "Bem-vindo(a) à nossa plataforma!",
    html_body: "<h2>Olá, {{name}}!</h2><p>Sua conta foi criada com sucesso.</p>",
    enabled: true,
  },
  {
    template_key: "password_reset",
    subject: "Redefinição de senha",
    html_body:
      "<h2>Redefinir senha</h2><p>Clique no link para redefinir: <a href=\"{{link}}\">{{link}}</a></p>",
    enabled: true,
  },
  {
    template_key: "auction_won",
    subject: "Parabéns! Você arrematou o leilão",
    html_body:
      "<h2>Você venceu!</h2><p>Olá {{name}}, você arrematou <b>{{product}}</b> por R$ {{price}}.</p>",
    enabled: true,
  },
];

function EmailSettingsPage() {
  const [config, setConfig] = useState<Config>({
    tenant_id: TENANT_ID,
    provider: "smtp2go",
    api_key: "",
    from_email: "",
    from_name: "",
    reply_to: "",
    enabled: true,
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  const sendTest = useServerFn(sendTestTenantEmail);

  useEffect(() => {
    (async () => {
      const [{ data: cfg }, { data: tpls }, { data: lgs }] = await Promise.all([
        supabase.from("tenant_email_configs").select("*").eq("tenant_id", TENANT_ID).maybeSingle(),
        supabase.from("tenant_email_templates").select("*").eq("tenant_id", TENANT_ID).order("template_key"),
        supabase.from("tenant_email_logs").select("*").eq("tenant_id", TENANT_ID).order("created_at", { ascending: false }).limit(30),
      ]);
      if (cfg) setConfig(cfg as Config);
      setTemplates(
        tpls && tpls.length > 0
          ? (tpls as Template[])
          : DEFAULT_TEMPLATES.map((t) => ({ ...t, tenant_id: TENANT_ID })),
      );
      setLogs(lgs ?? []);
      setLoading(false);
    })();
  }, []);

  async function saveConfig() {
    setSaving(true);
    const { error } = await supabase
      .from("tenant_email_configs")
      .upsert({ ...config, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Configuração salva");
  }

  async function saveTemplate(t: Template) {
    const payload = { ...t, tenant_id: TENANT_ID, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from("tenant_email_templates")
      .upsert(payload, { onConflict: "tenant_id,template_key" });
    if (error) toast.error(error.message);
    else toast.success(`Template ${t.template_key} salvo`);
  }

  async function deleteTemplate(t: Template) {
    if (!t.id) {
      setTemplates((prev) => prev.filter((x) => x.template_key !== t.template_key));
      return;
    }
    const { error } = await supabase.from("tenant_email_templates").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    toast.success("Template removido");
  }

  async function handleTest() {
    if (!testEmail) return toast.error("Informe um e-mail de destino");
    setSending(true);
    try {
      await sendTest({ data: { tenantId: TENANT_ID, to: testEmail } });
      toast.success("E-mail de teste enviado!");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="p-8 text-white/60">Carregando…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">E-mails do site (SMTP2Go)</h1>
        <p className="text-white/60 text-sm">
          Tenant atual: <b>{TENANT_ID}</b>. Cada instalação usa sua própria conta SMTP2Go.
        </p>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Log de envios</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Credenciais SMTP2Go</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/60">
                Crie sua conta em <a className="text-primary underline" href="https://smtp2go.com" target="_blank" rel="noreferrer">smtp2go.com</a>,
                gere uma API key em <b>Settings → API Keys</b> e valide seu domínio remetente em <b>Settings → Verified Senders</b>.
              </p>
              <div>
                <Label>API Key</Label>
                <Input
                  value={config.api_key}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder="api-XXXXXXXXXXXXXXXXXXXXXXXX"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>E-mail remetente</Label>
                  <Input
                    value={config.from_email}
                    onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                    placeholder="no-reply@seudominio.com.br"
                  />
                </div>
                <div>
                  <Label>Nome remetente</Label>
                  <Input
                    value={config.from_name}
                    onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                    placeholder="Centavo do Milhão"
                  />
                </div>
              </div>
              <div>
                <Label>Reply-To (opcional)</Label>
                <Input
                  value={config.reply_to ?? ""}
                  onChange={(e) => setConfig({ ...config, reply_to: e.target.value })}
                  placeholder="contato@seudominio.com.br"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} />
                <Label>Envio ativado</Label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveConfig} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Salvar configuração
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Enviar e-mail de teste</CardTitle></CardHeader>
            <CardContent className="flex gap-2">
              <Input
                type="email"
                placeholder="seu@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button onClick={handleTest} disabled={sending}>
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar teste
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {templates.map((t, i) => (
            <Card key={t.id ?? t.template_key}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  <code className="text-primary">{t.template_key}</code>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={t.enabled}
                    onCheckedChange={(v) => {
                      const next = [...templates];
                      next[i] = { ...t, enabled: v };
                      setTemplates(next);
                    }}
                  />
                  <Button size="sm" variant="destructive" onClick={() => deleteTemplate(t)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Assunto</Label>
                  <Input
                    value={t.subject}
                    onChange={(e) => {
                      const next = [...templates];
                      next[i] = { ...t, subject: e.target.value };
                      setTemplates(next);
                    }}
                  />
                </div>
                <div>
                  <Label>HTML (use {"{{variavel}}"})</Label>
                  <Textarea
                    rows={6}
                    value={t.html_body}
                    onChange={(e) => {
                      const next = [...templates];
                      next[i] = { ...t, html_body: e.target.value };
                      setTemplates(next);
                    }}
                  />
                </div>
                <Button size="sm" onClick={() => saveTemplate(t)}>Salvar template</Button>
              </CardContent>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setTemplates([
                ...templates,
                { tenant_id: TENANT_ID, template_key: `novo_${Date.now()}`, subject: "", html_body: "", enabled: true },
              ])
            }
          >
            + Adicionar template
          </Button>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-white/60 border-b border-white/10">
                  <tr>
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Para</th>
                    <th className="text-left p-3">Assunto</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-white/5">
                      <td className="p-3 text-white/60">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                      <td className="p-3">{l.to_email}</td>
                      <td className="p-3">{l.subject}</td>
                      <td className={`p-3 ${l.status === "sent" ? "text-green-400" : "text-red-400"}`}>{l.status}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-white/40">Nenhum envio ainda</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
