
CREATE TABLE IF NOT EXISTS public.tenant_email_configs (
  tenant_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'smtp2go',
  api_key TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT '',
  reply_to TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_email_configs TO authenticated;
GRANT ALL ON public.tenant_email_configs TO service_role;
ALTER TABLE public.tenant_email_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tenant email configs" ON public.tenant_email_configs
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.tenant_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, template_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_email_templates TO authenticated;
GRANT ALL ON public.tenant_email_templates TO service_role;
ALTER TABLE public.tenant_email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tenant email templates" ON public.tenant_email_templates
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.tenant_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  template_key TEXT,
  to_email TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL,
  provider_response JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tenant_email_logs TO authenticated;
GRANT ALL ON public.tenant_email_logs TO service_role;
ALTER TABLE public.tenant_email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view email logs" ON public.tenant_email_logs
  FOR SELECT TO authenticated USING (public.is_admin());
