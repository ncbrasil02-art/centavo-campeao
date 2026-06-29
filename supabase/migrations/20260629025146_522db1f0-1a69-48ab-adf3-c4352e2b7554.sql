
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'centavodomilhao';
ALTER TABLE public.app_phrases ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'centavodomilhao';
ALTER TABLE public.demo_auctions ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'centavodomilhao';
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'centavodomilhao';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'centavodomilhao';
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'centavodomilhao';
ALTER TABLE public.bid_packages ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'centavodomilhao';
ALTER TABLE public.narration_phrases ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'centavodomilhao';
ALTER TABLE public.future_auction_templates ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'centavodomilhao';
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'centavodomilhao';

UPDATE public.banners SET tenant_id = 'centavodomilhao' WHERE tenant_id = '';
UPDATE public.app_phrases SET tenant_id = 'centavodomilhao' WHERE tenant_id = '';
UPDATE public.demo_auctions SET tenant_id = 'centavodomilhao' WHERE tenant_id = '';
UPDATE public.testimonials SET tenant_id = 'centavodomilhao' WHERE tenant_id = '';
UPDATE public.products SET tenant_id = 'centavodomilhao' WHERE tenant_id = '';
UPDATE public.auctions SET tenant_id = 'centavodomilhao' WHERE tenant_id = '';
UPDATE public.bid_packages SET tenant_id = 'centavodomilhao' WHERE tenant_id = '';
UPDATE public.narration_phrases SET tenant_id = 'centavodomilhao' WHERE tenant_id = '';
UPDATE public.future_auction_templates SET tenant_id = 'centavodomilhao' WHERE tenant_id = '';
UPDATE public.admin_settings SET tenant_id = 'centavodomilhao' WHERE tenant_id = '';

CREATE INDEX IF NOT EXISTS banners_tenant_id_idx ON public.banners (tenant_id);
CREATE INDEX IF NOT EXISTS app_phrases_tenant_id_idx ON public.app_phrases (tenant_id);
CREATE INDEX IF NOT EXISTS demo_auctions_tenant_id_idx ON public.demo_auctions (tenant_id);
CREATE INDEX IF NOT EXISTS testimonials_tenant_id_idx ON public.testimonials (tenant_id);
CREATE INDEX IF NOT EXISTS products_tenant_id_idx ON public.products (tenant_id);
CREATE INDEX IF NOT EXISTS auctions_tenant_id_idx ON public.auctions (tenant_id);
CREATE INDEX IF NOT EXISTS bid_packages_tenant_id_idx ON public.bid_packages (tenant_id);
CREATE INDEX IF NOT EXISTS narration_phrases_tenant_id_idx ON public.narration_phrases (tenant_id);
CREATE INDEX IF NOT EXISTS future_auction_templates_tenant_id_idx ON public.future_auction_templates (tenant_id);
CREATE INDEX IF NOT EXISTS admin_settings_tenant_id_idx ON public.admin_settings (tenant_id);

ALTER TABLE public.banners ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.app_phrases ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.demo_auctions ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.testimonials ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.products ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.auctions ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.bid_packages ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.narration_phrases ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.future_auction_templates ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.admin_settings ALTER COLUMN tenant_id DROP DEFAULT;
