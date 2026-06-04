-- Secure the admin stats function
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin_user BOOLEAN;
    total_users BIGINT;
    active_auctions BIGINT;
    total_revenue NUMERIC;
    total_bids BIGINT;
BEGIN
    -- Check if requesting user is admin
    SELECT is_admin INTO is_admin_user FROM public.profiles WHERE id = auth.uid();
    
    IF NOT COALESCE(is_admin_user, false) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem ver estatísticas.';
    END IF;

    SELECT count(*) INTO total_users FROM public.profiles;
    SELECT count(*) INTO active_auctions FROM public.auctions WHERE status = 'live';
    SELECT COALESCE(sum(amount), 0) INTO total_revenue FROM public.transactions WHERE status = 'completed';
    SELECT count(*) INTO total_bids FROM public.bids;

    RETURN jsonb_build_object(
        'totalUsers', total_users,
        'activeAuctions', active_auctions,
        'totalRevenue', total_revenue,
        'totalBids', total_bids
    );
END;
$$;

-- Ensure get_server_time is also secure
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT now();
$$;
