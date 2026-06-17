
-- ============ Tabela: unique_bid_campaigns ============
CREATE TABLE public.unique_bid_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  min_bid_value numeric(10,2) NOT NULL DEFAULT 0.01,
  max_bid_value numeric(10,2) NOT NULL DEFAULT 100.00,
  bid_step numeric(10,2) NOT NULL DEFAULT 0.01,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','closed','finished')),
  winner_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_value numeric(10,2),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.unique_bid_campaigns TO anon, authenticated;
GRANT ALL ON public.unique_bid_campaigns TO service_role;

ALTER TABLE public.unique_bid_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read live/closed/finished campaigns"
  ON public.unique_bid_campaigns FOR SELECT
  TO anon, authenticated
  USING (status IN ('live','closed','finished'));

CREATE POLICY "Admins manage campaigns"
  ON public.unique_bid_campaigns FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER trg_unique_bid_campaigns_updated
  BEFORE UPDATE ON public.unique_bid_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============ Tabela: unique_bids ============
CREATE TABLE public.unique_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.unique_bid_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  value numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_unique_bids_campaign_value ON public.unique_bids(campaign_id, value);
CREATE INDEX idx_unique_bids_user ON public.unique_bids(user_id);

GRANT SELECT ON public.unique_bids TO authenticated;
GRANT ALL ON public.unique_bids TO service_role;

ALTER TABLE public.unique_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own bids"
  ON public.unique_bids FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- inserts only via RPC (security definer)

-- ============ RPC: place_unique_bid ============
CREATE OR REPLACE FUNCTION public.place_unique_bid(p_campaign_id uuid, p_value numeric)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_campaign public.unique_bid_campaigns;
  v_balance int;
  v_tenant text;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autenticado.');
  END IF;

  SELECT * INTO v_campaign FROM public.unique_bid_campaigns WHERE id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Campanha não encontrada.');
  END IF;
  IF v_campaign.status <> 'live' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Campanha não está aberta.');
  END IF;
  IF p_value < v_campaign.min_bid_value OR p_value > v_campaign.max_bid_value THEN
    RETURN jsonb_build_object('success', false, 'message', 'Valor fora da faixa permitida.');
  END IF;
  -- valida step
  IF v_campaign.bid_step > 0 AND mod((p_value - v_campaign.min_bid_value)::numeric, v_campaign.bid_step) <> 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Valor não respeita o incremento configurado.');
  END IF;

  SELECT bid_balance INTO v_balance FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF COALESCE(v_balance, 0) < 1 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Saldo de lances insuficiente.');
  END IF;

  PERFORM set_config('app.allow_profile_update', 'true', true);
  UPDATE public.profiles SET bid_balance = bid_balance - 1 WHERE id = v_user;

  INSERT INTO public.unique_bids (tenant_id, campaign_id, user_id, value)
  VALUES (v_campaign.tenant_id, p_campaign_id, v_user, p_value);

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.place_unique_bid(uuid, numeric) FROM anon;

-- ============ RPC: get_my_unique_bid_status ============
CREATE OR REPLACE FUNCTION public.get_my_unique_bid_status(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_campaign public.unique_bid_campaigns;
  v_my jsonb;
  v_lowest_unique numeric;
  v_bucket_size numeric;
  v_hint_min numeric;
  v_hint_max numeric;
  v_total_participants int;
  v_total_bids int;
BEGIN
  SELECT * INTO v_campaign FROM public.unique_bid_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- meus palpites com unicidade e rank entre os únicos
  WITH counts AS (
    SELECT value, count(*) AS c FROM public.unique_bids WHERE campaign_id = p_campaign_id GROUP BY value
  ),
  uniques AS (
    SELECT value, row_number() OVER (ORDER BY value ASC) AS rk
    FROM counts WHERE c = 1
  ),
  mine AS (
    SELECT ub.value, ub.created_at, (c.c = 1) AS is_unique, u.rk AS rank
    FROM public.unique_bids ub
    JOIN counts c ON c.value = ub.value
    LEFT JOIN uniques u ON u.value = ub.value
    WHERE ub.campaign_id = p_campaign_id AND ub.user_id = COALESCE(v_user, '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY ub.created_at ASC
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(mine.*)), '[]'::jsonb) INTO v_my FROM mine;

  SELECT min(value) INTO v_lowest_unique FROM (
    SELECT value FROM public.unique_bids WHERE campaign_id = p_campaign_id GROUP BY value HAVING count(*) = 1
  ) s;

  SELECT count(DISTINCT user_id), count(*) INTO v_total_participants, v_total_bids
  FROM public.unique_bids WHERE campaign_id = p_campaign_id;

  IF v_lowest_unique IS NOT NULL THEN
    v_bucket_size := GREATEST((v_campaign.max_bid_value - v_campaign.min_bid_value) / 10.0, v_campaign.bid_step);
    v_hint_min := v_campaign.min_bid_value + floor((v_lowest_unique - v_campaign.min_bid_value) / v_bucket_size) * v_bucket_size;
    v_hint_max := LEAST(v_hint_min + v_bucket_size, v_campaign.max_bid_value);
  END IF;

  RETURN jsonb_build_object(
    'my_bids', v_my,
    'hint_min', v_hint_min,
    'hint_max', v_hint_max,
    'has_unique', v_lowest_unique IS NOT NULL,
    'total_participants', v_total_participants,
    'total_bids', v_total_bids
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_unique_bid_status(uuid) FROM anon;

-- ============ RPC admin ============
CREATE OR REPLACE FUNCTION public.admin_close_unique_campaign(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

  RETURN jsonb_build_object('success', true, 'winner_value', v_winner_value, 'winner_user_id', v_winner_user);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_close_unique_campaign(uuid) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_unique_campaigns()
RETURNS SETOF jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  RETURN QUERY
  SELECT jsonb_build_object(
    'campaign', to_jsonb(c.*),
    'product', to_jsonb(p.*),
    'bid_count', (SELECT count(*) FROM public.unique_bids ub WHERE ub.campaign_id = c.id),
    'winner_profile', to_jsonb(wp.*)
  )
  FROM public.unique_bid_campaigns c
  LEFT JOIN public.products p ON p.id = c.product_id
  LEFT JOIN public.profiles wp ON wp.id = c.winner_user_id
  ORDER BY c.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_unique_campaigns() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_unique_campaign_bids(p_campaign_id uuid)
RETURNS SETOF jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', ub.id,
    'value', ub.value,
    'created_at', ub.created_at,
    'user_id', ub.user_id,
    'username', p.username,
    'full_name', p.full_name,
    'count_at_value', (SELECT count(*) FROM public.unique_bids ub2 WHERE ub2.campaign_id = ub.campaign_id AND ub2.value = ub.value)
  )
  FROM public.unique_bids ub
  LEFT JOIN public.profiles p ON p.id = ub.user_id
  WHERE ub.campaign_id = p_campaign_id
  ORDER BY ub.value ASC, ub.created_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_unique_campaign_bids(uuid) FROM anon, authenticated;

-- ============ Realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.unique_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.unique_bid_campaigns;
