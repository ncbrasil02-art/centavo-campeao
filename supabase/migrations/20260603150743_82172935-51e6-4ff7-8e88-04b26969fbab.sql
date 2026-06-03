CREATE OR REPLACE FUNCTION public.process_robot_bids()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
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
    v_seconds_since_last_robot_bid FLOAT;
    v_settings_row RECORD;
    v_min_delay FLOAT;
BEGIN
    -- Iterate through live/active auctions that have robot enabled
    FOR v_auction in 
        SELECT 
            a.id, 
            a.start_time,
            a.timer_duration, 
            a.target_winner, 
            a.last_bidder_id, 
            a.end_time, 
            a.status,
            a.robot_enabled,
            a.is_finalizing
        FROM public.auctions a
        WHERE a.status IN ('live', 'active') 
          AND a.robot_enabled = true 
    LOOP
        -- Lock the settings row for this auction
        SELECT * INTO v_settings_row 
        FROM public.robot_settings 
        WHERE auction_id = v_auction.id 
          AND active = true
        FOR UPDATE SKIP LOCKED;

        -- If no active settings or couldn't get lock, skip
        IF v_settings_row.id IS NULL THEN
            CONTINUE;
        END IF;

        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        v_random_val := random();
        v_seconds_since_last_robot_bid := EXTRACT(EPOCH FROM (now() - COALESCE(v_settings_row.last_robot_bid_at, '1970-01-01'::timestamp)));
        v_minutes_since_start := EXTRACT(EPOCH FROM (now() - v_auction.start_time)) / 60;

        -- Determine if we are in the "active work" period
        v_is_active_work_period := (v_auction.is_finalizing IS FALSE OR v_auction.is_finalizing IS NULL)
                                   AND v_minutes_since_start >= COALESCE(v_settings_row.start_after_minutes, 0) 
                                   AND v_minutes_since_start <= COALESCE(v_settings_row.stop_after_minutes, 1440);

        -- If not yet time to start, skip
        IF v_minutes_since_start < COALESCE(v_settings_row.start_after_minutes, 0) THEN
            CONTINUE;
        END IF;
        
        -- Check if last bidder is bot
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        ELSE
            v_last_bidder_is_bot := false;
        END IF;

        v_should_bid := false;

        -- DECISION LOGIC
        IF v_is_active_work_period THEN
            -- DURING WORK PERIOD: We want to keep the auction ALIVE
            IF NOT v_last_bidder_is_bot THEN
                -- If last bidder is human, bid aggressively to keep it alive
                IF v_time_remaining_ms <= 3000 THEN
                    v_should_bid := true; 
                ELSIF v_time_remaining_ms <= 8000 THEN
                    IF v_random_val < 0.8 THEN v_should_bid := true; END IF; 
                ELSE
                    IF v_random_val < 0.2 THEN v_should_bid := true; END IF; 
                END IF;
            ELSE
                -- If last bidder IS bot, we STILL bid if timer is very low 
                -- to ensure the auction doesn't end before the work period expires.
                IF v_time_remaining_ms <= 2500 THEN
                    v_should_bid := true;
                ELSIF COALESCE(v_settings_row.inner_dispute_enabled, false) THEN
                    -- Normal dispute logic
                    IF v_time_remaining_ms <= 8000 AND v_random_val < 0.4 THEN
                        v_should_bid := true;
                    END IF;
                END IF;
            END IF;
        ELSE
            -- OUTSIDE WORK PERIOD: Only bid if target winner is robot and last bidder is NOT a bot
            IF v_auction.target_winner = 'robot' AND NOT v_last_bidder_is_bot THEN
                IF v_time_remaining_ms <= 3500 THEN 
                    v_should_bid := true; 
                END IF;
            END IF;
        END IF;

        -- FINAL EXECUTION
        IF v_should_bid THEN
            -- Respect minimum delay if set, unless the timer is CRITICALLY low (< 2s)
            v_min_delay := COALESCE(v_settings_row.min_delay, 0.8);
            
            IF v_time_remaining_ms > 2000 AND v_seconds_since_last_robot_bid < v_min_delay THEN
                v_should_bid := false;
            END IF;

            IF v_should_bid THEN
                -- Pick a random robot that isn't the last bidder
                SELECT id INTO v_robot_id 
                FROM public.profiles 
                WHERE is_bot = true 
                  AND id != COALESCE(v_auction.last_bidder_id, '00000000-0000-0000-0000-000000000000'::uuid)
                ORDER BY random() 
                LIMIT 1;

                IF v_robot_id IS NOT NULL THEN
                    -- Execute the bid
                    v_bid_result := public.place_robot_bid(v_auction.id, v_robot_id);
                    IF (v_bid_result->>'success')::boolean THEN
                        v_bids_placed := v_bids_placed + 1;
                        UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE id = v_settings_row.id;
                    END IF;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'bids_placed', v_bids_placed,
        'timestamp', now()
    );
END;
$function$;