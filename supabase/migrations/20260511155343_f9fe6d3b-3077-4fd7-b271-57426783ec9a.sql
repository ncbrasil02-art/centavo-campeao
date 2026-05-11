-- Corrigir search_path e permissões para handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Corrigir search_path e permissões para add_bids_to_user
ALTER FUNCTION public.add_bids_to_user(uuid, integer) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM public;
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM authenticated;
-- Apenas o sistema ou admins devem chamar isso via RPC ou internamente
