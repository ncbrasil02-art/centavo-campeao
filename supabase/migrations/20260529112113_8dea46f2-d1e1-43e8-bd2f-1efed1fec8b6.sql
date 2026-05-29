-- Add slug to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Function to generate slug from text
CREATE OR REPLACE FUNCTION public.slugify(v_text TEXT) 
RETURNS TEXT AS $$
DECLARE
  v_slug TEXT;
BEGIN
  -- Simple slugify: lowercase, replace non-alphanumeric with hyphen
  v_slug := lower(v_text);
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  RETURN v_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-slugify product name
CREATE OR REPLACE FUNCTION public.product_slug_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.slug IS NULL OR NEW.slug = '') THEN
    NEW.slug := public.slugify(NEW.name) || '-' || substr(NEW.id::text, 1, 4);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_product_slug ON public.products;
CREATE TRIGGER tr_product_slug
BEFORE INSERT OR UPDATE OF name ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.product_slug_trigger();

-- Update existing products
UPDATE public.products SET slug = public.slugify(name) || '-' || substr(id::text, 1, 4) WHERE slug IS NULL;
