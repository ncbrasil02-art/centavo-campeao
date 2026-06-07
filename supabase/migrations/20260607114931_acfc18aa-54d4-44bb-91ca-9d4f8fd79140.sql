-- 1. Reset permissions for robot functions
REVOKE ALL ON FUNCTION public.place_robot_bid(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_robot_bids() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tick_auctions() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO anon, authenticated, service_role;

-- 2. Force start the dispute on Nintendo auction
UPDATE public.auctions 
SET 
    end_time = now() + interval '30 seconds',
    bid_count = 0,
    last_bidder_id = NULL
WHERE slug LIKE 'nintendo%';

-- 3. Ensure robot settings are correctly linked and active
UPDATE public.robot_settings
SET 
    active = true,
    inner_dispute_enabled = true,
    min_delay = 1,
    max_delay = 3,
    start_after_minutes = 0,
    stop_after_minutes = 300
WHERE auction_id IN (SELECT id FROM auctions WHERE status = 'live');

-- 4. Final version of the bidding logic - very permissive
CREATE OR REPLACE FUNCTION public.place_robot_bid(p_auction_id uuid, p_robot_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_current_price DECIMAL(10, 2);
  v_timer_duration INTEGER;
BEGIN
  -- Simple update, no checks other than status
  SELECT current_price, timer_duration INTO v_current_price, v_timer_duration
  FROM public.auctions WHERE id = p_auction_id AND status = 'live' FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Leilão não encontrado ou não está live');
  END IF;

  UPDATE public.auctions 
  SET 
    current_price = current_price + 0.01,
    bid_count = bid_count + 1,
    last_bidder_id = p_robot_id,
    end_time = now() + (v_timer_duration || ' seconds')::interval
  WHERE id = p_auction_id;

  INSERT INTO public.bids (auction_id, user_id, price_at_bid) 
  VALUES (p_auction_id, p_robot_id, v_current_price + 0.01);

  RETURN jsonb_build_object('success', true);
END;
$function$;
