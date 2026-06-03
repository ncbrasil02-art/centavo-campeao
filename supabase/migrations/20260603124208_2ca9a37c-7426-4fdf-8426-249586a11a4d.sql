-- Revoke EXECUTE from PUBLIC on sensitive functions
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.buy_credits(uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.complete_payment(uuid, text) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.handle_auction_finished() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_auction_robot_settings() FROM PUBLIC, authenticated, anon;

-- Revoke administrative versions of multi-signature functions
REVOKE EXECUTE ON FUNCTION public.place_bid(uuid, uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.create_pending_payment(uuid, text, uuid) FROM PUBLIC, authenticated, anon;

-- Ensure service_role and postgres still have access
GRANT EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.buy_credits(uuid) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.complete_payment(uuid, text) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.handle_auction_finished() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_auction_robot_settings() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, uuid) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.create_pending_payment(uuid, text, uuid) TO service_role, postgres;
