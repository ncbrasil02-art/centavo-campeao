-- Force start the specific auction that was stuck
UPDATE public.auctions 
SET status = 'live',
    end_time = now() + (COALESCE(timer_duration, 30) || ' seconds')::interval,
    start_time = now(),
    current_price = 0.01,
    bid_count = 0
WHERE id = '9f747294-e42d-4cb7-afaa-d97289fa724a';

-- Ensure robot settings are active
UPDATE public.robot_settings 
SET active = true,
    bid_chance = 0.95,
    stop_after_minutes = 10,
    start_after_minutes = 0
WHERE auction_id = '9f747294-e42d-4cb7-afaa-d97289fa724a';

-- Further refine tick_auctions for immediate transitions
CREATE OR REPLACE FUNCTION public.tick_auctions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_started_count INTEGER := 0;
    v_finished_count INTEGER := 0;
BEGIN
    -- 1. Start scheduled auctions (be slightly more aggressive with the time check)
    WITH started AS (
        UPDATE public.auctions
        SET 
            status = 'live',
            end_time = now() + (COALESCE(timer_duration, 15) || ' seconds')::interval
        WHERE status = 'scheduled' AND start_time <= (now() + interval '1 second')
        RETURNING id
    )
    SELECT count(*) INTO v_started_count FROM started;

    -- 2. Finalize expired auctions (Live -> Pending Audit)
    WITH pending AS (
        UPDATE public.auctions
        SET status = 'pending_audit'
        WHERE status = 'live' 
          AND end_time < (now() - interval '1 second')
        RETURNING id
    )
    SELECT count(*) INTO v_finished_count FROM pending;

    RETURN jsonb_build_object(
        'success', true, 
        'started', v_started_count, 
        'finished', v_finished_count,
        'timestamp', now()
    );
END;
$function$;
