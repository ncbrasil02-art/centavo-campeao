-- Add slug column to auctions
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Recreate or update slugify function
CREATE OR REPLACE FUNCTION public.slugify(v_text TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Try to use unaccent if available, otherwise just regex
    BEGIN
        RETURN lower(regexp_replace(regexp_replace(public.unaccent(v_text), '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
    EXCEPTION WHEN undefined_function THEN
        RETURN lower(regexp_replace(regexp_replace(v_text, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION public.handle_auction_slug()
RETURNS TRIGGER AS $$
DECLARE
    prod_name TEXT;
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        SELECT name INTO prod_name FROM public.products WHERE id = NEW.product_id;
        NEW.slug := public.slugify(prod_name) || '-' || substr(md5(random()::text), 0, 5);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid errors on retry
DROP TRIGGER IF EXISTS tr_auction_slug ON public.auctions;

CREATE TRIGGER tr_auction_slug
BEFORE INSERT ON public.auctions
FOR EACH ROW
EXECUTE FUNCTION public.handle_auction_slug();

-- Update existing auctions with slugs if they don't have one
UPDATE public.auctions a
SET slug = public.slugify(p.name) || '-' || a.id::text
FROM public.products p
WHERE a.product_id = p.id AND (a.slug IS NULL OR a.slug = '');
