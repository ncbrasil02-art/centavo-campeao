-- Grant permissions to both authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) TO anon, authenticated;

-- Reset the stuck auction for GoPro
UPDATE public.auctions 
SET 
    end_time = now() + interval '15 seconds',
    status = 'live'
WHERE id = '537df60f-c71f-47dd-8906-4ed487ecaae3';

-- Manually trigger one tick to ensure it starts working
SELECT public.tick_auctions();
