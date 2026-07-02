import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const sendInput = z.object({
  tenantId: z.string().min(1),
  to: z.string().email(),
  templateKey: z.string().optional(),
  subject: z.string().optional(),
  html: z.string().optional(),
  variables: z.record(z.string()).optional(),
});

const REQUIRED_VARS: Record<string, string[]> = {
  welcome: ["link"],
  password_reset: ["link"],
  email_confirmation: ["link"],
  auction_won: ["name", "product", "price"],
};

function assertVariablesProvided(
  templateKey: string | undefined,
  subject: string,
  html: string,
  vars: Record<string, string> = {},
) {
  if (!templateKey) return;
  const required = REQUIRED_VARS[templateKey] ?? [];
  const content = `${subject}\n${html}`;
  const missingInTemplate = required.filter(
    (v) => !new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`).test(content),
  );
  if (missingInTemplate.length) {
    throw new Error(
      `Template "${templateKey}" não contém as variáveis obrigatórias: ${missingInTemplate
        .map((v) => `{{${v}}}`)
        .join(", ")}`,
    );
  }
  const missingValues = required.filter((v) => !vars[v] || !String(vars[v]).trim());
  if (missingValues.length) {
    throw new Error(
      `Valores ausentes para variáveis obrigatórias: ${missingValues.join(", ")}`,
    );
  }
}

function renderTemplate(tpl: string, vars: Record<string, string> = {}) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

async function coreSend(input: z.infer<typeof sendInput>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: cfg, error: cfgErr } = await supabaseAdmin
    .from("tenant_email_configs")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (cfgErr || !cfg) throw new Error("Configuração de e-mail não encontrada para este tenant");
  if (!cfg.enabled) throw new Error("Envio de e-mail desativado para este tenant");

  let subject = input.subject ?? "";
  let html = input.html ?? "";

  if (input.templateKey) {
    const { data: tpl } = await supabaseAdmin
      .from("tenant_email_templates")
      .select("subject, html_body, enabled")
      .eq("tenant_id", input.tenantId)
      .eq("template_key", input.templateKey)
      .maybeSingle();
    if (!tpl?.enabled) throw new Error(`Template ${input.templateKey} não encontrado ou desativado`);
    assertVariablesProvided(input.templateKey, tpl.subject, tpl.html_body, input.variables);
    subject = renderTemplate(tpl.subject, input.variables);
    html = renderTemplate(tpl.html_body, input.variables);
  }

  if (!subject || !html) throw new Error("subject e html são obrigatórios");

  const from = cfg.from_name ? `${cfg.from_name} <${cfg.from_email}>` : cfg.from_email;

  const res = await fetch("https://api.smtp2go.com/v3/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: cfg.api_key,
      sender: from,
      to: [input.to],
      subject,
      html_body: html,
      ...(cfg.reply_to ? { custom_headers: [{ header: "Reply-To", value: cfg.reply_to }] } : {}),
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  const ok = res.ok && json?.data?.succeeded > 0;

  await supabaseAdmin.from("tenant_email_logs").insert({
    tenant_id: input.tenantId,
    template_key: input.templateKey ?? null,
    to_email: input.to,
    subject,
    status: ok ? "sent" : "failed",
    provider_response: json,
    error: ok ? null : JSON.stringify(json?.data?.error ?? json),
  });

  if (!ok) throw new Error(json?.data?.error ?? "Falha ao enviar e-mail via SMTP2Go");
  return { ok: true };
}

export const sendTenantEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sendInput.parse(input))
  .handler(async ({ data }) => coreSend(data));

export const sendTestTenantEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ tenantId: z.string(), to: z.string().email() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Apenas administradores podem enviar e-mails de teste");
    try {
      await coreSend({
        tenantId: data.tenantId,
        to: data.to,
        subject: "Teste de envio – SMTP2Go",
        html: `<div style="font-family:Arial,sans-serif;padding:24px"><h2>Funcionou! 🎉</h2><p>E-mail de teste enviado via SMTP2Go em ${new Date().toLocaleString("pt-BR")}.</p></div>`,
      });
      // Buscar o último log para retornar detalhes ao painel
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: log } = await supabaseAdmin
        .from("tenant_email_logs")
        .select("status, provider_response, error, created_at, subject, to_email")
        .eq("tenant_id", data.tenantId)
        .eq("to_email", data.to)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { ok: true, log };
    } catch (err: any) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: log } = await supabaseAdmin
        .from("tenant_email_logs")
        .select("status, provider_response, error, created_at, subject, to_email")
        .eq("tenant_id", data.tenantId)
        .eq("to_email", data.to)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { ok: false, error: err?.message ?? "Falha desconhecida", log };
    }
  });
