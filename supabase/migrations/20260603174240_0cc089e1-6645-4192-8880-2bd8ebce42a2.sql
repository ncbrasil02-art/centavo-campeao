-- Final clean sweep of any confusing auctions
DELETE FROM public.auctions WHERE status IN ('scheduled', 'live', 'pending_audit');

-- Create a fresh live test MacBook Air
DO $$
DECLARE
    v_auction_id UUID;
    v_product_id UUID;
BEGIN
    SELECT id INTO v_product_id FROM public.products WHERE name LIKE '%MacBook Air%' LIMIT 1;
    IF v_product_id IS NULL THEN
        SELECT id INTO v_product_id FROM public.products LIMIT 1;
    END IF;

    -- Create it as LIVE immediately
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

    -- Robot setup
    UPDATE public.robot_settings 
    SET active = true,
        bid_chance = 0.98,
        stop_after_minutes = 15,
        start_after_minutes = 0
    WHERE auction_id = v_auction_id;
END $$;
