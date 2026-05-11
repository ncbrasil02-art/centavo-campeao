CREATE OR REPLACE VIEW public.v_home_recent_winners AS
 SELECT w.id,
    w.final_price,
    w.savings_percentage,
    w.created_at,
    jsonb_build_object('full_name', prof.full_name, 'username', prof.username, 'avatar_url', prof.avatar_url) AS profile,
    jsonb_build_object(
        'product', 
        jsonb_build_object(
            'name', p.name,
            'image', p.images[1]
        )
    ) AS auction
   FROM (((public.winners w
     JOIN public.profiles prof ON ((w.user_id = prof.id)))
     JOIN public.auctions a ON ((w.auction_id = a.id)))
     JOIN public.products p ON ((a.product_id = p.id)));
