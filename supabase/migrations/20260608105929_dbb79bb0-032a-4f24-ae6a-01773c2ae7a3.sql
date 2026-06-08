CREATE OR REPLACE FUNCTION public.place_robot_bid(p_auction_id uuid, p_robot_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_price DECIMAL(10, 2);
  v_timer_duration INTEGER;
  v_end_time TIMESTAMP WITH TIME ZONE;
  v_now TIMESTAMP WITH TIME ZONE;
BEGIN
  v_now := clock_timestamp();
  
  -- LOCK
  SELECT current_price, timer_duration, end_time INTO v_current_price, v_timer_duration, v_end_time
  FROM public.auctions WHERE id = p_auction_id AND status = 'live' FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Leilão não encontrado ou não está live');
  END IF;

  -- Se já passou do tempo, não deixa o robô dar lance
  -- Apenas retornamos falso, o tick_auctions se encarregará de finalizar o leilão no próximo passo
  IF v_end_time <= v_now THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tempo esgotado.');
  END IF;

  UPDATE public.auctions 
  SET 
    current_price = current_price + 0.01,
    bid_count = bid_count + 1,
    last_bidder_id = p_robot_id,
    end_time = v_now + (v_timer_duration || ' seconds')::interval
  WHERE id = p_auction_id;

  INSERT INTO public.bids (auction_id, user_id, price_at_bid) 
  VALUES (p_auction_id, p_robot_id, v_current_price + 0.01);

  RETURN jsonb_build_object('success', true);
END;
$function$;