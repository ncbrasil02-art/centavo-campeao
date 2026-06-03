-- Limpa leilões ativos para evitar conflitos
DELETE FROM public.auctions WHERE status IN ('scheduled', 'live', 'pending_audit');

DO $$
DECLARE
    v_auction_id UUID;
    v_product_id UUID;
BEGIN
    -- Busca o MacBook Air
    SELECT id INTO v_product_id FROM public.products WHERE name LIKE '%MacBook Air%' LIMIT 1;
    IF v_product_id IS NULL THEN
        SELECT id INTO v_product_id FROM public.products LIMIT 1;
    END IF;

    -- Cria o leilão diretamente como LIVE para garantir o início
    INSERT INTO public.auctions (
        product_id, 
        start_time, 
        end_time,
        timer_duration, 
        status, 
        current_price, 
        bid_count, 
        robot_enabled
    ) VALUES (
        v_product_id, 
        now(), 
        now() + interval '30 seconds',
        30, 
        'live', 
        0.01, 
        0, 
        true
    ) RETURNING id INTO v_auction_id;

    -- Configura robôs agressivos para teste
    UPDATE public.robot_settings 
    SET active = true,
        bid_chance = 0.98,
        stop_after_minutes = 15,
        start_after_minutes = 0,
        min_delay = 1,
        max_delay = 3
    WHERE auction_id = v_auction_id;
END $$;
