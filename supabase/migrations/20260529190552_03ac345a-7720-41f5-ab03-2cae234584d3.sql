-- Add dispute_duration_minutes to robot_settings
ALTER TABLE public.robot_settings ADD COLUMN IF NOT EXISTS dispute_duration_minutes INTEGER DEFAULT 30;

-- Add confirmed_at to auctions
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Drop and recreate view to avoid column order issues
DROP VIEW IF EXISTS public.v_home_live_auctions;

CREATE OR REPLACE VIEW public.v_home_live_auctions AS
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
    a.target_winner,
    a.confirmed_at,
    jsonb_build_object('id', p.id, 'name', p.name, 'market_value', p.market_value, 'images', p.images) AS product,
        CASE
            WHEN (prof.id IS NOT NULL) THEN jsonb_build_object('id', prof.id, 'username', prof.username, 'avatar_url', prof.avatar_url)
            ELSE NULL::jsonb
        END AS last_bidder
   FROM ((auctions a
     JOIN products p ON ((a.product_id = p.id)))
     LEFT JOIN profiles prof ON ((a.last_bidder_id = prof.id)))
  WHERE (a.status = ANY (ARRAY['live'::text, 'scheduled'::text, 'pending_audit'::text, 'confirmed'::text]));

GRANT SELECT ON public.v_home_live_auctions TO anon, authenticated, service_role;

-- Function to confirm winner
CREATE OR REPLACE FUNCTION public.confirm_auction_winner(p_auction_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $$
 BEGIN
    -- Check if user is admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Apenas administradores podem confirmar ganhadores.');
    END IF;

    UPDATE public.auctions 
    SET 
        status = 'confirmed',
        confirmed_at = now()
    WHERE id = p_auction_id AND status = 'pending_audit';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Leilão não encontrado ou já processado.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Ganhador confirmado com sucesso!');
 END;
 $$;

-- Update tick_auctions
CREATE OR REPLACE FUNCTION public.tick_auctions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
    v_pending_count INTEGER := 0;
    v_started_count INTEGER := 0;
    v_finished_count INTEGER := 0;
BEGIN
    -- 1. Start scheduled auctions
    WITH started AS (
        UPDATE public.auctions
        SET 
            status = 'live',
            end_time = now() + (timer_duration || ' seconds')::interval
        WHERE status = 'scheduled' AND start_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_started_count FROM started;

    -- 2. Move expired live to pending_audit
    WITH pending AS (
        UPDATE public.auctions
        SET status = 'pending_audit'
        WHERE status = 'live' AND end_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_pending_count FROM pending;

    -- 3. Move confirmed to finished after 5 minutes
    WITH finished AS (
        UPDATE public.auctions
        SET status = 'finished'
        WHERE status = 'confirmed' AND confirmed_at <= now() - interval '5 minutes'
        RETURNING id
    )
    SELECT count(*) INTO v_finished_count FROM finished;

    RETURN jsonb_build_object(
        'success', true,
        'started_count', v_started_count,
        'pending_count', v_pending_count,
        'finished_count', v_finished_count,
        'timestamp', now()
    );
END;
$$;

-- Update process_robot_bids to respect dispute_duration
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
BEGIN
    FOR v_auction in 
        SELECT 
            a.id, 
            a.start_time,
            s.min_delay, 
            s.max_delay, 
            s.bid_chance, 
            s.dispute_duration_minutes,
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

        -- Check dispute duration
        v_is_in_dispute_period := (v_auction.start_time + (COALESCE(v_auction.dispute_duration_minutes, 30) || ' minutes')::interval) > now();

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
            ELSIF v_auction.target_winner = 'user' AND NOT v_is_in_dispute_period THEN
                -- If target is user and dispute period is over, robot stops
                v_should_bid := false;
            ELSE
                -- Random chance against human OR Enforced dispute
                IF NOT v_last_bidder_is_bot THEN
                    IF v_is_in_dispute_period THEN
                        -- During dispute period, robot ALWAYS tries to outbid human if time is low
                        IF v_time_remaining_ms < 5000 OR v_random_val < GREATEST(v_auction.bid_chance, 0.7) THEN
                            v_should_bid := true;
                        END IF;
                    ELSIF v_auction.is_finalizing = false AND v_random_val < v_auction.bid_chance THEN
                        v_should_bid := true;
                    END IF;
                END IF;
            END IF;
        END IF;

        -- Apply timing logic
        IF v_should_bid THEN
            IF v_time_remaining_ms > (v_auction.max_delay * 1000) OR v_time_remaining_ms < (v_auction.min_delay * 1000) THEN
                v_should_bid := false;
            END IF;
        END IF;

        -- Place bid
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