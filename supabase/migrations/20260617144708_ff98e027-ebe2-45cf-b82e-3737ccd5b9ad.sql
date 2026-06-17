
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS welcome_bids_expiry_days integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.expire_welcome_bids()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days int;
  v_affected int := 0;
BEGIN
  SELECT COALESCE(welcome_bids_expiry_days, 0) INTO v_days FROM public.site_settings LIMIT 1;
  IF v_days IS NULL OR v_days <= 0 THEN
    RETURN jsonb_build_object('success', true, 'skipped', true);
  END IF;

  PERFORM set_config('app.allow_profile_update', 'true', true);

  WITH expired AS (
    SELECT p.id
    FROM public.profiles p
    WHERE COALESCE(p.is_bot, false) = false
      AND COALESCE(p.bid_balance, 0) > 0
      AND p.created_at < (now() - (v_days || ' days')::interval)
      AND NOT EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.user_id = p.id AND t.type = 'purchase' AND t.status = 'completed'
      )
  )
  UPDATE public.profiles p
  SET bid_balance = 0
  FROM expired e
  WHERE p.id = e.id;

  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'expired_users', v_affected);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_welcome_bids() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_welcome_bids() TO service_role;
