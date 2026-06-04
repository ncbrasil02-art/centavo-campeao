-- Table for tracking anonymous and registered visitors
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    ip_address TEXT,
    user_agent TEXT,
    country TEXT,
    city TEXT,
    current_page TEXT,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add tracking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_page TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Function to update session/profile presence
CREATE OR REPLACE FUNCTION public.track_user_presence(p_user_id UUID, p_page TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles 
    SET last_seen_at = now(),
        current_page = p_page,
        is_online = true
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get real admin stats
CREATE OR REPLACE FUNCTION public.get_admin_stats_v2()
RETURNS json AS $$
DECLARE
    result json;
    v_total_users int;
    v_online_users int;
    v_active_auctions int;
    v_total_revenue decimal;
    v_total_bids int;
BEGIN
    SELECT count(*) INTO v_total_users FROM public.profiles;
    
    -- Count users active in the last 5 minutes
    SELECT count(*) INTO v_online_users 
    FROM public.profiles 
    WHERE last_seen_at > (now() - interval '5 minutes');
    
    SELECT count(*) INTO v_active_auctions 
    FROM public.auctions 
    WHERE status = 'live';
    
    SELECT COALESCE(sum(amount), 0) INTO v_total_revenue 
    FROM public.sales 
    WHERE status = 'approved';
    
    SELECT count(*) INTO v_total_bids FROM public.bids;

    result := json_build_object(
        'totalUsers', v_total_users,
        'onlineUsers', v_online_users,
        'activeAuctions', v_active_auctions,
        'totalRevenue', v_total_revenue,
        'totalBids', v_total_bids
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitor_sessions TO authenticated;
GRANT ALL ON public.visitor_sessions TO service_role;
GRANT EXECUTE ON FUNCTION public.track_user_presence(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats_v2() TO authenticated;

ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view visitor sessions" ON public.visitor_sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
