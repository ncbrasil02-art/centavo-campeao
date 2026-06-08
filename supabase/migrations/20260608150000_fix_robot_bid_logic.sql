-- Fix robot bid logic:
-- 1. Inner dispute now runs throughout the configured period (not just last 4s)
-- 2. min_delay/max_delay are respected using last_robot_bid_at
-- 3. dispute_duration_minutes NULL is treated as 30 min default
-- 4. inner_dispute_end_at is now checked
-- 5. Random mode is truly random (autonomous bids, not reactive to humans)

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
    v_random_factor FLOAT;
    v_minutes_since_start FLOAT;
    v_settings RECORD;
    v_should_bid BOOLEAN;
    v_seconds_since_last_bid FLOAT;
    v_required_delay FLOAT;
    v_dispute_active BOOLEAN;
    v_effective_duration FLOAT;
BEGIN
    FOR v_auction IN
        SELECT a.id, a.timer_duration, a.last_bidder_id, a.end_time, a.start_time, a.target_winner
        FROM public.auctions a
        WHERE a.status = 'live' AND a.robot_enabled = true
    LOOP
        -- Never bid before auction starts
        IF now() < v_auction.start_time THEN
            CONTINUE;
        END IF;

        SELECT * INTO v_settings
        FROM public.robot_settings
        WHERE auction_id = v_auction.id AND active = true;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_time_remaining_ms   := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        v_random_factor       := random();
        v_minutes_since_start := EXTRACT(EPOCH FROM (now() - v_auction.start_time)) / 60.0;

        -- Respect start_after_minutes
        IF v_minutes_since_start < COALESCE(v_settings.start_after_minutes, 0) THEN
            CONTINUE;
        END IF;

        -- Effective duration: use dispute_duration_minutes, fallback to 30
        v_effective_duration := COALESCE(v_settings.dispute_duration_minutes, 30);

        v_should_bid := false;

        -- ================================================================
        -- MODE A: ROBOT VS ROBOT  (inner_dispute_enabled = true)
        -- Robots bid autonomously throughout the configured window,
        -- respecting min_delay/max_delay. After the window they stop
        -- and the last bid's countdown expires normally → auction ends.
        -- ================================================================
        IF COALESCE(v_settings.inner_dispute_enabled, false) THEN

            -- Determine if the dispute window is still open
            IF v_settings.inner_dispute_end_at IS NOT NULL THEN
                v_dispute_active := now() < v_settings.inner_dispute_end_at;
            ELSE
                v_dispute_active := v_minutes_since_start <= v_effective_duration;
            END IF;

            IF v_dispute_active THEN
                -- How many seconds since any robot last bid in this auction?
                v_seconds_since_last_bid := COALESCE(
                    EXTRACT(EPOCH FROM (now() - v_settings.last_robot_bid_at)),
                    9999
                );

                -- Pick a random required delay within [min_delay, max_delay]
                v_required_delay := COALESCE(v_settings.min_delay, 3)
                    + v_random_factor
                    * (COALESCE(v_settings.max_delay, 12) - COALESCE(v_settings.min_delay, 3));

                IF v_seconds_since_last_bid >= v_required_delay THEN
                    v_should_bid := true;
                END IF;
            END IF;

            -- In inner_dispute mode skip all normal bidding logic below
            IF v_should_bid THEN
                SELECT id INTO v_robot_id
                FROM public.profiles
                WHERE is_bot = true
                  AND id != COALESCE(v_auction.last_bidder_id, '00000000-0000-0000-0000-000000000000'::uuid)
                ORDER BY random() LIMIT 1;

                IF v_robot_id IS NOT NULL THEN
                    v_bid_result := public.place_bid(v_auction.id, v_robot_id);
                    IF (v_bid_result->>'success')::boolean THEN
                        v_bids_placed := v_bids_placed + 1;
                        UPDATE public.robot_settings
                        SET last_robot_bid_at = now()
                        WHERE id = v_settings.id;
                    END IF;
                END IF;
            END IF;

            CONTINUE; -- Always skip normal logic in inner_dispute mode
        END IF;

        -- ================================================================
        -- MODES B/C/D: Normal bidding (target_winner: robot / user / random)
        -- ================================================================

        -- Stop if global time limit has been reached
        IF v_minutes_since_start > v_effective_duration OR
           (v_settings.stop_after_minutes IS NOT NULL AND v_minutes_since_start > v_settings.stop_after_minutes)
        THEN
            -- Exception: if target is 'robot' and a human is currently winning,
            -- do one final cover so the robot takes back the lead before stopping.
            IF v_auction.target_winner = 'robot' AND v_auction.last_bidder_id IS NOT NULL THEN
                SELECT is_bot INTO v_last_bidder_is_bot
                FROM public.profiles WHERE id = v_auction.last_bidder_id;
                IF NOT COALESCE(v_last_bidder_is_bot, true) THEN
                    v_should_bid := true;
                END IF;
            END IF;

            IF NOT v_should_bid THEN CONTINUE; END IF;
        END IF;

        -- Who bid last?
        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot
            FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        -- Delay since last robot bid (used by random mode)
        v_seconds_since_last_bid := COALESCE(
            EXTRACT(EPOCH FROM (now() - v_settings.last_robot_bid_at)),
            9999
        );

        IF v_auction.target_winner = 'robot' THEN
            -- Aggressively cover every human bid
            IF NOT v_last_bidder_is_bot THEN
                IF v_time_remaining_ms <= 5000
                   OR v_time_remaining_ms <= (v_auction.timer_duration * 1000 * 0.8) THEN
                    v_should_bid := true;
                END IF;
            END IF;

        ELSIF v_auction.target_winner = 'user' THEN
            -- Occasional early bids to simulate activity; back off so user wins
            IF NOT v_last_bidder_is_bot
               AND v_time_remaining_ms > 10000
               AND v_random_factor < 0.25 THEN
                v_should_bid := true;
            END IF;

        ELSE
            -- RANDOM: autonomous bids at random intervals regardless of who bid last.
            -- Respects min_delay/max_delay; only bids while humans are active or in
            -- the first 2 minutes; backs off in the final 10 s so the human can win.
            v_required_delay := COALESCE(v_settings.min_delay, 5)
                + v_random_factor
                * (COALESCE(v_settings.max_delay, 15) - COALESCE(v_settings.min_delay, 5));

            IF v_seconds_since_last_bid >= v_required_delay THEN
                -- Only bid if humans are active or auction just started
                IF v_minutes_since_start <= 2
                   OR EXISTS (
                       SELECT 1 FROM public.bids b
                       JOIN public.profiles p ON p.id = b.user_id
                       WHERE b.auction_id = v_auction.id
                         AND p.is_bot = false
                         AND b.created_at > now() - interval '5 minutes'
                   )
                THEN
                    -- Back off in final 10 s when a human is winning
                    IF v_last_bidder_is_bot OR v_time_remaining_ms > 10000 THEN
                        v_should_bid := true;
                    END IF;
                END IF;
            END IF;
        END IF;

        IF v_should_bid THEN
            SELECT id INTO v_robot_id
            FROM public.profiles
            WHERE is_bot = true
              AND id != COALESCE(v_auction.last_bidder_id, '00000000-0000-0000-0000-000000000000'::uuid)
            ORDER BY random() LIMIT 1;

            IF v_robot_id IS NOT NULL THEN
                v_bid_result := public.place_bid(v_auction.id, v_robot_id);
                IF (v_bid_result->>'success')::boolean THEN
                    v_bids_placed := v_bids_placed + 1;
                    UPDATE public.robot_settings
                    SET last_robot_bid_at = now()
                    WHERE id = v_settings.id;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'bids_placed', v_bids_placed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO authenticated, service_role;
