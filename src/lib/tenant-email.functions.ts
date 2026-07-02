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

function renderTemplate(tpl: string, vars: Record<string, string> = {}) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

async function sendViaSmtp2go(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const res = await fetch("https://api.smtp2go.com/v3/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: opts.apiKey,
      sender: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html_body: opts.html,
      ...(opts.replyTo ? { custom_headers: [{ header: "Reply-To", value: opts.replyTo }] } : {}),
    }),
  });
  const json = await res.json().catch(() => ({}));
  const ok = res.ok && json?.data?.succeeded > 0;
  return { ok, status: res.status, json };
}

export const sendTenantEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sendInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cfg, error: cfgErr } = await supabaseAdmin
      .from("tenant_email_configs")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .maybeSingle();

    if (cfgErr || !cfg) throw new Error("Configuração de e-mail não encontrada para este tenant");
    if (!cfg.enabled) throw new Error("Envio de e-mail desativado para este tenant");

    let subject = data.subject ?? "";
    let html = data.html ?? "";

    if (data.templateKey) {
      const { data: tpl } = await supabaseAdmin
        .from("tenant_email_templates")
        .select("subject, html_body, enabled")
        .eq("tenant_id", data.tenantId)
        .eq("template_key", data.templateKey)
        .maybeSingle();
      if (!tpl?.enabled) throw new Error(`Template ${data.templateKey} não encontrado ou desativado`);
      subject = renderTemplate(tpl.subject, data.variables);
      html = renderTemplate(tpl.html_body, data.variables);
    }

    if (!subject || !html) throw new Error("subject e html são obrigatórios");

    const from = cfg.from_name ? `${cfg.from_name} <${cfg.from_email}>` : cfg.from_email;

    let result: { ok: boolean; status: number; json: any };
    try {
      result = await sendViaSmtp2go({
        apiKey: cfg.api_key,
        from,
        to: data.to,
        subject,
        html,
        replyTo: cfg.reply_to ?? undefined,
      });
    } catch (e: any) {
      await supabaseAdmin.from("tenant_email_logs").insert({
        tenant_id: data.tenantId,
        template_key: data.templateKey ?? null,
        to_email: data.to,
        subject,
        status: "error",
        error: String(e?.message ?? e),
      });
      throw e;
    }

    await supabaseAdmin.from("tenant_email_logs").insert({
      tenant_id: data.tenantId,
      template_key: data.templateKey ?? null,
      to_email: data.to,
      subject,
      status: result.ok ? "sent" : "failed",
      provider_response: result.json,
      error: result.ok ? null : JSON.stringify(result.json?.data?.error ?? result.json),
    });

    if (!result.ok) throw new Error("Falha ao enviar e-mail via SMTP2Go");
    return { ok: true };
  });

export const sendTestTenantEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ tenantId: z.string(), to: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    void context;
    const fn = sendTenantEmail as unknown as (args: { data: z.infer<typeof sendInput> }) => Promise<any>;
    return await fn({
      data: {
        tenantId: data.tenantId,
        to: data.to,
        subject: "Teste de envio – SMTP2Go",
        html: `<div style="font-family:Arial,sans-serif;padding:24px"><h2>Funcionou! 🎉</h2><p>Este é um e-mail de teste enviado pela sua plataforma via SMTP2Go.</p></div>`,
      },
    });
  });
