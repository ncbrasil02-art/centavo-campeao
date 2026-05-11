-- 1. Revoke public execution of sensitive functions
REVOKE EXECUTE ON FUNCTION public.tick_auctions() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.process_robot_bids() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.place_bid(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.create_pending_payment(uuid, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.complete_payment(uuid, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.buy_credits(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.check_is_admin() FROM public, anon;

-- Grant permissions back only to authorized roles
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_pending_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payment(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;

-- 2. Secure search_path for SECURITY DEFINER functions
ALTER FUNCTION public.tick_auctions() SET search_path = public;
ALTER FUNCTION public.process_robot_bids() SET search_path = public;
ALTER FUNCTION public.place_bid(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.place_robot_bid(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.create_pending_payment(uuid, text) SET search_path = public;
ALTER FUNCTION public.complete_payment(uuid, text) SET search_path = public;
ALTER FUNCTION public.add_bids_to_user(uuid, integer) SET search_path = public;
ALTER FUNCTION public.buy_credits(uuid) SET search_path = public;
ALTER FUNCTION public.check_is_admin() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_auction_finished() SET search_path = public;
ALTER FUNCTION public.handle_new_auction_robot_settings() SET search_path = public;

-- 3. Set security_invoker = on for views to ensure they respect underlying RLS
ALTER VIEW public.v_home_live_auctions SET (security_invoker = on);
ALTER VIEW public.v_home_recent_winners SET (security_invoker = on);

-- 4. Secure robot_settings RLS
DROP POLICY IF EXISTS "Robot settings viewable by everyone" ON public.robot_settings;
CREATE POLICY "Robot settings are admin only" 
ON public.robot_settings 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 5. Fix profiles RLS (Ensuring sensitive data isn't exposed easily)
-- We will keep the public read policy but advise the user that CPF/bid_balance 
-- should ideally be in a private table. 
-- For now, let's at least make sure admins can manage everything.
-- (Admin policy already exists: "Admins can manage all profiles" USING check_is_admin())
