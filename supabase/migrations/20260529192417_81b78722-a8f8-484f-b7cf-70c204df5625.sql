-- Add target_winner to robot_settings if it's missing (it was in auctions table before, moving it to settings for consistency or keeping it in both)
-- Actually, it's already in the auctions table based on the previous query. I'll use it from there.

-- Add last_robot_bid_at to robot_settings to prevent multiple bids in the same second
ALTER TABLE public.robot_settings ADD COLUMN IF NOT EXISTS last_robot_bid_at TIMESTAMP WITH TIME ZONE;

-- Update process_robot_bids to be more natural
CREATE OR REPLACE FUNCTION public.process_robot_bids()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
    v_is_in_dispute_period BOOLEAN;
    v_seconds_since_last_robot_bid FLOAT;
BEGIN
    FOR v_auction in 
        SELECT 
            a.id, 
            a.start_time,
            s.id as settings_id,
            s.min_delay, 
            s.max_delay, 
            s.bid_chance, 
            s.dispute_duration_minutes,
            s.inner_dispute_enabled,
            s.inner_dispute_end_at,
            s.last_robot_bid_at,
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
        v_seconds_since_last_robot_bid := EXTRACT(EPOCH FROM (now() - COALESCE(v_auction.last_robot_bid_at, '1970-01-01'::timestamp)));

        -- THROTTLING: Prevent robot bids if one was placed too recently (e.g., in the last 1.5 - 3 seconds)
        -- This makes the "bidding war" look more human.
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

        -- Check dispute duration
        v_is_in_dispute_period := (v_auction.start_time + (COALESCE(v_auction.dispute_duration_minutes, 30) || ' minutes')::interval) > now();

        -- 1. INNER DISPUTE (Robot vs Robot)
        IF v_auction.inner_dispute_enabled = true AND (v_auction.inner_dispute_end_at IS NULL OR v_auction.inner_dispute_end_at > now()) THEN
            -- Random chance for robots to outbid each other
            IF v_last_bidder_is_bot THEN
                IF v_random_val < (v_auction.bid_chance * 0.5) THEN -- Lower chance if a bot is already the winner
                    v_should_bid := true;
                END IF;
            ELSE
                v_should_bid := true; -- Always try to outbid human during inner dispute if chance hits
            END IF;
        END IF;

        -- 2. NORMAL / TARGET WINNER Logic (Robot vs Human)
        IF NOT v_should_bid THEN
            IF v_auction.target_winner = 'robot' THEN
                -- If target is robot, it MUST outbid any human
                IF NOT v_last_bidder_is_bot THEN
                    -- Only bid when time is getting low to make it look "real"
                    IF v_time_remaining_ms < 10000 OR v_random_val < 0.3 THEN
                        v_should_bid := true;
                    END IF;
                END IF;
            ELSIF v_auction.target_winner = 'user' THEN
                -- If target is user, robot only bids during dispute period
                IF v_is_in_dispute_period THEN
                    IF NOT v_last_bidder_is_bot AND v_random_val < v_auction.bid_chance THEN
                        v_should_bid := true;
                    END IF;
                ELSE
                    -- Dispute over, robot stops
                    v_should_bid := false;
                END IF;
            ELSE
                -- Default/Random behavior
                IF NOT v_last_bidder_is_bot THEN
                    IF v_is_in_dispute_period THEN
                        -- During dispute period, robot tries to outbid human
                        IF v_time_remaining_ms < 5000 OR v_random_val < v_auction.bid_chance THEN
                            v_should_bid := true;
                        END IF;
                    ELSIF v_random_val < (v_auction.bid_chance * 0.5) THEN
                        v_should_bid := true;
                    END IF;
                END IF;
            END IF;
        END IF;

        -- Apply timing delay logic (don't bid if we are too far from the end or too close, if configured)
        -- But usually we want robots to bid in the last 10 seconds.
        IF v_should_bid AND v_time_remaining_ms > (v_auction.timer_duration * 1000 * 0.8) AND NOT v_is_in_dispute_period THEN
             -- Don't bid if timer just reset and we're not in a heated dispute
             v_should_bid := false;
        END IF;

        -- Place bid
        IF v_should_bid THEN
            -- Select a random robot user that is NOT the current last bidder
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
                    -- Update last robot bid time for this auction
                    UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE id = v_auction.settings_id;
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
