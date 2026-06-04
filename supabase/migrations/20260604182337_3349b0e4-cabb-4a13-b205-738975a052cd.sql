CREATE TABLE IF NOT EXISTS public.demo_auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    product_image TEXT NOT NULL,
    market_value DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2) DEFAULT 0.00,
    modality TEXT NOT NULL DEFAULT 'standard', -- standard, fast, training, min_balance
    last_bidder_name TEXT,
    last_bidder_avatar TEXT,
    timer_seconds INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar configuração no site_settings
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'site_settings' AND column_name = 'demo_auctions_enabled') THEN
        ALTER TABLE public.site_settings ADD COLUMN demo_auctions_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;

GRANT ALL ON public.demo_auctions TO authenticated;
GRANT ALL ON public.demo_auctions TO service_role;
GRANT SELECT ON public.demo_auctions TO anon;

ALTER TABLE public.demo_auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view demo auctions" ON public.demo_auctions
    FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Admins can manage demo auctions" ON public.demo_auctions
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Inserir leilões de demonstração padrão
INSERT INTO public.demo_auctions (product_name, product_image, market_value, modality, order_index) VALUES
('iPhone 15 Pro Max', 'https://jqwnzcuvslqpltjwawyr.supabase.co/storage/v1/object/public/products/iphone15.jpg', 8000.00, 'standard', 1),
('PlayStation 5', 'https://jqwnzcuvslqpltjwawyr.supabase.co/storage/v1/object/public/products/ps5.jpg', 4500.00, 'fast', 2),
('MacBook Air M2', 'https://jqwnzcuvslqpltjwawyr.supabase.co/storage/v1/object/public/products/macbook.jpg', 12000.00, 'min_balance', 3),
('AirPods Pro', 'https://jqwnzcuvslqpltjwawyr.supabase.co/storage/v1/object/public/products/airpods.jpg', 1800.00, 'training', 4);