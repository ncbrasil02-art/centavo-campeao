ALTER TABLE public.site_settings 
ADD COLUMN font_color_primary TEXT DEFAULT '#000000',
ADD COLUMN font_color_secondary TEXT DEFAULT '#666666',
ADD COLUMN card_background_color TEXT DEFAULT '#ffffff',
ADD COLUMN block_background_color TEXT DEFAULT '#f3f4f6',
ADD COLUMN page_background_color TEXT DEFAULT '#ffffff',
ADD COLUMN border_color TEXT DEFAULT '#e5e7eb';

-- Set some reasonable defaults for dark mode if that was the case, 
-- but since there's only one row, we just ensure it has some values.
UPDATE public.site_settings 
SET 
  font_color_primary = '#ffffff',
  font_color_secondary = '#a1a1aa',
  card_background_color = '#18181b',
  block_background_color = '#27272a',
  page_background_color = '#09090b',
  border_color = '#3f3f46'
WHERE theme_mode = 'dark';
