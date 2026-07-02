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

type TemplateMeta = {
  label: string;
  description: string;
  variables: { name: string; example: string; hint: string }[];
};

const TEMPLATE_META: Record<string, TemplateMeta> = {
  welcome: {
    label: "Cadastro / Confirmação de e-mail",
    description:
      "Enviado logo após o cadastro. Deve conter o link {{link}} para confirmar a conta.",
    variables: [
      { name: "name", example: "João Silva", hint: "Nome do usuário" },
      { name: "link", example: "https://seu-site.com/auth/confirm?token=abc123", hint: "Link de confirmação" },
    ],
  },
  password_reset: {
    label: "Recuperação de senha",
    description: "Enviado quando o usuário pede redefinição de senha.",
    variables: [
      { name: "link", example: "https://seu-site.com/auth/reset?token=abc123", hint: "Link de redefinição" },
    ],
  },
  email_confirmation: {
    label: "Reenvio de confirmação de e-mail",
    description: "Usado para reenviar o link de confirmação de e-mail.",
    variables: [
      { name: "name", example: "João Silva", hint: "Nome do usuário" },
      { name: "link", example: "https://seu-site.com/auth/confirm?token=abc123", hint: "Link de confirmação" },
    ],
  },
  auction_won: {
    label: "Vencedor de leilão",
    description: "Notifica o vencedor de um leilão arrematado.",
    variables: [
      { name: "name", example: "João Silva", hint: "Nome" },
      { name: "product", example: "iPhone 15", hint: "Produto" },
      { name: "price", example: "0,47", hint: "Valor final em R$" },
    ],
  },
};

const DEFAULT_TEMPLATES: Omit<Template, "tenant_id">[] = [
  {
    template_key: "welcome",
    subject: "Bem-vindo(a)! Confirme seu e-mail",
    html_body:
      '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">\n  <h2>Olá, {{name}}!</h2>\n  <p>Sua conta foi criada. Clique no botão abaixo para confirmar seu e-mail:</p>\n  <p style="text-align:center;margin:24px 0">\n    <a href="{{link}}" style="background:#f59e0b;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Confirmar minha conta</a>\n  </p>\n  <p style="font-size:12px;color:#666">Se o botão não funcionar, copie e cole o link:<br/>{{link}}</p>\n</div>',
    enabled: true,
  },
  {
    template_key: "password_reset",
    subject: "Redefinição de senha",
    html_body:
      '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">\n  <h2>Redefinir sua senha</h2>\n  <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p>\n  <p style="text-align:center;margin:24px 0">\n    <a href="{{link}}" style="background:#f59e0b;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Redefinir senha</a>\n  </p>\n  <p style="font-size:12px;color:#666">Se você não solicitou, ignore este e-mail.<br/>Link direto: {{link}}</p>\n</div>',
    enabled: true,
  },
  {
    template_key: "email_confirmation",
    subject: "Confirme seu e-mail",
    html_body:
      '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">\n  <h2>Olá, {{name}}!</h2>\n  <p>Confirme seu e-mail clicando no link abaixo:</p>\n  <p style="text-align:center;margin:24px 0">\n    <a href="{{link}}" style="background:#f59e0b;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Confirmar e-mail</a>\n  </p>\n</div>',
    enabled: true,
  },
  {
    template_key: "auction_won",
    subject: "Parabéns! Você arrematou o leilão",
    html_body:
      '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">\n  <h2>Você venceu! 🎉</h2>\n  <p>Olá {{name}}, você arrematou <b>{{product}}</b> por R$ {{price}}.</p>\n</div>',
    enabled: true,
  },
];

function renderPreview(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

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
      const saved = (tpls as Template[]) ?? [];
      const merged: Template[] = DEFAULT_TEMPLATES.map((d) => {
        const found = saved.find((s) => s.template_key === d.template_key);
        return found ?? { ...d, tenant_id: TENANT_ID };
      });
      // Anexa qualquer template customizado que não esteja na lista padrão
      for (const s of saved) {
        if (!merged.find((m) => m.template_key === s.template_key)) merged.push(s);
      }
      setTemplates(merged);
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

  const [testResult, setTestResult] = useState<{
    ok: boolean;
    error?: string;
    log?: any;
    at: string;
  } | null>(null);

  async function handleTest() {
    if (!testEmail) return toast.error("Informe um e-mail de destino");
    setSending(true);
    setTestResult(null);
    try {
      const res: any = await sendTest({ data: { tenantId: TENANT_ID, to: testEmail } });
      setTestResult({ ...res, at: new Date().toLocaleString("pt-BR") });
      if (res?.ok) toast.success("E-mail de teste enviado!");
      else toast.error(res?.error ?? "Falha no envio");
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.message ?? "Erro ao enviar", at: new Date().toLocaleString("pt-BR") });
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
            <CardContent className="space-y-3">
              <p className="text-xs text-white/60">
                Dispara um e-mail simples pela sua conta SMTP2Go, mostra o status HTTP e a resposta bruta da API — útil para diagnosticar API key inválida, remetente não verificado, domínio bloqueado etc.
              </p>
              <div className="flex gap-2">
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
              </div>

              {testResult && (
                <div
                  className={`rounded-md border p-3 text-sm space-y-2 ${
                    testResult.ok
                      ? "border-green-500/40 bg-green-500/10 text-green-200"
                      : "border-red-500/40 bg-red-500/10 text-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <b>{testResult.ok ? "✅ Envio aceito pelo SMTP2Go" : "❌ Falha no envio"}</b>
                    <span className="text-xs opacity-70">{testResult.at}</span>
                  </div>
                  {testResult.error && (
                    <div>
                      <div className="text-xs uppercase opacity-70">Erro</div>
                      <code className="block break-all">{testResult.error}</code>
                    </div>
                  )}
                  {testResult.log?.provider_response && (
                    <details>
                      <summary className="cursor-pointer text-xs opacity-80">Resposta bruta do SMTP2Go</summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded bg-black/40 p-2 text-[11px] text-white/80">
{JSON.stringify(testResult.log.provider_response, null, 2)}
                      </pre>
                    </details>
                  )}
                  {!testResult.ok && (
                    <ul className="list-disc pl-5 text-xs opacity-80">
                      <li>Verifique se a <b>API Key</b> começa com <code>api-</code> e está ativa.</li>
                      <li>O <b>e-mail remetente</b> precisa estar em <i>Verified Senders</i> no SMTP2Go.</li>
                      <li>Confira o <b>Envio ativado</b> logo acima.</li>
                    </ul>
                  )}
                </div>
              )}
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
