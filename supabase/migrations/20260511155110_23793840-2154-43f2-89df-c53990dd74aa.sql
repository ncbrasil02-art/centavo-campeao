-- Configurações de segurança para place_bid
REVOKE EXECUTE ON FUNCTION public.place_bid(uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.place_bid(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, uuid) TO authenticated;
ALTER FUNCTION public.place_bid(uuid, uuid) SET search_path = public;

-- Configurações de segurança para place_robot_bid
REVOKE EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) FROM authenticated;
ALTER FUNCTION public.place_robot_bid(uuid, uuid) SET search_path = public;
