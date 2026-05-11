-- Revoke public execution of sensitive functions
REVOKE EXECUTE ON FUNCTION public.buy_credits(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.place_bid(uuid, uuid) FROM public, anon;

-- Explicitly allow authenticated users
GRANT EXECUTE ON FUNCTION public.buy_credits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, uuid) TO authenticated;

-- For robot bids, only service_role or admin (if we had one) should call it usually, 
-- but since the frontend handles robot bids (simulated), we might need authenticated.
-- However, let's keep it restricted as much as possible.
REVOKE EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) TO authenticated;
