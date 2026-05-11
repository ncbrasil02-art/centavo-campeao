CREATE OR REPLACE FUNCTION public.handle_new_auction_robot_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.robot_settings (auction_id, active, min_delay, max_delay, bid_chance, max_bids_per_robot)
    VALUES (NEW.id, true, 1, 5, 0.3, 50);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_new_auction_robot_settings ON public.auctions;
CREATE TRIGGER tr_new_auction_robot_settings
    AFTER INSERT ON public.auctions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auction_robot_settings();