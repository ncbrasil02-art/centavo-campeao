-- 1. Create admin_settings for secrets
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mercado_pago_access_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Move existing token if any
INSERT INTO public.admin_settings (mercado_pago_access_token)
SELECT mercado_pago_access_token FROM public.site_settings
LIMIT 1
ON CONFLICT DO NOTHING;

-- Remove token from public site_settings
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS mercado_pago_access_token;

-- Enable RLS and set policies for admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admin_settings"
ON public.admin_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT ALL ON public.admin_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated;

-- 2. Restrict dangerous functions
-- Revoke from public
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.complete_payment(uuid, text) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.buy_credits(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.tick_auctions() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.confirm_auction_winner(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_bid_balance(uuid, integer) FROM authenticated, anon, public;

-- Fix increment_bid_balance to be admin-only
CREATE OR REPLACE FUNCTION public.increment_bid_balance(p_user_id uuid, p_amount integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_balance INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if the current user is an admin
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autorizado. Apenas administradores podem alterar saldos diretamente.');
  END IF;

  -- Update balance
  UPDATE public.profiles
  SET bid_balance = COALESCE(bid_balance, 0) + p_amount
  WHERE id = p_user_id
  RETURNING bid_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuário não encontrado');
  END IF;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$function$;

-- Fix tick_auctions to have an admin check if called via RPC (but allow cron via service_role)
CREATE OR REPLACE FUNCTION public.tick_auctions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_pending_count INTEGER := 0;
    v_started_count INTEGER := 0;
    v_finished_count INTEGER := 0;
    v_is_admin BOOLEAN;
BEGIN
    -- Allow service_role (cron) or admins
    SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
    
    IF auth.uid() IS NOT NULL AND NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Não autorizado');
    END IF;

    -- 1. Start scheduled auctions
    WITH started AS (
        UPDATE public.auctions
        SET 
            status = 'live',
            end_time = now() + (timer_duration || ' seconds')::interval
        WHERE status = 'scheduled' AND start_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_started_count FROM started;

    -- 2. Move expired live to pending_audit
    WITH pending AS (
        UPDATE public.auctions
        SET status = 'pending_audit'
        WHERE status = 'live' AND end_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_pending_count FROM pending;

    -- 3. Move confirmed to finished after 5 minutes
    WITH finished AS (
        UPDATE public.auctions
        SET status = 'finished'
        WHERE status = 'confirmed' AND confirmed_at <= now() - interval '5 minutes'
        RETURNING id
    )
    SELECT count(*) INTO v_finished_count FROM finished;

    RETURN jsonb_build_object(
        'success', true,
        'started_count', v_started_count,
        'pending_count', v_pending_count,
        'finished_count', v_finished_count,
        'timestamp', now()
    );
END;
$function$;

-- Re-grant necessary execution (the functions now have internal checks)
GRANT EXECUTE ON FUNCTION public.increment_bid_balance(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_auction_winner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_robot_bid(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_payment(uuid, text, uuid) TO authenticated;

-- Revoke execute from public for truly internal helper functions
REVOKE EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.complete_payment(uuid, text) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.buy_credits(uuid) FROM authenticated, anon, public;

-- Ensure service_role can still run them
GRANT EXECUTE ON FUNCTION public.add_bids_to_user(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_payment(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.buy_credits(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO service_role;
