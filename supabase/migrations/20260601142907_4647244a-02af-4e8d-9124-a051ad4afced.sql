-- Add new columns to robot_settings
ALTER TABLE public.robot_settings 
ADD COLUMN IF NOT EXISTS start_after_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stop_after_minutes INTEGER DEFAULT 30;

-- Update the process_robot_bids function with the new logic
CREATE OR REPLACE FUNCTION public.process_robot_bids()
 RETURNS jsonb
 LANGUAGE plpgsql
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
    v_settings_row robot_settings%ROWTYPE;
    v_min_throttle FLOAT;
    v_bid_chance FLOAT;
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
        v_is_active_work_period := v_minutes_since_start >= COALESCE(v_settings_row.start_after_minutes, 0) 
                                   AND v_minutes_since_start <= COALESCE(v_settings_row.stop_after_minutes, 1440);

        -- If not yet time to start, skip
        IF v_minutes_since_start < COALESCE(v_settings_row.start_after_minutes, 0) THEN
            CONTINUE;
        END IF;

        -- DYNAMIC THROTTLING
        IF v_time_remaining_ms <= 3000 THEN
            v_min_throttle := 0.8; -- Faster at the end
        ELSE
            v_min_throttle := 2.0; -- Slower elsewhere
        END IF;

        IF v_seconds_since_last_robot_bid < (v_min_throttle + random() * 1.5) THEN
            CONTINUE;
        END IF;
        
        -- Check if last bidder is bot
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        ELSE
            v_last_bidder_is_bot := false;
        END IF;

        v_should_bid := false;

        -- NEW TIMING LOGIC based on user request:
        -- Default: most bids in last 2 seconds.
        -- Some bids around 7 seconds.
        IF v_time_remaining_ms <= 2000 THEN
            -- In the last 2 seconds: High activity
            v_bid_chance := 0.85;
        ELSIF v_time_remaining_ms >= 5000 AND v_time_remaining_ms <= 8000 THEN
            -- Around 7 seconds (5-8s range): Lower activity
            v_bid_chance := 0.25;
        ELSE
            -- Other times: Minimal activity
            v_bid_chance := 0.05;
        END IF;

        -- Decision to bid based on period
        IF v_is_active_work_period THEN
            -- During Work Period: Bid against everyone
            IF (NOT v_last_bidder_is_bot OR v_random_val < 0.4) AND v_random_val < v_bid_chance THEN
                v_should_bid := true;
            END IF;
        ELSE
            -- After Work Period: 
            -- "Se houver outra pessoa real ele deixa a pessoa ganhar"
            -- So if last bidder is REAL, we DO NOT bid.
            -- If last bidder is BOT, we might bid to keep it alive OR if forced to win.
            IF v_last_bidder_is_bot AND v_random_val < (v_bid_chance * 0.5) THEN
                v_should_bid := true;
            END IF;
        END IF;

        -- OVERRIDES for target_winner
        IF v_auction.target_winner = 'robot' THEN
            -- If forced robot win, bid regardless of work period if needed
            IF NOT v_last_bidder_is_bot AND v_time_remaining_ms < 3000 THEN
                v_should_bid := true;
            END IF;
        ELSIF v_auction.target_winner = 'user' AND NOT v_is_active_work_period THEN
            -- If forced user win and work period over, strictly do not bid
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
$function$;
