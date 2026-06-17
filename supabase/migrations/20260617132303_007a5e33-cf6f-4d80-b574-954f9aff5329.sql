
-- ========= PROFILES: column-level access =========
DROP POLICY IF EXISTS "Public can see non-sensitive profile info" ON public.profiles;

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, full_name, city, state, avatar_url, is_bot, is_online, last_seen_at, current_page, gender, created_at)
  ON public.profiles TO anon, authenticated;

REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (username, full_name, gender, avatar_url, phone, last_seen_at, current_page, is_online, city, state)
  ON public.profiles TO authenticated;

CREATE POLICY "Profiles rows readable by all (columns gated by GRANT)"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- ========= WINNERS: hide payment data =========
DROP POLICY IF EXISTS "Public read winners" ON public.winners;
DROP POLICY IF EXISTS "Winners viewable by everyone" ON public.winners;

REVOKE SELECT ON public.winners FROM anon, authenticated;
GRANT SELECT (id, auction_id, user_id, final_price, savings_percentage, created_at)
  ON public.winners TO anon, authenticated;

CREATE POLICY "Winner basic info readable (columns gated by GRANT)"
  ON public.winners FOR SELECT
  TO anon, authenticated
  USING (true);

-- Owner/admin payment access via SECURITY DEFINER RPCs
CREATE OR REPLACE FUNCTION public.get_winner_payment(p_auction_id uuid)
RETURNS TABLE(payment_receipt_url text, payment_status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  RETURN QUERY
  SELECT w.payment_receipt_url, w.payment_status
  FROM public.winners w
  WHERE w.auction_id = p_auction_id
    AND (w.user_id = auth.uid() OR public.is_admin());
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_winner_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_winner_payment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_winner_receipt(p_auction_id uuid, p_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  UPDATE public.winners
    SET payment_receipt_url = p_url, payment_status = 'pending'
    WHERE auction_id = p_auction_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Ganhador não encontrado'; END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.submit_winner_receipt(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_winner_receipt(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_winner_payment(p_auction_id uuid, p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  UPDATE public.winners SET payment_status = p_status WHERE auction_id = p_auction_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_update_winner_payment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_winner_payment(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_winner_full(p_auction_id uuid)
RETURNS SETOF jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  RETURN QUERY SELECT to_jsonb(w.*) FROM public.winners w WHERE w.auction_id = p_auction_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_get_winner_full(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_winner_full(uuid) TO authenticated;

-- ========= Revoke anon EXECUTE on SECURITY DEFINER functions =========
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles(text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_online_profiles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_robots() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_auction_winner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_payment(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.track_user_presence(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.place_bid(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.place_bid(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_robot_bids() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_robot_bids_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_bid_balance(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.buy_credits(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pay_with_bid_balance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_pending_payment(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_pending_payment(uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats_v2() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tick_auctions() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_live_auctions_robot_settings() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_is_admin() FROM anon;

-- ========= Fix mutable search_path =========
ALTER FUNCTION public.tick_auctions() SET search_path = public;
