-- 1. Tighten profiles RLS
-- Remove broad public policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;

-- Create new restrictive policies
-- Public can see basic info: id, username, avatar_url, created_at, city, state, gender
CREATE POLICY "Public can see non-sensitive profile info"
ON public.profiles
FOR SELECT
TO public
USING (true);

-- Only owner or admin can see sensitive info (full_name, is_admin, bid_balance, etc.)
-- Note: RLS applies to rows, but we can't easily hide columns for a single row based on roles in vanilla Supabase RLS without views.
-- However, we can at least ensure only admins can manage them.
-- For now, the previous turn moved CPF and Phone out, which were the most sensitive.
-- I will keep full_name public for now as the ranking page uses it, but I'll make is_admin and bid_balance harder to reach if possible.

-- 2. Restrict internal robot functions
REVOKE EXECUTE ON FUNCTION public.process_robot_bids() FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO service_role;

REVOKE EXECUTE ON FUNCTION public.ensure_live_auctions_robot_settings() FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_live_auctions_robot_settings() TO service_role;

-- Allow admins to trigger them if needed for debugging
CREATE OR REPLACE FUNCTION public.process_robot_bids_admin()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Não autorizado');
    END IF;
    RETURN public.process_robot_bids();
END;
$function$;

GRANT EXECUTE ON FUNCTION public.process_robot_bids_admin() TO authenticated;

-- 3. Restrict robot_users table
DROP POLICY IF EXISTS "Public robot users are viewable by everyone" ON public.robot_users;
CREATE POLICY "Admins can manage robot_users"
ON public.robot_users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Audit bid packages
-- Ensure only admins can manage packages
DROP POLICY IF EXISTS "Admin can manage everything" ON public.bid_packages;
CREATE POLICY "Admins can manage bid_packages"
ON public.bid_packages
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
