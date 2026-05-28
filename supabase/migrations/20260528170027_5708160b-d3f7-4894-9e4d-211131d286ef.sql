-- 1. Restrict sensitive columns in profiles
-- Revoke all SELECT permissions first, then grant back only what is safe for everyone
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, full_name, avatar_url, created_at, is_bot, is_admin) ON public.profiles TO anon, authenticated;
-- Grant full select for the owner and admins is handled by RLS, 
-- but we need to ensure they can still select the sensitive columns if they pass RLS.
-- In Postgres, if you have table-level SELECT via RLS, it applies to all columns unless restricted.
-- So we grant column-level SELECT for sensitive ones only to authenticated (for themselves) and admins.
GRANT SELECT (cpf, phone, bid_balance) ON public.profiles TO authenticated;
-- The RLS policy will then decide if they can see the row.

-- 2. Secure place_bid function
-- Update place_bid to use auth.uid() and remove p_user_id to prevent impersonation
CREATE OR REPLACE FUNCTION public.place_bid(p_auction_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_current_price DECIMAL(10, 2);
  v_bid_balance INTEGER;
  v_auction_status TEXT;
  v_end_time TIMESTAMP WITH TIME ZONE;
  v_timer_duration INTEGER;
  v_bid_cost INTEGER := 1;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuário não autenticado.');
  END IF;

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
  WHERE id = v_user_id
  FOR UPDATE;
  
  IF v_bid_balance < v_bid_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Saldo de lances insuficiente.');
  END IF;

  -- 3. Deduct balance
  UPDATE public.profiles 
  SET bid_balance = bid_balance - v_bid_cost 
  WHERE id = v_user_id;

  -- 4. Update auction
  UPDATE public.auctions 
  SET 
    current_price = current_price + 0.01,
    bid_count = bid_count + 1,
    last_bidder_id = v_user_id,
    -- Reset timer to full duration
    end_time = now() + (v_timer_duration || ' seconds')::interval
  WHERE id = p_auction_id;

  -- 5. Record bid
  INSERT INTO public.bids (auction_id, user_id, price_at_bid) 
  VALUES (p_auction_id, v_user_id, v_current_price + 0.01);

  RETURN jsonb_build_object('success', true, 'new_price', v_current_price + 0.01);
END;
$function$;

-- 3. Revoke public execution of sensitive functions
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_robot_bids() FROM PUBLIC;
-- Ensure only service_role or specific roles can call them if needed
-- Usually service_role (admin) can still call them.

-- 4. Fix views security
-- Recreate v_home_recent_winners with security_invoker = on
DROP VIEW IF EXISTS public.v_home_recent_winners;
CREATE VIEW public.v_home_recent_winners 
WITH (security_invoker = on)
AS
 SELECT w.id,
    w.final_price,
    w.savings_percentage,
    w.created_at,
    jsonb_build_object('full_name', prof.full_name, 'username', prof.username, 'avatar_url', prof.avatar_url) AS profile,
    jsonb_build_object('product', jsonb_build_object('name', p.name, 'image', p.images[1])) AS auction
   FROM (((winners w
     JOIN profiles prof ON ((w.user_id = prof.id)))
     JOIN auctions a ON ((w.auction_id = a.id)))
     JOIN products p ON ((a.product_id = p.id)));

-- 5. Set search_path for all SECURITY DEFINER functions (Best Practice)
ALTER FUNCTION public.buy_credits(uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.check_is_admin() SET search_path = public;
ALTER FUNCTION public.handle_auction_finished() SET search_path = public;
ALTER FUNCTION public.handle_new_auction_robot_settings() SET search_path = public;
ALTER FUNCTION public.process_robot_bids() SET search_path = public;
