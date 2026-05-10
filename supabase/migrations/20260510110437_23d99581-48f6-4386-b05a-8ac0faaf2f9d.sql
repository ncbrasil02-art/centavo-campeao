-- 1. Remove the strict foreign key to auth.users to allow robot profiles
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;

-- 2. Add is_bot flag
ALTER TABLE public.profiles ADD COLUMN is_bot BOOLEAN DEFAULT false;

-- 3. Update profiles with some robots
INSERT INTO public.profiles (id, username, city, state, bid_balance, is_bot)
VALUES 
(uuid_generate_v4(), 'Pedro_Henrique', 'São Paulo', 'SP', 9999, true),
(uuid_generate_v4(), 'Mariana_Lima', 'Curitiba', 'PR', 9999, true),
(uuid_generate_v4(), 'Lucas_Gamer', 'Rio de Janeiro', 'RJ', 9999, true),
(uuid_generate_v4(), 'Amanda_S', 'Belo Horizonte', 'MG', 9999, true),
(uuid_generate_v4(), 'Roberto_P', 'Porto Alegre', 'RS', 9999, true);

-- 4. Create a specialized function for robot bids (no auth.uid check)
CREATE OR REPLACE FUNCTION public.place_robot_bid(p_auction_id UUID, p_robot_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_price DECIMAL(10, 2);
  v_auction_status TEXT;
  v_is_bot BOOLEAN;
BEGIN
  -- Verify if it's actually a bot
  SELECT is_bot INTO v_is_bot FROM public.profiles WHERE id = p_robot_id;
  IF NOT v_is_bot THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este usuário não é um robô.');
  END IF;

  -- Check auction status
  SELECT status, current_price INTO v_auction_status, v_current_price 
  FROM public.auctions 
  WHERE id = p_auction_id;
  
  IF v_auction_status != 'live' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Leilão inativo.');
  END IF;

  -- Update auction
  UPDATE public.auctions 
  SET 
    current_price = current_price + 0.01,
    bid_count = bid_count + 1,
    last_bidder_id = p_robot_id,
    end_time = CASE 
      WHEN (end_time - now()) < interval '15 seconds' THEN now() + interval '15 seconds'
      ELSE end_time
    END
  WHERE id = p_auction_id;

  -- Record bid
  INSERT INTO public.bids (auction_id, user_id, price_at_bid) 
  VALUES (p_auction_id, p_robot_id, v_current_price + 0.01);

  RETURN jsonb_build_object('success', true, 'new_price', v_current_price + 0.01);
END;
$$;

-- Grant access to authenticated admins (for now, simplify to authenticated)
GRANT EXECUTE ON FUNCTION public.place_robot_bid(UUID, UUID) TO authenticated;
