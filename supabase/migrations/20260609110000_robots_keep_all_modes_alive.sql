-- Keep robots bidding for the full configured time in ALL modes, not only robot-vs-robot.
--
-- Before: in non-inner-dispute auctions the robots were reactive to humans, so with
-- nobody online a 'random' auction stopped after ~2 min and a 'robot'/'user' auction
-- stopped after a single bot bid. Per product requirement, robots must keep the
-- auction alive until the configured duration in every mode.
--
-- After (within the dispute window [start_time, start_time + dispute_duration_minutes]):
--   * target_winner = 'robot'  : cover any human (as before) AND keep alive when a bot
--                                is leading -> robot sustains and wins.
--   * target_winner = 'random' : keep alive throughout, paced by min/max delay and
--                                forced before the countdown expires, regardless of
--                                whether humans are online.
--   * target_winner = 'user'   : keep alive while a bot/nobody leads; if a REAL human
--                                is currently leading, step back so they win.
-- After the window, robots stop and the last countdown expires -> auction finalizes.
-- Every mode also forces a bid before timer expiry, so a mis-set max_delay (e.g. 500s
-- on a 15s timer) can no longer kill the auction.

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
    v_near_expiry BOOLEAN;
BEGIN
    FOR v_auction IN
        SELECT a.id, a.timer_duration, a.last_bidder_id, a.end_time, a.start_time, a.target_winner
        FROM public.auctions a
        WHERE a.status = 'live' AND a.robot_enabled = true
    LOOP
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

        IF v_minutes_since_start < COALESCE(v_settings.start_after_minutes, 0) THEN
            CONTINUE;
        END IF;

        v_effective_duration := COALESCE(v_settings.dispute_duration_minutes, 30);
        v_should_bid := false;

        -- Force a bid when the countdown is about to expire (keeps any mode alive
        -- even if max_delay was mis-set larger than the timer).
        v_near_expiry := v_time_remaining_ms <= GREATEST(4000, v_auction.timer_duration * 1000 * 0.4);

        -- ================================================================
        -- MODE A: ROBOT VS ROBOT  (inner_dispute_enabled = true)
        -- ================================================================
        IF COALESCE(v_settings.inner_dispute_enabled, false) THEN

            v_dispute_active := v_minutes_since_start <= v_effective_duration;

            IF v_dispute_active THEN
                v_seconds_since_last_bid := COALESCE(
                    EXTRACT(EPOCH FROM (now() - v_settings.last_robot_bid_at)),
                    9999
                );
                v_required_delay := COALESCE(v_settings.min_delay, 3)
                    + v_random_factor
                    * (COALESCE(v_settings.max_delay, 12) - COALESCE(v_settings.min_delay, 3));

                IF v_seconds_since_last_bid >= v_required_delay OR v_near_expiry THEN
                    v_should_bid := true;
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
                        UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE id = v_settings.id;
                    END IF;
                END IF;
            END IF;

            CONTINUE;
        END IF;

        -- ================================================================
        -- MODES B/C/D: target_winner robot / user / random
        -- Robots keep the auction alive for the whole window, regardless of
        -- whether any human is online.
        -- ================================================================

        -- Stop once the configured window has elapsed (one final cover allowed
        -- when target='robot' and a human is currently winning).
        IF v_minutes_since_start > v_effective_duration OR
           (v_settings.stop_after_minutes IS NOT NULL AND v_minutes_since_start > v_settings.stop_after_minutes)
        THEN
            IF v_auction.target_winner = 'robot' AND v_auction.last_bidder_id IS NOT NULL THEN
                SELECT is_bot INTO v_last_bidder_is_bot
                FROM public.profiles WHERE id = v_auction.last_bidder_id;
                IF NOT COALESCE(v_last_bidder_is_bot, true) THEN
                    v_should_bid := true;
                END IF;
            END IF;
            IF NOT v_should_bid THEN CONTINUE; END IF;
        END IF;

        -- Who is currently leading?
        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot
            FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_seconds_since_last_bid := COALESCE(
            EXTRACT(EPOCH FROM (now() - v_settings.last_robot_bid_at)),
            9999
        );
        v_required_delay := COALESCE(v_settings.min_delay, 3)
            + v_random_factor
            * (COALESCE(v_settings.max_delay, 12) - COALESCE(v_settings.min_delay, 3));

        IF v_auction.target_winner = 'robot' THEN
            IF NOT v_last_bidder_is_bot THEN
                -- Cover the human (let them lead briefly, then retake)
                IF v_time_remaining_ms <= 5000
                   OR v_time_remaining_ms <= (v_auction.timer_duration * 1000 * 0.8) THEN
                    v_should_bid := true;
                END IF;
            ELSE
                -- Bot is leading: keep the auction alive at pace / before expiry
                IF v_seconds_since_last_bid >= v_required_delay OR v_near_expiry THEN
                    v_should_bid := true;
                END IF;
            END IF;

        ELSIF v_auction.target_winner = 'user' THEN
            IF v_last_bidder_is_bot THEN
                -- Bot/nobody leading: keep alive so the auction reaches the full time
                IF v_seconds_since_last_bid >= v_required_delay OR v_near_expiry THEN
                    v_should_bid := true;
                END IF;
            ELSE
                -- A real human is leading: step back so they win (light early sim only)
                IF v_time_remaining_ms > 10000 AND v_random_factor < 0.25 THEN
                    v_should_bid := true;
                END IF;
            END IF;

        ELSE
            -- RANDOM: keep the auction alive the whole window, paced by min/max delay
            -- and forced before expiry, independent of human presence.
            IF v_seconds_since_last_bid >= v_required_delay OR v_near_expiry THEN
                v_should_bid := true;
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
                    UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE id = v_settings.id;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'bids_placed', v_bids_placed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO authenticated, service_role;
