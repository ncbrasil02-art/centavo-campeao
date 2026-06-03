-- 1. Update v_home_live_auctions to remove target_winner
DROP VIEW IF EXISTS public.v_home_live_auctions;
CREATE VIEW public.v_home_live_auctions AS
 SELECT a.id,
    a.current_price,
    a.bid_count,
    a.start_time,
    a.end_time,
    a.status,
    a.robot_enabled,
    a.product_id,
    a.timer_duration,
    a.is_finalizing,
    a.confirmed_at,
    a.modality,
    a.min_balance_required,
    jsonb_build_object('id', p.id, 'name', p.name, 'market_value', p.market_value, 'images', p.images) AS product,
        CASE
            WHEN (prof.id IS NOT NULL) THEN jsonb_build_object('id', prof.id, 'username', prof.username, 'avatar_url', prof.avatar_url)
            ELSE NULL::jsonb
        END AS last_bidder
   FROM ((auctions a
     JOIN products p ON ((a.product_id = p.id)))
     LEFT JOIN profiles prof ON ((a.last_bidder_id = prof.id)))
  WHERE (a.status = ANY (ARRAY['live'::text, 'scheduled'::text, 'pending_audit'::text, 'confirmed'::text]));

-- 2. Update v_home_recent_winners to remove full_name
DROP VIEW IF EXISTS public.v_home_recent_winners;
CREATE VIEW public.v_home_recent_winners AS
 SELECT w.id,
    w.final_price,
    w.savings_percentage,
    w.created_at,
    jsonb_build_object('username', prof.username, 'avatar_url', prof.avatar_url) AS profile,
    jsonb_build_object('product', jsonb_build_object('name', p.name, 'image', p.images[1])) AS auction
   FROM (((winners w
     JOIN profiles prof ON ((w.user_id = prof.id)))
     JOIN auctions a ON ((w.auction_id = a.id)))
     JOIN products p ON ((a.product_id = p.id)));

-- 3. Update v_user_ranking to remove full_name
DROP VIEW IF EXISTS public.v_user_ranking;
CREATE VIEW public.v_user_ranking AS
 SELECT p.id AS user_id,
    p.username,
    p.avatar_url,
    count(w.id) AS total_wins,
    COALESCE(sum(w.savings_percentage), (0)::numeric) AS total_savings_sum,
        CASE
            WHEN (count(w.id) > 0) THEN (sum(w.savings_percentage) / (count(w.id))::numeric)
            ELSE (0)::numeric
        END AS avg_savings
   FROM (profiles p
     LEFT JOIN winners w ON ((p.id = w.user_id)))
  WHERE ((p.is_bot = false) OR (p.is_bot IS NULL))
  GROUP BY p.id, p.username, p.avatar_url
 HAVING (count(w.id) > 0)
  ORDER BY (count(w.id)) DESC;

-- 4. Fix process_robot_bids to be SECURITY DEFINER and allow authenticated users
CREATE OR REPLACE FUNCTION public.process_robot_bids()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    v_settings_row RECORD;
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
            a.status,
            a.robot_enabled,
            a.is_finalizing
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
        v_is_active_work_period := (v_auction.is_finalizing IS FALSE OR v_auction.is_finalizing IS NULL)
                                   AND v_minutes_since_start >= COALESCE(v_settings_row.start_after_minutes, 0) 
                                   AND v_minutes_since_start <= COALESCE(v_settings_row.stop_after_minutes, 1440);

        -- If not yet time to start, skip
        IF v_minutes_since_start < COALESCE(v_settings_row.start_after_minutes, 0) THEN
            CONTINUE;
        END IF;
        
        -- Check if last bidder is bot
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        ELSE
            v_last_bidder_is_bot := false;
        END IF;

        v_should_bid := false;

        -- DECISION LOGIC
        IF v_is_active_work_period THEN
            IF NOT v_last_bidder_is_bot THEN
                IF v_time_remaining_ms <= 3000 THEN
                    v_should_bid := true; 
                ELSIF v_time_remaining_ms <= 8000 THEN
                    IF v_random_val < 0.8 THEN v_should_bid := true; END IF; 
                ELSE
                    IF v_random_val < 0.2 THEN v_should_bid := true; END IF; 
                END IF;
            ELSE
                IF COALESCE(v_settings_row.inner_dispute_enabled, false) THEN
                    IF v_time_remaining_ms <= 4000 AND v_random_val < 0.4 THEN
                        v_should_bid := true;
                    END IF;
                END IF;
            END IF;
        ELSE
            IF v_auction.target_winner = 'robot' AND NOT v_last_bidder_is_bot THEN
                IF v_time_remaining_ms <= 3000 THEN v_should_bid := true; END IF;
            END IF;
        END IF;

        -- FINAL EXECUTION
        IF v_should_bid THEN
            IF v_seconds_since_last_robot_bid >= 0.8 THEN
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
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'bids_placed', v_bids_placed,
        'timestamp', now()
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO service_role;
