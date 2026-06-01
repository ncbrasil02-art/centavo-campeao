-- Grant access to testimonials for anonymous and authenticated users
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT ON public.testimonials TO authenticated;

-- Ensure other public tables have proper grants
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;

GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;

GRANT SELECT ON public.auctions TO anon;
GRANT SELECT ON public.auctions TO authenticated;

GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.banners TO authenticated;

GRANT SELECT ON public.app_phrases TO anon;
GRANT SELECT ON public.app_phrases TO authenticated;
