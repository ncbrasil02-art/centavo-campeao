-- Index for faster sorting and filtering of auctions
CREATE INDEX IF NOT EXISTS idx_auctions_start_time ON public.auctions (start_time);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON public.auctions (end_time);

-- Index for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at);

-- Index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at);

-- RPC for admin stats to avoid heavy client-side processing
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_users BIGINT;
    active_auctions BIGINT;
    total_revenue NUMERIC;
    total_bids BIGINT;
BEGIN
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

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO service_role;
