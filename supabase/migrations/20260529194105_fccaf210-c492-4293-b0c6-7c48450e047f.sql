CREATE OR REPLACE FUNCTION public.process_robot_bids()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
BEGIN
    -- Iterate through live auctions that have robot enabled
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
        WHERE a.status = 'live' 
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

        -- THROTTLING: Space out robot bids to look human (1.5s - 3.5s)
        IF v_seconds_since_last_robot_bid < (1.5 + random() * 2) THEN
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

        -- 1. INNER DISPUTE (Robot vs Robot)
        IF v_settings_row.inner_dispute_enabled = true AND (v_settings_row.inner_dispute_end_at IS NULL OR v_settings_row.inner_dispute_end_at > now()) THEN
            IF v_last_bidder_is_bot THEN
                IF v_random_val < (v_settings_row.bid_chance * 0.5) THEN
                    v_should_bid := true;
                END IF;
            ELSE
                v_should_bid := true;
            END IF;
        END IF;

        -- 2. TARGET WINNER Logic
        IF NOT v_should_bid THEN
            IF v_auction.target_winner = 'robot' THEN
                IF v_is_in_dispute_period THEN
                    -- During work time: simulate activity
                    IF NOT v_last_bidder_is_bot AND (v_time_remaining_ms < 10000 OR v_random_val < v_settings_row.bid_chance) THEN
                        v_should_bid := true;
                    END IF;
                ELSE
                    -- WORK TIME OVER: Arrematar! (Ensure robot is last bidder, then stop)
                    -- If human is winning and time is running out (< 5s), robot takes back the lead
                    IF NOT v_last_bidder_is_bot AND v_time_remaining_ms < 5000 THEN
                        v_should_bid := true;
                    END IF;
                    -- If robot is already winning, v_should_bid stays false, allowing timer to end.
                END IF;
            ELSIF v_auction.target_winner = 'user' THEN
                -- Only bid during work time
                IF v_is_in_dispute_period THEN
                    IF NOT v_last_bidder_is_bot AND v_random_val < v_settings_row.bid_chance THEN
                        v_should_bid := true;
                    END IF;
                END IF;
                -- After work time: robot stops completely
            ELSE
                -- Random/Default behavior: mostly stops after work time
                IF v_is_in_dispute_period THEN
                    IF NOT v_last_bidder_is_bot AND v_random_val < v_settings_row.bid_chance THEN
                        v_should_bid := true;
                    END IF;
                END IF;
            END IF;
        END IF;

        -- Prevent bidding if timer just reset (unless in heated dispute period)
        IF v_should_bid AND v_time_remaining_ms > (v_auction.timer_duration * 1000 * 0.8) AND NOT v_is_in_dispute_period THEN
             v_should_bid := false;
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
