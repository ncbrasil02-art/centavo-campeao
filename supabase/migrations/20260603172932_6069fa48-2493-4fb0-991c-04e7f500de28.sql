-- Reset the specific auction to live and 30s
UPDATE public.auctions 
SET status = 'live',
    end_time = now() + interval '30 seconds',
    start_time = now(),
    current_price = 0.01,
    bid_count = 0
WHERE id = '50534c29-a076-48a6-83ee-5ad1ba200fdf';

-- Ensure robot settings are definitely active for this one
UPDATE public.robot_settings 
SET active = true,
    bid_chance = 0.98,
    stop_after_minutes = 15
WHERE auction_id = '50534c29-a076-48a6-83ee-5ad1ba200fdf';

-- Remove any other potentially confusing test auctions
DELETE FROM public.auctions 
WHERE status IN ('scheduled', 'live') 
AND id != '50534c29-a076-48a6-83ee-5ad1ba200fdf';
