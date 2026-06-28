
-- Tabela de auditoria
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs (admin_id);

-- Função utilitária (SECURITY DEFINER, somente chamada internamente por outras RPCs)
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) TO service_role;

-- RPC de leitura para o painel admin
CREATE OR REPLACE FUNCTION public.admin_get_audit_logs(p_limit int DEFAULT 100, p_offset int DEFAULT 0)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', l.id,
    'admin_id', l.admin_id,
    'admin_username', p.username,
    'admin_full_name', p.full_name,
    'action', l.action,
    'target_type', l.target_type,
    'target_id', l.target_id,
    'details', l.details,
    'created_at', l.created_at
  )
  FROM public.admin_audit_logs l
  LEFT JOIN public.profiles p ON p.id = l.admin_id
  ORDER BY l.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_audit_logs(int, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_get_audit_logs(int, int) TO authenticated, service_role;

-- Atualizar RPCs sensíveis para registrar a ação
CREATE OR REPLACE FUNCTION public.confirm_auction_winner(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Apenas administradores podem confirmar ganhadores.');
  END IF;

  UPDATE public.auctions
    SET status = 'confirmed', confirmed_at = now()
    WHERE id = p_auction_id AND status = 'pending_audit';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Leilão não encontrado ou já processado.');
  END IF;

  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id)
  VALUES (auth.uid(), 'confirm_auction_winner', 'auction', p_auction_id::text);

  RETURN jsonb_build_object('success', true, 'message', 'Ganhador confirmado com sucesso!');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_winner_payment(p_auction_id uuid, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  UPDATE public.winners SET payment_status = p_status WHERE auction_id = p_auction_id;

  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'update_winner_payment', 'auction', p_auction_id::text, jsonb_build_object('status', p_status));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_close_unique_campaign(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner_value numeric;
  v_winner_user uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Não autorizado'; END IF;

  SELECT value INTO v_winner_value
  FROM public.unique_bids
  WHERE campaign_id = p_campaign_id
  GROUP BY value HAVING count(*) = 1
  ORDER BY value ASC LIMIT 1;

  IF v_winner_value IS NOT NULL THEN
    SELECT user_id INTO v_winner_user
    FROM public.unique_bids
    WHERE campaign_id = p_campaign_id AND value = v_winner_value
    LIMIT 1;
  END IF;

  UPDATE public.unique_bid_campaigns
    SET status = 'finished',
        winner_value = v_winner_value,
        winner_user_id = v_winner_user,
        closed_at = now()
    WHERE id = p_campaign_id;

  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'close_unique_campaign', 'unique_bid_campaign', p_campaign_id::text,
          jsonb_build_object('winner_value', v_winner_value, 'winner_user_id', v_winner_user));

  RETURN jsonb_build_object('success', true, 'winner_value', v_winner_value, 'winner_user_id', v_winner_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_bid_balance(p_user_id uuid, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autorizado.');
  END IF;

  UPDATE public.profiles
    SET bid_balance = COALESCE(bid_balance, 0) + p_amount
    WHERE id = p_user_id
    RETURNING bid_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuário não encontrado');
  END IF;

  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'increment_bid_balance', 'profile', p_user_id::text,
          jsonb_build_object('amount', p_amount, 'new_balance', v_new_balance));

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;
