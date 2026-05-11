GRANT EXECUTE ON FUNCTION public.tick_auctions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) TO authenticated, service_role;