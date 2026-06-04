
-- 1. Drop insecure current_setting-based policies. SECURITY DEFINER functions bypass RLS automatically.
DROP POLICY IF EXISTS "Allow privileged bid insert" ON public.bids;
DROP POLICY IF EXISTS "Allow privileged auction update" ON public.auctions;
DROP POLICY IF EXISTS "Allow privileged transaction insert" ON public.transactions;

-- 2. Fix protect_profile_sensitive_columns trigger: remove current_setting bypass so authenticated users
--    (even with SET app.allow_profile_update) cannot change is_admin/bid_balance/is_bot.
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND current_user = 'authenticated') THEN
    NEW.bid_balance := OLD.bid_balance;
    NEW.is_admin := OLD.is_admin;
    NEW.is_bot := OLD.is_bot;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS protect_profile_sensitive_columns_trg ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_columns_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- 3. Restrict column-level access for anonymous users on profiles
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, full_name, avatar_url, city, state, gender, created_at) ON public.profiles TO anon;

-- 4. Revoke EXECUTE on privileged SECURITY DEFINER functions from public roles
REVOKE EXECUTE ON FUNCTION public.process_robot_bids() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_bid_balance(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.complete_payment(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.confirm_auction_winner(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.tick_auctions() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_live_auctions_robot_settings() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_auction_finished() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_auction_robot_settings() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.protect_profile_sensitive_columns() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.place_bid(uuid, uuid) FROM anon, authenticated, public;
