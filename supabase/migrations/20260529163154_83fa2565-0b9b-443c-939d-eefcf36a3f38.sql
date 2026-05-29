-- Update process_robot_bids to use dynamic delays from robot_settings
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
    FOR v_auction in 
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
        IF v_auction.inner_dispute_enabled = true AND (v_auction.inner_dispute_end_at IS NULL OR v_auction.inner_dispute_end_at > now()) THEN
            IF v_random_val < v_auction.bid_chance THEN
                v_should_bid := true;
            END IF;
        END IF;

        -- 2. NORMAL / TARGET WINNER Logic (Robot vs Human)
        IF NOT v_should_bid THEN
            IF v_auction.target_winner = 'robot' THEN
                IF NOT v_last_bidder_is_bot THEN
                    v_should_bid := true;
                END IF;
            ELSIF v_auction.target_winner = 'user' THEN
                v_should_bid := false;
            ELSE
                -- Random chance against human
                IF NOT v_last_bidder_is_bot AND v_auction.is_finalizing = false AND v_random_val < v_auction.bid_chance THEN
                    v_should_bid := true;
                END IF;
            END IF;
        END IF;

        -- Apply timing logic using min_delay and max_delay (converted to ms)
        -- If max_delay is 5, robot can bid as soon as 5s are left.
        -- If min_delay is 1, robot won't bid if less than 1s is left.
        IF v_should_bid THEN
            IF v_time_remaining_ms > (v_auction.max_delay * 1000) OR v_time_remaining_ms < (v_auction.min_delay * 1000) THEN
                v_should_bid := false;
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

-- Ensure tick_auctions uses the current time correctly
CREATE OR REPLACE FUNCTION public.tick_auctions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_finished_count INTEGER := 0;
    v_started_count INTEGER := 0;
BEGIN
    -- 1. Start scheduled auctions that should have started
    WITH started AS (
        UPDATE public.auctions
        SET 
            status = 'live',
            -- Initialize end_time with timer_duration from now
            end_time = now() + (timer_duration || ' seconds')::interval
        WHERE status = 'scheduled' AND start_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_started_count FROM started;

    -- 2. Finish live auctions that expired
    WITH finished AS (
        UPDATE public.auctions
        SET status = 'finished'
        WHERE status = 'live' AND end_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_finished_count FROM finished;

    RETURN jsonb_build_object(
        'success', true,
        'started_count', v_started_count,
        'finished_count', v_finished_count,
        'timestamp', now()
    );
END;
$$;
