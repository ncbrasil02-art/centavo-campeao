CREATE OR REPLACE FUNCTION public.ensure_live_auctions_robot_settings()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $$
 BEGIN
    INSERT INTO public.robot_settings (auction_id)
    SELECT id FROM public.auctions
    WHERE status = 'live'
    AND NOT EXISTS (SELECT 1 FROM public.robot_settings WHERE auction_id = public.auctions.id);
 END;
 $$;
