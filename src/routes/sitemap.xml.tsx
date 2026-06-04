import { createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/sitemap/xml')({
  loader: async () => {
    const { data: auctions } = await supabase
      .from('auctions')
      .select('slug, updated_at')
      .eq('status', 'live');

    const baseUrl = window.location.origin;

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/how-it-works</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/ranking</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/packages</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  ${(auctions || [])
    .map(
      (a) => `
  <url>
    <loc>${baseUrl}/auctions/${a.slug}</loc>
    <lastmod>${new Date(a.updated_at || new Date()).toISOString().split('T')[0]}</lastmod>
    <changefreq>always</changefreq>
    <priority>0.9</priority>
  </url>`
    )
    .join('')}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  },
  component: () => null,
});
