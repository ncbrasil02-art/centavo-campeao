-- Add columns for inner dispute
ALTER TABLE public.robot_settings 
ADD COLUMN IF NOT EXISTS inner_dispute_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inner_dispute_end_at TIMESTAMP WITH TIME ZONE;

-- Update the process function
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
BEGIN
    FOR v_auction IN 
        SELECT 
            a.id, 
            s.min_delay, 
            s.max_delay, 
            s.bid_chance, 
            s.inner_dispute_enabled,
            s.inner_dispute_end_at,
            a.timer_duration, 
            a.target_winner, 
            a.last_bidder_id, 
            a.end_time, 
            a.is_finalizing
        FROM public.auctions a
        JOIN public.robot_settings s ON a.id = s.auction_id
        WHERE a.status = 'live' 
          AND a.robot_enabled = true 
          AND s.active = true
    LOOP
        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        v_random_val := random();
        
        -- Check if last bidder is bot
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        ELSE
            v_last_bidder_is_bot := false;
        END IF;

        v_should_bid := false;

        -- 1. INNER DISPUTE (Robot vs Robot)
        -- If inner dispute is enabled and hasn't expired, robots can bid against each other
        IF v_auction.inner_dispute_enabled = true AND (v_auction.inner_dispute_end_at IS NULL OR v_auction.inner_dispute_end_at > now()) THEN
            -- Only bid if a human is NOT the last bidder, or if we want to simulate activity
            -- In inner dispute mode, robots bid even if the last bidder was a bot
            IF v_random_val < v_auction.bid_chance THEN
                v_should_bid := true;
            END IF;
        END IF;

        -- 2. NORMAL / TARGET WINNER Logic (Robot vs Human)
        IF NOT v_should_bid THEN
            IF v_auction.target_winner = 'robot' THEN
                -- Force robot win: bid if last bidder is NOT a bot
                IF NOT v_last_bidder_is_bot THEN
                    v_should_bid := true;
                END IF;
            ELSIF v_auction.target_winner = 'user' THEN
                -- Force human win: don't bid
                v_should_bid := false;
            ELSE
                -- Random chance against human
                IF NOT v_last_bidder_is_bot AND v_auction.is_finalizing = false AND v_random_val < v_auction.bid_chance THEN
                    v_should_bid := true;
                END IF;
            END IF;
        END IF;

        -- Apply timing logic if we decided to bid
        -- 80% chance for 1-3s (1000ms - 3000ms)
        -- 20% chance for below 10s (3001ms - 10000ms)
        IF v_should_bid THEN
            IF v_random_val < 0.8 THEN
                -- 80% Case: Bid between 1s and 3s
                IF v_time_remaining_ms > 3000 OR v_time_remaining_ms < 1000 THEN
                    v_should_bid := false;
                END IF;
            ELSE
                -- 20% Case: Bid between 3s and 10s
                IF v_time_remaining_ms > 10000 OR v_time_remaining_ms < 3001 THEN
                    v_should_bid := false;
                END IF;
            END IF;
        END IF;

        -- Place bid if all conditions met
        IF v_should_bid THEN
            SELECT id INTO v_robot_id FROM public.profiles WHERE is_bot = true ORDER BY random() LIMIT 1;
            IF v_robot_id IS NOT NULL AND v_robot_id != COALESCE(v_auction.last_bidder_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
                v_bid_result := public.place_robot_bid(v_auction.id, v_robot_id);
                IF (v_bid_result->>'success')::boolean THEN
                    v_bids_placed := v_bids_placed + 1;
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
