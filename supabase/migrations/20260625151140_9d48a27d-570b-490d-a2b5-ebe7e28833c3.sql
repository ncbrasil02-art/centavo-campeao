ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'centavodomilhao';

UPDATE public.site_settings
  SET tenant_id = 'centavodomilhao'
  WHERE tenant_id IS NULL OR tenant_id = '';

CREATE UNIQUE INDEX IF NOT EXISTS site_settings_tenant_id_key
  ON public.site_settings (tenant_id);

ALTER TABLE public.site_settings
  ALTER COLUMN tenant_id DROP DEFAULT;