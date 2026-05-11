CREATE OR REPLACE FUNCTION public.process_robot_bids()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auction RECORD;
    v_robot_id UUID;
    v_bid_result jsonb;
    v_bids_placed INTEGER := 0;
    v_last_bidder_is_bot BOOLEAN;
    v_time_remaining_ms FLOAT;
BEGIN
    FOR v_auction IN 
        SELECT a.id, s.min_delay, s.max_delay, s.bid_chance, a.timer_duration, a.target_winner, a.last_bidder_id, a.end_time, a.is_finalizing
        FROM public.auctions a
        JOIN public.robot_settings s ON a.id = s.auction_id
        WHERE a.status = 'live' 
          AND a.robot_enabled = true 
          AND s.active = true
    LOOP
        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        
        -- Check if last bidder is bot
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        ELSE
            v_last_bidder_is_bot := false;
        END IF;

        -- 1. FORCE ROBOT WIN
        IF v_auction.target_winner = 'robot' THEN
            -- If last bidder is NOT a bot and time is low (< 5s), bid aggressively
            -- Even if is_finalizing is true, if we WANT the robot to win, it should bid
            IF NOT v_last_bidder_is_bot AND v_time_remaining_ms < 5000 THEN
                -- Select robot
                SELECT id INTO v_robot_id FROM public.profiles WHERE is_bot = true ORDER BY random() LIMIT 1;
                IF v_robot_id IS NOT NULL THEN
                    v_bid_result := public.place_robot_bid(v_auction.id, v_robot_id);
                    IF (v_bid_result->>'success')::boolean THEN
                        v_bids_placed := v_bids_placed + 1;
                    END IF;
                END IF;
            END IF;
        
        -- 2. FORCE USER WIN
        ELSIF v_auction.target_winner = 'user' THEN
            -- Do nothing, let humans win
            NULL;

        -- 3. RANDOM/NORMAL (bid chance based)
        ELSE
            -- Bid if time is low and random chance hits
            -- But STOP bidding if is_finalizing is true
            IF NOT v_last_bidder_is_bot AND v_auction.is_finalizing = false AND v_time_remaining_ms < (v_auction.timer_duration * 1000) AND random() < v_auction.bid_chance THEN
                SELECT id INTO v_robot_id FROM public.profiles WHERE is_bot = true ORDER BY random() LIMIT 1;
                IF v_robot_id IS NOT NULL THEN
                    v_bid_result := public.place_robot_bid(v_auction.id, v_robot_id);
                    IF (v_bid_result->>'success')::boolean THEN
                        v_bids_placed := v_bids_placed + 1;
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
$$;