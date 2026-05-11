-- 1. Restrict storage
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Public read site-assets" ON storage.objects;
CREATE POLICY "Allow public read for site-assets" ON storage.objects FOR SELECT USING (bucket_id = 'site-assets');

-- 2. Revoke and Grant Permissions (Explicit list to avoid syntax errors)
-- Revoke from public/anon
REVOKE ALL ON FUNCTION public.tick_auctions() FROM public, anon;
REVOKE ALL ON FUNCTION public.process_robot_bids() FROM public, anon;
REVOKE ALL ON FUNCTION public.place_bid(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.place_robot_bid(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.create_pending_payment(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.complete_payment(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.add_bids_to_user(uuid, integer) FROM public, anon;
REVOKE ALL ON FUNCTION public.buy_credits(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.check_is_admin() FROM public, anon;

-- Grant permissions back
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_pending_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payment(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.buy_credits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;

-- 3. Set search_path for SD functions
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