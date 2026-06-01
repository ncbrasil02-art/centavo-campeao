DROP VIEW IF EXISTS public.v_home_live_auctions;

CREATE VIEW public.v_home_live_auctions AS
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
    a.target_winner,
    a.confirmed_at,
    a.modality,
    a.min_balance_required,
    jsonb_build_object('id', p.id, 'name', p.name, 'market_value', p.market_value, 'images', p.images) AS product,
        CASE
            WHEN prof.id IS NOT NULL THEN jsonb_build_object('id', prof.id, 'username', prof.username, 'avatar_url', prof.avatar_url)
            ELSE NULL::jsonb
        END AS last_bidder
   FROM auctions a
     JOIN products p ON a.product_id = p.id
     LEFT JOIN profiles prof ON a.last_bidder_id = prof.id
  WHERE a.status = ANY (ARRAY['live'::text, 'scheduled'::text, 'pending_audit'::text, 'confirmed'::text]);

GRANT SELECT ON public.v_home_live_auctions TO anon, authenticated;
