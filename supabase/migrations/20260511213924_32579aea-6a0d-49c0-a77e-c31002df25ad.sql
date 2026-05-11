-- Add target_winner column
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS target_winner TEXT DEFAULT 'random' CHECK (target_winner IN ('robot', 'user', 'random'));

-- Update place_bid: Allow bidding always, even if is_finalizing
-- is_finalizing will now just be a flag for the UI and robot behavior
CREATE OR REPLACE FUNCTION public.place_bid(p_auction_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $function$
DECLARE
  v_current_price DECIMAL(10, 2);
  v_bid_balance INTEGER;
  v_auction_status TEXT;
  v_end_time TIMESTAMP WITH TIME ZONE;
  v_timer_duration INTEGER;
  v_bid_cost INTEGER := 1;
BEGIN
  -- 1. Check auction status and time
  SELECT status, current_price, end_time, timer_duration
  INTO v_auction_status, v_current_price, v_end_time, v_timer_duration
  FROM public.auctions 
  WHERE id = p_auction_id
  FOR UPDATE;
  
  IF v_auction_status != 'live' THEN
    RETURN jsonb_build_object('success', false, 'message', 'O leilão não está ativo.');
  END IF;

  IF v_end_time <= now() THEN
    UPDATE public.auctions SET status = 'finished' WHERE id = p_auction_id;
    RETURN jsonb_build_object('success', false, 'message', 'O leilão já encerrou.');
  END IF;

  -- 2. Check user balance
  SELECT bid_balance INTO v_bid_balance 
  FROM public.profiles 
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF v_bid_balance < v_bid_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Saldo de lances insuficiente.');
  END IF;

  -- 3. Deduct balance
  UPDATE public.profiles 
  SET bid_balance = bid_balance - v_bid_cost 
  WHERE id = p_user_id;

  -- 4. Update auction
  UPDATE public.auctions 
  SET 
    current_price = current_price + 0.01,
    bid_count = bid_count + 1,
    last_bidder_id = p_user_id,
    -- Reset timer to full duration
    end_time = now() + (v_timer_duration || ' seconds')::interval
  WHERE id = p_auction_id;

  -- 5. Record bid
  INSERT INTO public.bids (auction_id, user_id, price_at_bid) 
  VALUES (p_auction_id, p_user_id, v_current_price + 0.01);

  RETURN jsonb_build_object('success', true, 'new_price', v_current_price + 0.01);
END;
$function$;

-- Update place_robot_bid
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
  IF NOT v_is_bot THEN
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

-- Aggressive and natural robot logic
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
        SELECT a.id, s.min_delay, s.max_delay, s.bid_chance, a.timer_duration, a.target_winner, a.last_bidder_id, a.end_time
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
            IF NOT v_last_bidder_is_bot AND v_time_remaining_ms < (v_auction.timer_duration * 1000) AND random() < v_auction.bid_chance THEN
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