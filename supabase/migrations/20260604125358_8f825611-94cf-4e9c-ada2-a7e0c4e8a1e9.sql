-- Ajustar search_path para evitar mutabilidade e avisos do linter
ALTER FUNCTION public.process_robot_bids() SET search_path = public;
ALTER FUNCTION public.tick_auctions() SET search_path = public;
ALTER FUNCTION public.place_bid(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.confirm_auction_winner(UUID) SET search_path = public;

-- Revogar permissões públicas desnecessárias (já feito antes, mas reforçando para novas funções)
REVOKE EXECUTE ON FUNCTION public.process_robot_bids() FROM public;
REVOKE EXECUTE ON FUNCTION public.tick_auctions() FROM public;

-- Garantir que apenas usuários autenticados ou o sistema podem rodar o tick
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO service_role;
