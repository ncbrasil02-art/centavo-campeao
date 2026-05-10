-- Database function for placing a bid
CREATE OR REPLACE FUNCTION public.place_bid(p_auction_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to check balance and update auction
AS $$
DECLARE
  v_current_price DECIMAL(10, 2);
  v_bid_balance INTEGER;
  v_auction_status TEXT;
  v_bid_cost INTEGER := 1;
BEGIN
  -- 1. Check auction status
  SELECT status, current_price INTO v_auction_status, v_current_price 
  FROM public.auctions 
  WHERE id = p_auction_id;
  
  IF v_auction_status != 'live' THEN
    RETURN jsonb_build_object('success', false, 'message', 'O leilão não está ativo.');
  END IF;

  -- 2. Check user balance
  SELECT bid_balance INTO v_bid_balance 
  FROM public.profiles 
  WHERE id = p_user_id;
  
  IF v_bid_balance < v_bid_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Saldo de lances insuficiente.');
  END IF;

  -- 3. Deduct balance
  UPDATE public.profiles 
  SET bid_balance = bid_balance - v_bid_cost 
  WHERE id = p_user_id;

  -- 4. Update auction (price increases by 0.01)
  UPDATE public.auctions 
  SET 
    current_price = current_price + 0.01,
    bid_count = bid_count + 1,
    last_bidder_id = p_user_id,
    end_time = CASE 
      WHEN (end_time - now()) < interval '15 seconds' THEN now() + interval '15 seconds'
      ELSE end_time
    END
  WHERE id = p_auction_id;

  -- 5. Record bid
  INSERT INTO public.bids (auction_id, user_id, price_at_bid) 
  VALUES (p_auction_id, p_user_id, v_current_price + 0.01);

  RETURN jsonb_build_object('success', true, 'new_price', v_current_price + 0.01);
END;
$$;
