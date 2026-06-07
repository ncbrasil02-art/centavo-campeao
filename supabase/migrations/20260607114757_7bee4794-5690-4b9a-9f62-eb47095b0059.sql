-- 1. Remove security check from place_robot_bid to allow automation
CREATE OR REPLACE FUNCTION public.place_robot_bid(p_auction_id uuid, p_robot_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_price DECIMAL(10, 2);
  v_auction_status TEXT;
  v_end_time TIMESTAMP WITH TIME ZONE;
  v_timer_duration INTEGER;
  v_is_bot BOOLEAN;
BEGIN
  -- Verify bot
  SELECT is_bot INTO v_is_bot FROM public.profiles WHERE id = p_robot_id;
  IF NOT COALESCE(v_is_bot, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este usuário não é um robô.');
  END IF;

  -- Check status
  SELECT status, current_price, end_time, timer_duration
  INTO v_auction_status, v_current_price, v_end_time, v_timer_duration
  FROM public.auctions 
  WHERE id = p_auction_id
  FOR UPDATE;
  
  IF v_auction_status != 'live' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Leilão inativo.');
  END IF;

  IF v_end_time <= now() THEN
    UPDATE public.auctions SET status = 'finished' WHERE id = p_auction_id;
    RETURN jsonb_build_object('success', false, 'message', 'Leilão expirado.');
  END IF;

  -- Update auction
  UPDATE public.auctions 
  SET 
    current_price = current_price + 0.01,
    bid_count = bid_count + 1,
    last_bidder_id = p_robot_id,
    end_time = now() + (v_timer_duration || ' seconds')::interval
  WHERE id = p_auction_id;

  -- Record bid
  INSERT INTO public.bids (auction_id, user_id, price_at_bid) 
  VALUES (p_auction_id, p_robot_id, v_current_price + 0.01);

  RETURN jsonb_build_object('success', true, 'new_price', v_current_price + 0.01);
END;
$function$;

-- 2. Improve process_robot_bids logic
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
    v_random_factor FLOAT;
    v_minutes_since_start FLOAT;
    v_settings RECORD;
    v_should_bid BOOLEAN;
BEGIN
    FOR v_auction IN 
        SELECT a.id, a.timer_duration, a.last_bidder_id, a.end_time, a.start_time, a.target_winner
        FROM public.auctions a
        WHERE a.status = 'live' AND a.robot_enabled = true 
    LOOP
        -- Basic checks
        IF now() < v_auction.start_time THEN CONTINUE; END IF;

        SELECT * INTO v_settings FROM public.robot_settings WHERE auction_id = v_auction.id AND active = true;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        v_random_factor := random();
        v_minutes_since_start := EXTRACT(EPOCH FROM (now() - v_auction.start_time)) / 60;

        -- Time window checks
        IF v_minutes_since_start < COALESCE(v_settings.start_after_minutes, 0) THEN CONTINUE; END IF;

        IF (v_settings.stop_after_minutes IS NOT NULL AND v_minutes_since_start > v_settings.stop_after_minutes) THEN
            -- If time is up, only bid if target was robot and we are losing
            IF v_auction.target_winner = 'robot' THEN
                 SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
                 IF COALESCE(v_last_bidder_is_bot, false) THEN CONTINUE; END IF;
            ELSE
                CONTINUE;
            END IF;
        END IF;

        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_should_bid := false;

        -- 1. Disputa contra HUMANO
        IF v_auction.target_winner = 'robot' THEN
            -- Robô DEVE cobrir lance humano
            IF NOT v_last_bidder_is_bot THEN
                IF v_time_remaining_ms <= 8000 THEN -- Aumentado para 8s para garantir
                    v_should_bid := true;
                END IF;
            END IF;
        ELSIF v_auction.target_winner = 'user' THEN
            -- Robô para de dar lances se o tempo estiver baixo
            IF NOT v_last_bidder_is_bot AND v_time_remaining_ms <= 10000 THEN
                v_should_bid := false;
            ELSIF NOT v_last_bidder_is_bot AND v_random_factor < 0.2 THEN
                v_should_bid := true;
            END IF;
        ELSE
            -- Aleatório
            IF NOT v_last_bidder_is_bot THEN
                IF v_time_remaining_ms <= 4000 OR (v_time_remaining_ms <= 12000 AND v_random_factor < 0.5) THEN
                    v_should_bid := true;
                END IF;
            END IF;
        END IF;

        -- 2. DISPUTA INTERNA (Robô contra Robô)
        IF NOT v_should_bid AND COALESCE(v_settings.inner_dispute_enabled, false) AND v_auction.target_winner != 'user' THEN
            -- Disputam se o tempo estiver baixo ou se ninguém deu lance ainda
            IF v_time_remaining_ms <= 6000 OR v_auction.last_bidder_id IS NULL THEN
                v_should_bid := true;
            END IF;
        END IF;

        -- 3. EXECUTION
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
                    UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE id = v_settings.id;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'bids_placed', v_bids_placed, 'timestamp', now());
END;
$function$;

-- 3. Fix the current Nintendo auction by extending its time
UPDATE auctions 
SET end_time = now() + interval '300 seconds'
WHERE status = 'live' AND slug LIKE 'nintendo%';

-- 4. Try to enable pg_cron if available (Supabase standard)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('tick-auctions-job', '* * * * * *', 'SELECT public.tick_auctions()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Do nothing if pg_cron is not enabled or permission denied
END $$;
