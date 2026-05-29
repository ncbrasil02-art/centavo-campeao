CREATE OR REPLACE FUNCTION public.process_robot_bids()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_auction RECORD;
    v_robot_id UUID;
    v_bid_result jsonb;
    v_bids_placed INTEGER := 0;
    v_last_bidder_is_bot BOOLEAN;
    v_time_remaining_ms FLOAT;
    v_should_bid BOOLEAN;
    v_random_val FLOAT;
    v_is_in_dispute_period BOOLEAN;
    v_seconds_since_last_robot_bid FLOAT;
    v_settings_row robot_settings%ROWTYPE;
    v_min_throttle FLOAT;
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
            a.is_finalizing,
            a.robot_enabled
        FROM public.auctions a
        WHERE a.status IN ('live', 'active') 
          AND a.robot_enabled = true 
    LOOP
        -- Lock the settings row for this auction to prevent concurrent bidding from multiple heartbeats
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

        -- DYNAMIC THROTTLING: Fast response at the end, slower elsewhere
        IF v_time_remaining_ms <= 4000 THEN
            v_min_throttle := 1.0; -- Faster response in the end
        ELSE
            v_min_throttle := 2.5; -- Slower elsewhere
        END IF;

        IF v_seconds_since_last_robot_bid < (v_min_throttle + random() * 2.0) THEN
            CONTINUE;
        END IF;
        
        -- Check if last bidder is bot
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        ELSE
            v_last_bidder_is_bot := false;
        END IF;

        v_should_bid := false;

        -- Check Work Time (Dispute Duration)
        v_is_in_dispute_period := (v_auction.start_time + (COALESCE(v_settings_row.dispute_duration_minutes, 30) || ' minutes')::interval) > now();

        -- DISTRIBUTION LOGIC: 80% in last 3s, 20% elsewhere
        IF v_time_remaining_ms <= 3000 THEN
            -- In the last 3 seconds: High chance if needed
            IF (NOT v_last_bidder_is_bot OR v_is_in_dispute_period) AND v_random_val < 0.85 THEN
                v_should_bid := true;
            END IF;
        ELSE
            -- Outside the last 3 seconds: Low chance
            IF (NOT v_last_bidder_is_bot OR v_is_in_dispute_period) AND v_random_val < (COALESCE(v_settings_row.bid_chance, 0.3) * 0.1) THEN
                v_should_bid := true;
            END IF;
        END IF;

        -- SAFETY: Ensure it doesn't end during dispute period
        IF v_is_in_dispute_period AND v_time_remaining_ms < 1500 THEN
            v_should_bid := true;
        END IF;

        -- TARGET WINNER LOGIC overrides
        IF v_auction.target_winner = 'robot' THEN
            IF NOT v_last_bidder_is_bot AND v_time_remaining_ms < 5000 THEN
                v_should_bid := true;
            END IF;
        ELSIF v_auction.target_winner = 'user' AND NOT v_is_in_dispute_period THEN
            IF v_time_remaining_ms < 5000 THEN
                v_should_bid := false;
            END IF;
        END IF;

        -- Place bid
        IF v_should_bid THEN
            SELECT id INTO v_robot_id 
            FROM public.profiles 
            WHERE is_bot = true 
              AND id != COALESCE(v_auction.last_bidder_id, '00000000-0000-0000-0000-000000000000'::uuid)
            ORDER BY random() 
            LIMIT 1;

            IF v_robot_id IS NOT NULL THEN
                v_bid_result := public.place_robot_bid(v_auction.id, v_robot_id);
                IF (v_bid_result->>'success')::boolean THEN
                    v_bids_placed := v_bids_placed + 1;
                    UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE id = v_settings_row.id;
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
$$;
