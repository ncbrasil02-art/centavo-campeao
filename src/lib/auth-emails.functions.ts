import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Funções públicas de envio de e-mails de autenticação via SMTP2Go (por tenant).
 * NÃO usam requireSupabaseAuth pois são disparadas em fluxos de cadastro/recuperação
 * (usuário ainda não autenticado). Toda validação ocorre server-side.
 */

function renderTemplate(tpl: string, vars: Record<string, string> = {}) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

async function sendViaSmtp2Go(params: {
  tenantId: string;
  to: string;
  templateKey: string;
  variables: Record<string, string>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: cfg }, { data: tpl }] = await Promise.all([
    supabaseAdmin
      .from("tenant_email_configs")
      .select("*")
      .eq("tenant_id", params.tenantId)
      .maybeSingle(),
    supabaseAdmin
      .from("tenant_email_templates")
      .select("subject, html_body, enabled")
      .eq("tenant_id", params.tenantId)
      .eq("template_key", params.templateKey)
      .maybeSingle(),
  ]);

  if (!cfg || !cfg.enabled) throw new Error("E-mail não configurado para este tenant");
  if (!tpl || !tpl.enabled) throw new Error(`Template ${params.templateKey} indisponível`);

  const subject = renderTemplate(tpl.subject, params.variables);
  const html = renderTemplate(tpl.html_body, params.variables);
  const from = cfg.from_name ? `${cfg.from_name} <${cfg.from_email}>` : cfg.from_email;

  const res = await fetch("https://api.smtp2go.com/v3/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: cfg.api_key,
      sender: from,
      to: [params.to],
      subject,
      html_body: html,
      ...(cfg.reply_to ? { custom_headers: [{ header: "Reply-To", value: cfg.reply_to }] } : {}),
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  const ok = res.ok && json?.data?.succeeded > 0;

  await supabaseAdmin.from("tenant_email_logs").insert({
    tenant_id: params.tenantId,
    template_key: params.templateKey,
    to_email: params.to,
    subject,
    status: ok ? "sent" : "failed",
    provider_response: json,
    error: ok ? null : JSON.stringify(json?.data?.error ?? json),
  });

  if (!ok) throw new Error("Falha no envio via SMTP2Go");
  return { ok: true };
}

/** Envia e-mail de boas-vindas após cadastro. */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        tenantId: z.string().min(1),
        to: z.string().email(),
        name: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) =>
    sendViaSmtp2Go({
      tenantId: data.tenantId,
      to: data.to,
      templateKey: "welcome",
      variables: { name: data.name ?? "" },
    }),
  );

/** Envia e-mail de recuperação de senha com link gerado pelo Supabase Auth Admin. */
export const sendPasswordResetEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        tenantId: z.string().min(1),
        to: z.string().email(),
        redirectTo: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.to,
      options: { redirectTo: data.redirectTo },
    });
    if (error) throw new Error(error.message);
    const actionLink = link?.properties?.action_link;
    if (!actionLink) throw new Error("Não foi possível gerar o link de recuperação");

    return sendViaSmtp2Go({
      tenantId: data.tenantId,
      to: data.to,
      templateKey: "password_reset",
      variables: { link: actionLink },
    });
  });

/** Envia e-mail de confirmação de cadastro (signup) com link gerado pelo Supabase. */
export const sendSignupConfirmationEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        tenantId: z.string().min(1),
        to: z.string().email(),
        name: z.string().optional(),
        redirectTo: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: data.to,
      password: crypto.randomUUID(), // placeholder; conta já existe
      options: { redirectTo: data.redirectTo },
    });
    // Se o usuário já foi criado, generateLink signup falha; nesse caso usamos magiclink
    let actionLink = link?.properties?.action_link;
    if (error || !actionLink) {
      const { data: magic, error: magicErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: data.to,
        options: { redirectTo: data.redirectTo },
      });
      if (magicErr) throw new Error(magicErr.message);
      actionLink = magic?.properties?.action_link;
    }
    if (!actionLink) throw new Error("Não foi possível gerar o link de confirmação");

    return sendViaSmtp2Go({
      tenantId: data.tenantId,
      to: data.to,
      templateKey: "welcome",
      variables: { name: data.name ?? "", link: actionLink },
    });
  });
