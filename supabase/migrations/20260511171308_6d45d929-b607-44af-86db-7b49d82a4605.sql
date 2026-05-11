-- Recriar views com estrutura compatível (aninhada em JSON)
DROP VIEW IF EXISTS public.v_home_live_auctions;
CREATE VIEW public.v_home_live_auctions WITH (security_invoker = true) AS
SELECT 
    a.id,
    a.current_price,
    a.bid_count,
    a.end_time,
    a.status,
    a.robot_enabled,
    a.product_id,
    jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'market_value', p.market_value,
        'images', p.images
    ) as product,
    CASE 
        WHEN prof.id IS NOT NULL THEN 
            jsonb_build_object(
                'username', prof.username,
                'avatar_url', prof.avatar_url
            )
        ELSE NULL
    END as last_bidder
FROM public.auctions a
JOIN public.products p ON a.product_id = p.id
LEFT JOIN public.profiles prof ON a.last_bidder_id = prof.id
WHERE a.status = 'live';

DROP VIEW IF EXISTS public.v_home_recent_winners;
CREATE VIEW public.v_home_recent_winners WITH (security_invoker = true) AS
SELECT 
    w.id,
    w.final_price,
    w.savings_percentage,
    w.created_at,
    jsonb_build_object(
        'full_name', prof.full_name,
        'username', prof.username,
        'avatar_url', prof.avatar_url
    ) as profile,
    jsonb_build_object(
        'product', jsonb_build_object('name', p.name)
    ) as auction
FROM public.winners w
JOIN public.profiles prof ON w.user_id = prof.id
JOIN public.auctions a ON w.auction_id = a.id
JOIN public.products p ON a.product_id = p.id;
