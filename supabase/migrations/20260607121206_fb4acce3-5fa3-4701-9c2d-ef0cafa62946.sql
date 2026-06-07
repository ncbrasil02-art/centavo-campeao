-- 1. Anexar trigger que protege colunas sensíveis em profiles (impede escalada de privilégios)
DROP TRIGGER IF EXISTS protect_profile_sensitive_columns_trigger ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- 2. Restringir upload no bucket auction-claims somente a ganhadores
DROP POLICY IF EXISTS "Winners can upload receipts" ON storage.objects;
CREATE POLICY "Winners can upload receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'auction-claims'
    AND (storage.foldername(name))[1] = (auth.uid())::text
    AND EXISTS (SELECT 1 FROM public.winners WHERE user_id = auth.uid())
  );

-- 3. Fix search_path em funções que ainda não têm
ALTER FUNCTION public.process_robot_bids() SET search_path = public;
ALTER FUNCTION public.tick_auctions() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.handle_auction_slug() SET search_path = public;
ALTER FUNCTION public.handle_auction_finished() SET search_path = public;
ALTER FUNCTION public.pay_with_bid_balance(uuid) SET search_path = public;
ALTER FUNCTION public.get_admin_stats_v2() SET search_path = public;
ALTER FUNCTION public.track_user_presence(uuid, text) SET search_path = public;

-- 4. Revogar EXECUTE de funções SECURITY DEFINER administrativas para anon
REVOKE EXECUTE ON FUNCTION public.process_robot_bids() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.process_robot_bids_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tick_auctions() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_auction_finished() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_sensitive_columns() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats_v2() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_bid_balance(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_payment(uuid, text) FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_auction_winner(uuid) FROM anon, public;

-- Authenticated ainda precisa para chamadas via RPC do app
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_robot_bids_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_auction_winner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats_v2() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_bid_balance(uuid, integer) TO authenticated;
