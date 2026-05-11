-- View para leilões ao vivo na Home
CREATE OR REPLACE VIEW public.v_home_live_auctions AS
SELECT 
    a.id,
    a.current_price,
    a.bid_count,
    a.end_time,
    a.status,
    a.robot_enabled,
    p.id as product_id,
    p.name as product_name,
    p.market_value as product_market_value,
    p.images as product_images,
    prof.username as last_bidder_username,
    prof.avatar_url as last_bidder_avatar_url
FROM public.auctions a
JOIN public.products p ON a.product_id = p.id
LEFT JOIN public.profiles prof ON a.last_bidder_id = prof.id
WHERE a.status = 'live';

-- View para ganhadores recentes na Home
CREATE OR REPLACE VIEW public.v_home_recent_winners AS
SELECT 
    w.id,
    w.final_price,
    w.savings_percentage,
    w.created_at,
    prof.full_name as winner_name,
    prof.username as winner_username,
    prof.avatar_url as winner_avatar_url,
    p.name as product_name,
    p.images as product_images
FROM public.winners w
JOIN public.profiles prof ON w.user_id = prof.id
JOIN public.auctions a ON w.auction_id = a.id
JOIN public.products p ON a.product_id = p.id;

-- Grant access to the views
GRANT SELECT ON public.v_home_live_auctions TO anon, authenticated;
GRANT SELECT ON public.v_home_recent_winners TO anon, authenticated;
