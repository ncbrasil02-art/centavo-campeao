CREATE OR REPLACE FUNCTION public.tick_auctions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_pending_count INTEGER := 0;
    v_started_count INTEGER := 0;
    v_finished_count INTEGER := 0;
BEGIN
    -- 1. Start scheduled auctions
    WITH started AS (
        UPDATE public.auctions
        SET 
            status = 'live',
            end_time = now() + (COALESCE(timer_duration, 15) || ' seconds')::interval
        WHERE status = 'scheduled' AND start_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_started_count FROM started;

    -- 2. Move expired auctions to pending_audit
    -- Added a 1s buffer to ensure robots and users have a last chance to bid
    WITH pending AS (
        UPDATE public.auctions
        SET status = 'pending_audit'
        WHERE status = 'live' AND (end_time + '1 second'::interval) <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_pending_count FROM pending;

    RETURN jsonb_build_object(
        'success', true, 
        'started', v_started_count, 
        'finished', v_pending_count,
        'timestamp', now()
    );
END;
$function$;

-- Cleanup existing auctions
DELETE FROM public.auctions WHERE status IN ('scheduled', 'live');

-- Create new test auction
DO $$
DECLARE
    v_auction_id UUID;
    v_product_id UUID;
BEGIN
    -- Get iPhone 16 Pro Max
    SELECT id INTO v_product_id FROM public.products WHERE name LIKE '%iPhone 16 Pro Max%' LIMIT 1;
    
    -- Fallback if not found
    IF v_product_id IS NULL THEN
        SELECT id INTO v_product_id FROM public.products LIMIT 1;
    END IF;

    -- Insert auction starting in 2 minutes
    INSERT INTO public.auctions (
        product_id, 
        start_time, 
        timer_duration, 
        status, 
        current_price, 
        bid_count, 
        robot_enabled
    ) VALUES (
        v_product_id, 
        now() + interval '2 minutes', 
        30, 
        'scheduled', 
        0.01, 
        0, 
        true
    ) RETURNING id INTO v_auction_id;

    -- Update robot settings (trigger already created the row)
    UPDATE public.robot_settings 
    SET 
        active = true, 
        min_delay = 1, 
        max_delay = 3, 
        bid_chance = 0.95, 
        max_bids_per_robot = 1000,
        start_after_minutes = 0,
        stop_after_minutes = 10,
        dispute_duration_minutes = 10
    WHERE auction_id = v_auction_id;
END $$;
