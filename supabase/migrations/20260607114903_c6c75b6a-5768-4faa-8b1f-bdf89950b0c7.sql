-- 1. Explicitly set search_path and permissions for all robot-related functions
ALTER FUNCTION public.place_robot_bid(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.process_robot_bids() SET search_path = public;
ALTER FUNCTION public.tick_auctions() SET search_path = public;

-- 2. Grant execute to all roles so Heartbeat (even for anonymous users) can trigger the logic
GRANT EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO anon, authenticated, service_role;

-- 3. Ensure profiles table allows reading bot status for everyone
CREATE POLICY "Bot profiles are viewable by everyone" ON public.profiles
FOR SELECT TO anon, authenticated
USING (is_bot = true);

-- 4. Final check on the function logic to remove any session dependencies
CREATE OR REPLACE FUNCTION public.place_robot_bid(p_auction_id uuid, p_robot_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
