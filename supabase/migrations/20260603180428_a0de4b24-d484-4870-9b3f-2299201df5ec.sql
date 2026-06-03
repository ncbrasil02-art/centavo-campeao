-- 1. Obter IDs de produtos para os leilões
DO $$
DECLARE
    v_ps5_id UUID;
    v_iphone_id UUID;
    v_airpods_id UUID;
    v_auction_id UUID;
BEGIN
    SELECT id INTO v_ps5_id FROM public.products WHERE name LIKE '%PlayStation 5 Pro%' LIMIT 1;
    SELECT id INTO v_iphone_id FROM public.products WHERE name LIKE '%iPhone 16 Pro Max%' LIMIT 1;
    SELECT id INTO v_airpods_id FROM public.products WHERE name LIKE '%AirPods Max%' LIMIT 1;

    -- Se algum não existir, pega qualquer um disponível
    IF v_ps5_id IS NULL THEN SELECT id INTO v_ps5_id FROM public.products LIMIT 1; END IF;
    IF v_iphone_id IS NULL THEN SELECT id INTO v_iphone_id FROM public.products LIMIT 1; END IF;
    IF v_airpods_id IS NULL THEN SELECT id INTO v_airpods_id FROM public.products LIMIT 1; END IF;

    -- LEILÃO 1: PS5 Pro - 60 min de robô (AO VIVO)
    INSERT INTO public.auctions (product_id, start_time, end_time, timer_duration, status, current_price, bid_count, robot_enabled)
    VALUES (v_ps5_id, now(), now() + interval '30 seconds', 30, 'live', 0.01, 0, true)
    RETURNING id INTO v_auction_id;

    UPDATE public.robot_settings 
    SET active = true, bid_chance = 0.95, stop_after_minutes = 60, start_after_minutes = 0, min_delay = 1, max_delay = 3
    WHERE auction_id = v_auction_id;

    -- LEILÃO 2: iPhone 16 - 30 min de robô (AO VIVO)
    INSERT INTO public.auctions (product_id, start_time, end_time, timer_duration, status, current_price, bid_count, robot_enabled)
    VALUES (v_iphone_id, now(), now() + interval '30 seconds', 30, 'live', 0.01, 0, true)
    RETURNING id INTO v_auction_id;

    UPDATE public.robot_settings 
    SET active = true, bid_chance = 0.95, stop_after_minutes = 30, start_after_minutes = 0, min_delay = 1, max_delay = 3
    WHERE auction_id = v_auction_id;

    -- LEILÃO 3: AirPods Max - Agendado para daqui a 10 min
    INSERT INTO public.auctions (product_id, start_time, timer_duration, status, current_price, bid_count, robot_enabled)
    VALUES (v_airpods_id, now() + interval '10 minutes', 30, 'scheduled', 0.01, 0, true)
    RETURNING id INTO v_auction_id;

    UPDATE public.robot_settings 
    SET active = true, bid_chance = 0.95, stop_after_minutes = 15, start_after_minutes = 0, min_delay = 1, max_delay = 3
    WHERE auction_id = v_auction_id;

END $$;
