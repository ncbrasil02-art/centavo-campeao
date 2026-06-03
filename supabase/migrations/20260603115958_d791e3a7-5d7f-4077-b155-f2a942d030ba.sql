-- 1. Secure Database Views
-- Recreate views with security_invoker = true
DROP VIEW IF EXISTS public.v_home_live_auctions;
CREATE VIEW public.v_home_live_auctions 
WITH (security_invoker = true)
AS
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

DROP VIEW IF EXISTS public.v_home_recent_winners;
CREATE VIEW public.v_home_recent_winners 
WITH (security_invoker = true)
AS
 SELECT w.id,
    w.final_price,
    w.savings_percentage,
    w.created_at,
    jsonb_build_object('full_name', prof.full_name, 'username', prof.username, 'avatar_url', prof.avatar_url) AS profile,
    jsonb_build_object('product', jsonb_build_object('name', p.name, 'image', p.images[1])) AS auction
   FROM (((winners w
     JOIN profiles prof ON ((w.user_id = prof.id)))
     JOIN auctions a ON ((w.auction_id = a.id)))
     JOIN products p ON ((a.product_id = p.id)));

GRANT SELECT ON public.v_home_recent_winners TO anon, authenticated;

-- 2. Secure search_path for SECURITY DEFINER functions
-- Setting search_path prevents search path hijacking
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.confirm_auction_winner(uuid) SET search_path = public;
ALTER FUNCTION public.tick_auctions() SET search_path = public;
ALTER FUNCTION public.create_pending_payment(uuid, text) SET search_path = public;
ALTER FUNCTION public.create_pending_payment(uuid, text, uuid) SET search_path = public;
ALTER FUNCTION public.complete_payment(uuid, text) SET search_path = public;
ALTER FUNCTION public.add_bids_to_user(uuid, integer) SET search_path = public;
ALTER FUNCTION public.process_robot_bids() SET search_path = public;

-- 3. Revoke public access to sensitive functions
-- These should not be callable by the public API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_auction_winner(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tick_auctions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_pending_payment(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_pending_payment(uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_payment(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_robot_bids() FROM PUBLIC;

-- Ensure service_role can still execute them (for triggers and background jobs)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_auction_winner(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_pending_payment(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_pending_payment(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_payment(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO service_role;

-- 4. Tighten execution of buy_credits
REVOKE EXECUTE ON FUNCTION public.buy_credits(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.buy_credits(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.buy_credits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buy_credits(uuid) TO service_role;
