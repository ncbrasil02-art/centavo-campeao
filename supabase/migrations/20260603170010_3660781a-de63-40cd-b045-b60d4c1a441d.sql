-- Definir search_path para segurança
ALTER FUNCTION public.tick_auctions() SET search_path = public;

-- Revogar execução pública e permitir apenas para service_role e administradores
REVOKE EXECUTE ON FUNCTION public.tick_auctions() FROM public;
REVOKE EXECUTE ON FUNCTION public.tick_auctions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tick_auctions() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO service_role;
