-- Revoke all execution privileges from PUBLIC (which includes anon) for all security definer functions in public schema
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;

-- Explicitly grant execute back to authenticated role for functions needed by the UI
GRANT EXECUTE ON FUNCTION public.place_bid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_payment(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_bid_balance(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_auction_winner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) TO authenticated;

-- Explicitly grant all to service_role for internal logic/cron
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Special case: trigger functions should generally only be executable by the owner or service_role
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_auction_finished() FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_auction_finished() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_auction_robot_settings() FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_auction_robot_settings() TO service_role;

REVOKE EXECUTE ON FUNCTION public.protect_profile_sensitive_columns() FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_profile_sensitive_columns() TO service_role;
