-- 1. Fix search_path for handle_updated_at
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- 2. Restringir funções sensíveis
-- Revogar execução pública
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_payment(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_payment(uuid, text) FROM anon, authenticated;

-- Garantir que apenas admins ou o sistema possam rodar funções de robôs e ticks de leilão se necessário
-- (Embora place_bid e place_robot_bid tenham checks internos, é bom ser explícito)

-- 3. Caso queira restringir tick_auctions e process_robot_bids apenas para admins
-- (O frontend chama estas funções no Index.tsx via supabase.rpc)
-- Como o usuário comum as chama no heartbeat, elas precisam de permissão de execução,
-- mas elas são seguras pois apenas processam dados baseados em tempo.
