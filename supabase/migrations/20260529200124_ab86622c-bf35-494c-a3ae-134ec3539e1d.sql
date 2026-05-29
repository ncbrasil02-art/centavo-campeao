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

        -- THROTTLING: Space out robot bids to look human (2s - 5s)
        -- This ensures we don't have multiple robot bids in the same second
        IF v_seconds_since_last_robot_bid < (2.0 + random() * 3.0) THEN
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
            -- In the last 3 seconds: 80% chance of a bid if needed
            -- To keep the auction alive during dispute, we bid even if last bidder is bot
            IF (NOT v_last_bidder_is_bot OR v_is_in_dispute_period) AND v_random_val < 0.75 THEN
                v_should_bid := true;
            END IF;
        ELSE
            -- Outside the last 3 seconds: 20% chance (scaled per second)
            -- We use a smaller chance here to satisfy the 80/20 distribution
            IF (NOT v_last_bidder_is_bot OR v_is_in_dispute_period) AND v_random_val < (COALESCE(v_settings_row.bid_chance, 0.3) * 0.15) THEN
                v_should_bid := true;
            END IF;
        END IF;

        -- SAFETY: Ensure it doesn't end during dispute period if we missed the chance above
        IF v_is_in_dispute_period AND v_time_remaining_ms < 1500 THEN
            v_should_bid := true;
        END IF;

        -- TARGET WINNER LOGIC overrides
        IF v_auction.target_winner = 'robot' THEN
            -- If user is winning and time is running out, robot MUST bid regardless of probability
            IF NOT v_last_bidder_is_bot AND v_time_remaining_ms < 4000 THEN
                v_should_bid := true;
            END IF;
        ELSIF v_auction.target_winner = 'user' AND NOT v_is_in_dispute_period THEN
            -- If user should win and we are out of dispute, robot stops completely when time is low
            IF v_time_remaining_ms < 5000 THEN
                v_should_bid := false;
            END IF;
        END IF;

        -- Prevent bidding if timer just reset (to avoid immediate counter-bids making it look too fast)
        IF v_should_bid AND v_time_remaining_ms > (v_auction.timer_duration * 1000 * 0.85) AND NOT v_is_in_dispute_period THEN
             v_should_bid := false;
        END IF;

        -- Place bid
        IF v_should_bid THEN
            -- Find a different robot to bid against the current last bidder
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

-- Update ensure_live_auctions_robot_settings to also include 'active' status
CREATE OR REPLACE FUNCTION public.ensure_live_auctions_robot_settings()
 RETURNS void
 LANGUAGE plpgsql
AS $$
 BEGIN
    INSERT INTO public.robot_settings (auction_id)
    SELECT id FROM public.auctions
    WHERE (status = 'live' OR status = 'active')
    AND NOT EXISTS (SELECT 1 FROM public.robot_settings WHERE auction_id = public.auctions.id);
 END;
 $$;
