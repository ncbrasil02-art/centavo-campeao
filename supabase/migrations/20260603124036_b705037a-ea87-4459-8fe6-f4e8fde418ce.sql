-- Revoke EXECUTE from PUBLIC on sensitive functions
REVOKE EXECUTE ON FUNCTION public.confirm_auction_winner(uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.increment_bid_balance(uuid, integer) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.tick_auctions() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.process_robot_bids() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.process_robot_bids_admin() FROM PUBLIC, authenticated, anon;

-- Ensure service_role and postgres still have access
GRANT EXECUTE ON FUNCTION public.confirm_auction_winner(uuid) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.increment_bid_balance(uuid, integer) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.process_robot_bids_admin() TO service_role, postgres;
