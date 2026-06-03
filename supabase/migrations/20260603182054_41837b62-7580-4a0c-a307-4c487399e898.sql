-- 1. Criação dos leilões de teste
DO $$
DECLARE
    v_macbook_id UUID;
    v_watch_id UUID;
    v_ipad_id UUID;
    v_switch_id UUID;
    v_auction_id UUID;
BEGIN
    SELECT id INTO v_macbook_id FROM public.products WHERE name LIKE '%MacBook%' LIMIT 1;
    SELECT id INTO v_watch_id FROM public.products WHERE name LIKE '%Watch%' LIMIT 1;
    SELECT id INTO v_ipad_id FROM public.products WHERE name LIKE '%iPad%' LIMIT 1;
    SELECT id INTO v_switch_id FROM public.products WHERE name LIKE '%Nintendo%' OR name LIKE '%Switch%' LIMIT 1;

    -- Fallbacks
    IF v_macbook_id IS NULL THEN SELECT id INTO v_macbook_id FROM public.products OFFSET 0 LIMIT 1; END IF;
    IF v_watch_id IS NULL THEN SELECT id INTO v_watch_id FROM public.products OFFSET 1 LIMIT 1; END IF;
    IF v_ipad_id IS NULL THEN SELECT id INTO v_ipad_id FROM public.products OFFSET 2 LIMIT 1; END IF;
    IF v_switch_id IS NULL THEN SELECT id INTO v_switch_id FROM public.products OFFSET 3 LIMIT 1; END IF;

    -- 1. MacBook (30s, Agora)
    INSERT INTO public.auctions (product_id, start_time, end_time, timer_duration, status, current_price, bid_count, robot_enabled)
    VALUES (v_macbook_id, now(), now() + interval '30 seconds', 30, 'live', 0.01, 0, true)
    RETURNING id INTO v_auction_id;
    UPDATE public.robot_settings SET active = true, stop_after_minutes = 60 WHERE auction_id = v_auction_id;

    -- 2. Apple Watch (15s, em 5 min)
    INSERT INTO public.auctions (product_id, start_time, timer_duration, status, current_price, bid_count, robot_enabled)
    VALUES (v_watch_id, now() + interval '5 minutes', 15, 'scheduled', 0.01, 0, true)
    RETURNING id INTO v_auction_id;
    UPDATE public.robot_settings SET active = true, stop_after_minutes = 30 WHERE auction_id = v_auction_id;

    -- 3. iPad Pro (20s, em 15 min)
    INSERT INTO public.auctions (product_id, start_time, timer_duration, status, current_price, bid_count, robot_enabled)
    VALUES (v_ipad_id, now() + interval '15 minutes', 20, 'scheduled', 0.01, 0, true)
    RETURNING id INTO v_auction_id;
    UPDATE public.robot_settings SET active = true, stop_after_minutes = 45 WHERE auction_id = v_auction_id;

    -- 4. Nintendo Switch (10s, em 30 min)
    INSERT INTO public.auctions (product_id, start_time, timer_duration, status, current_price, bid_count, robot_enabled)
    VALUES (v_switch_id, now() + interval '30 minutes', 10, 'scheduled', 0.01, 0, true)
    RETURNING id INTO v_auction_id;
    UPDATE public.robot_settings SET active = true, stop_after_minutes = 20 WHERE auction_id = v_auction_id;

END $$;
