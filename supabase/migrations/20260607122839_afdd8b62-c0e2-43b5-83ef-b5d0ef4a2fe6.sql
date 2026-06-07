
ALTER FUNCTION public.slugify(text) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.pay_with_bid_balance(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.track_user_presence(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_with_bid_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_user_presence(uuid, text) TO authenticated;
