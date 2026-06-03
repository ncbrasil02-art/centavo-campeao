-- 1. Update v_home_live_auctions with security_invoker = true
DROP VIEW IF EXISTS public.v_home_live_auctions;
CREATE VIEW public.v_home_live_auctions WITH (security_invoker = true) AS
 SELECT a.id,
    a.current_price,
    a.bid_count,
    a.start_time,
    a.end_time,
    a.status,
    a.robot_enabled,
    a.product_id,
    a.timer_duration,
    a.is_finalizing,
    a.confirmed_at,
    a.modality,
    a.min_balance_required,
    jsonb_build_object('id', p.id, 'name', p.name, 'market_value', p.market_value, 'images', p.images) AS product,
        CASE
            WHEN (prof.id IS NOT NULL) THEN jsonb_build_object('id', prof.id, 'username', prof.username, 'avatar_url', prof.avatar_url)
            ELSE NULL::jsonb
        END AS last_bidder
   FROM ((auctions a
     JOIN products p ON ((a.product_id = p.id)))
     LEFT JOIN profiles prof ON ((a.last_bidder_id = prof.id)))
  WHERE (a.status = ANY (ARRAY['live'::text, 'scheduled'::text, 'pending_audit'::text, 'confirmed'::text]));

-- 2. Update v_home_recent_winners with security_invoker = true
DROP VIEW IF EXISTS public.v_home_recent_winners;
CREATE VIEW public.v_home_recent_winners WITH (security_invoker = true) AS
 SELECT w.id,
    w.final_price,
    w.savings_percentage,
    w.created_at,
    jsonb_build_object('username', prof.username, 'avatar_url', prof.avatar_url) AS profile,
    jsonb_build_object('product', jsonb_build_object('name', p.name, 'image', p.images[1])) AS auction
   FROM (((winners w
     JOIN profiles prof ON ((w.user_id = prof.id)))
     JOIN auctions a ON ((w.auction_id = a.id)))
     JOIN products p ON ((a.product_id = p.id)));

-- 3. Update v_user_ranking with security_invoker = true
DROP VIEW IF EXISTS public.v_user_ranking;
CREATE VIEW public.v_user_ranking WITH (security_invoker = true) AS
 SELECT p.id AS user_id,
    p.username,
    p.avatar_url,
    count(w.id) AS total_wins,
    COALESCE(sum(w.savings_percentage), (0)::numeric) AS total_savings_sum,
        CASE
            WHEN (count(w.id) > 0) THEN (sum(w.savings_percentage) / (count(w.id))::numeric)
            ELSE (0)::numeric
        END AS avg_savings
   FROM (profiles p
     LEFT JOIN winners w ON ((p.id = w.user_id)))
  WHERE ((p.is_bot = false) OR (p.is_bot IS NULL))
  GROUP BY p.id, p.username, p.avatar_url
 HAVING (count(w.id) > 0)
  ORDER BY (count(w.id)) DESC;
