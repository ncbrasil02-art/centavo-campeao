-- First, clear any existing dummy data if necessary (optional, but good for a fresh start)
-- DELETE FROM public.auctions WHERE status = 'scheduled' AND current_price = 0.01;

-- Define UUIDs for products to link auctions easily
DO $$
DECLARE
    p1 UUID := gen_random_uuid();
    p2 UUID := gen_random_uuid();
    p3 UUID := gen_random_uuid();
    p4 UUID := gen_random_uuid();
    p5 UUID := gen_random_uuid();
    p6 UUID := gen_random_uuid();
    p7 UUID := gen_random_uuid();
    p8 UUID := gen_random_uuid();
BEGIN
    -- Insert Products
    INSERT INTO public.products (id, name, description, market_value, category, images, slug) VALUES
    (p1, 'iPhone 15 Pro Max 256GB Titanium', 'O iPhone 15 Pro Max é o primeiro iPhone com design em titânio de qualidade aeroespacial. O chip A17 Pro oferece o melhor desempenho gráfico em um iPhone até hoje. Câmera principal de 48 MP com zoom óptico de 5x.', 10999.00, 'Smartphones', ARRAY['https://images.unsplash.com/photo-1696446701796-da61225697cc?q=80&w=800&auto=format&fit=crop'], 'iphone-15-pro-max-titanium-' || substring(gen_random_uuid()::text, 1, 4)),
    (p2, 'MacBook Air 13" M3 8GB/256GB', 'O MacBook Air com chip M3 é superfino e rápido. Com CPU de 8 núcleos e GPU de até 10 núcleos, o desempenho é surpreendente para trabalho e entretenimento. Bateria para o dia todo.', 12499.00, 'Informática', ARRAY['https://images.unsplash.com/photo-1517336712461-755f79b3865f?q=80&w=800&auto=format&fit=crop'], 'macbook-air-m3-13-' || substring(gen_random_uuid()::text, 1, 4)),
    (p3, 'Samsung Galaxy S24 Ultra 512GB', 'Conheça o Galaxy S24 Ultra com Galaxy AI. Tradução simultânea, edição generativa de fotos e busca inteligente. Tela Dynamic AMOLED 2X de 6.8 polegadas e caneta S Pen inclusa.', 9999.00, 'Smartphones', ARRAY['https://images.unsplash.com/photo-1678911820864-e2c567c655d7?q=80&w=800&auto=format&fit=crop'], 'samsung-galaxy-s24-ultra-' || substring(gen_random_uuid()::text, 1, 4)),
    (p4, 'Nintendo Switch OLED Modelo Mario Red', 'O Nintendo Switch – Modelo OLED inclui uma tela OLED vibrante de 7 polegadas, suporte ajustável amplo, base com porta LAN e 64 GB de armazenamento. Edição especial Mario Red.', 2699.00, 'Games', ARRAY['https://images.unsplash.com/photo-1578303372216-f12df58437ad?q=80&w=800&auto=format&fit=crop'], 'nintendo-switch-oled-mario-' || substring(gen_random_uuid()::text, 1, 4)),
    (p5, 'Sony WH-1000XM5 Noise Cancelling', 'Os headphones WH-1000XM5 redefinem o silêncio. Com cancelamento de ruído líder da indústria e áudio de alta fidelidade. Design leve e bateria de até 30 horas com carga rápida.', 2999.00, 'Áudio', ARRAY['https://images.unsplash.com/photo-1618366712277-721626c7467e?q=80&w=800&auto=format&fit=crop'], 'sony-wh-1000xm5-black-' || substring(gen_random_uuid()::text, 1, 4)),
    (p6, 'Apple Watch Ultra 2 GPS + Cellular', 'O Apple Watch mais resistente e capaz. Caixa de titânio de 49 mm, resistência à água de 100m e bateria para até 36 horas. Ideal para atletas e aventureiros.', 9699.00, 'Smartwatches', ARRAY['https://images.unsplash.com/photo-1434493907317-a46b53b5932d?q=80&w=800&auto=format&fit=crop'], 'apple-watch-ultra-2-titanium-' || substring(gen_random_uuid()::text, 1, 4)),
    (p7, 'PlayStation 5 Slim 1TB Digital Edition', 'Design mais compacto com 1TB de armazenamento SSD. Experimente carregamento instantâneo, feedback tátil e áudio 3D envolvente. Inclui controle DualSense.', 3799.00, 'Games', ARRAY['https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=800&auto=format&fit=crop'], 'playstation-5-slim-digital-' || substring(gen_random_uuid()::text, 1, 4)),
    (p8, 'GoPro HERO12 Black Creator Edition', 'A HERO12 Black Creator Edition é uma potência de captura de conteúdo tudo-em-um. Vídeo 5.3K, estabilização HyperSmooth 6.0 e luz LED incluída.', 4599.00, 'Fotografia', ARRAY['https://images.unsplash.com/photo-1565538810643-95bdb810003b?q=80&w=800&auto=format&fit=crop'], 'gopro-hero-12-black-creator-' || substring(gen_random_uuid()::text, 1, 4));

    -- Insert Auctions
    -- Some active now, some scheduled for later today, some for tomorrow
    INSERT INTO public.auctions (id, product_id, current_price, bid_count, start_time, end_time, status, robot_enabled, timer_duration) VALUES
    (gen_random_uuid(), p1, 0.01, 0, now(), now() + interval '2 hours', 'active', true, 15),
    (gen_random_uuid(), p2, 0.01, 0, now() + interval '10 minutes', now() + interval '3 hours', 'scheduled', true, 15),
    (gen_random_uuid(), p3, 0.01, 0, now() + interval '30 minutes', now() + interval '4 hours', 'scheduled', true, 15),
    (gen_random_uuid(), p4, 0.01, 0, now() + interval '1 hour', now() + interval '5 hours', 'scheduled', true, 15),
    (gen_random_uuid(), p5, 0.01, 0, now() + interval '2 hours', now() + interval '6 hours', 'scheduled', true, 15),
    (gen_random_uuid(), p6, 0.01, 0, now() + interval '1 day', now() + interval '1 day 4 hours', 'scheduled', true, 15),
    (gen_random_uuid(), p7, 0.01, 0, now() + interval '1 day 2 hours', now() + interval '1 day 6 hours', 'scheduled', true, 15),
    (gen_random_uuid(), p8, 0.01, 0, now() + interval '2 days', now() + interval '2 days 4 hours', 'scheduled', true, 15);
END $$;