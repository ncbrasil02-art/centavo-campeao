
-- 1) Bloquear complete_payment para anon/authenticated (só service_role/webhook)
REVOKE EXECUTE ON FUNCTION public.complete_payment(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payment(uuid, text) TO service_role;

-- 2) Bloquear pay_with_bid_balance de ser chamado por outros usuários (segue auth.uid mas defesa em profundidade)
REVOKE EXECUTE ON FUNCTION public.pay_with_bid_balance(uuid) FROM PUBLIC, anon;

-- 3) Garantir que increment_bid_balance (concede saldo) não esteja acessível a anon
REVOKE EXECUTE ON FUNCTION public.increment_bid_balance(uuid, integer) FROM PUBLIC, anon;

-- 4) Bloquear add_bids_to_user (não tinha checagem de admin) para qualquer usuário comum
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) TO service_role;

-- 5) Bloquear buy_credits (concedia lances sem pagar de verdade) — substituída pelo fluxo MP
REVOKE EXECUTE ON FUNCTION public.buy_credits(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buy_credits(uuid) TO service_role;
