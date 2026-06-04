ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS show_secondary_banner BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_finished_auctions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_testimonials BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_winners_ranking BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS secondary_banner_title TEXT DEFAULT 'Pacote de Lances com 50% de Desconto',
ADD COLUMN IF NOT EXISTS secondary_banner_subtitle TEXT DEFAULT 'Comece com o pé direito! Adquira seu primeiro pacote de lances agora e ganhe o dobro para disputar seus produtos favoritos.',
ADD COLUMN IF NOT EXISTS secondary_banner_image TEXT DEFAULT 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=2000&auto=format&fit=crop',
ADD COLUMN IF NOT EXISTS secondary_banner_link TEXT DEFAULT '/packages';
