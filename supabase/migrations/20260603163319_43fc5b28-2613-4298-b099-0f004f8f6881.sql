CREATE OR REPLACE FUNCTION public.process_robot_bids()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_auction RECORD;
    v_robot_id UUID;
    v_bid_result jsonb;
    v_bids_placed INTEGER := 0;
    v_last_bidder_is_bot BOOLEAN;
    v_time_remaining_ms FLOAT;
    v_should_bid BOOLEAN;
    v_random_val FLOAT;
    v_is_active_work_period BOOLEAN;
    v_minutes_since_start FLOAT;
    v_settings_row RECORD;
BEGIN
    FOR v_auction in 
        SELECT a.id, a.start_time, a.timer_duration, a.target_winner, a.last_bidder_id, a.end_time, a.status, a.robot_enabled, a.is_finalizing
        FROM public.auctions a
        WHERE a.status IN ('live', 'active') AND a.robot_enabled = true 
    LOOP
        SELECT * INTO v_settings_row FROM public.robot_settings WHERE auction_id = v_auction.id AND active = true FOR UPDATE SKIP LOCKED;
        IF v_settings_row.id IS NULL THEN CONTINUE; END IF;

        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        v_random_val := random();
        v_minutes_since_start := EXTRACT(EPOCH FROM (now() - v_auction.start_time)) / 60;

        v_is_active_work_period := (v_auction.is_finalizing IS FALSE OR v_auction.is_finalizing IS NULL)
                                   AND v_minutes_since_start >= COALESCE(v_settings_row.start_after_minutes, 0) 
                                   AND v_minutes_since_start <= COALESCE(v_settings_row.stop_after_minutes, 1440);

        IF v_minutes_since_start < COALESCE(v_settings_row.start_after_minutes, 0) THEN CONTINUE; END IF;
        
        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_should_bid := false;

        IF v_is_active_work_period THEN
            IF NOT v_last_bidder_is_bot THEN
                IF v_time_remaining_ms <= 4000 THEN v_should_bid := true; 
                ELSIF v_time_remaining_ms <= 8000 AND v_random_val < 0.8 THEN v_should_bid := true;
                END IF;
            ELSE
                IF v_time_remaining_ms <= 3000 THEN v_should_bid := true;
                ELSIF COALESCE(v_settings_row.inner_dispute_enabled, true) AND v_time_remaining_ms <= 8000 AND v_random_val < 0.5 THEN
                    v_should_bid := true;
                END IF;
            END IF;
        ELSE
            IF v_auction.target_winner = 'robot' AND NOT v_last_bidder_is_bot AND v_time_remaining_ms <= 3500 THEN 
                v_should_bid := true; 
            END IF;
        END IF;

        IF v_should_bid THEN
            SELECT id INTO v_robot_id FROM public.profiles WHERE is_bot = true ORDER BY random() LIMIT 1;
            IF v_robot_id IS NOT NULL THEN
                v_bid_result := public.place_bid(v_auction.id, v_robot_id);
                IF (v_bid_result->>'success')::boolean THEN
                    v_bids_placed := v_bids_placed + 1;
                    UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE id = v_settings_row.id;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'bids_placed', v_bids_placed);
END;
$function$;