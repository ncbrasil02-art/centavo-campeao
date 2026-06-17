CREATE OR REPLACE FUNCTION public.place_unique_bid(p_campaign_id uuid, p_value numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_campaign public.unique_bid_campaigns;
  v_balance int;
  v_purchased_bids int;
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
  IF v_campaign.bid_step > 0 AND mod((p_value - v_campaign.min_bid_value)::numeric, v_campaign.bid_step) <> 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Valor não respeita o incremento configurado.');
  END IF;

  -- Exigir que o usuário tenha comprado pelo menos um pacote (lances grátis de cadastro não valem aqui)
  SELECT COALESCE(SUM(bp.bid_amount), 0) INTO v_purchased_bids
  FROM public.transactions t
  JOIN public.bid_packages bp ON bp.id = t.package_id
  WHERE t.user_id = v_user
    AND t.type = 'purchase'
    AND t.status = 'completed';

  IF v_purchased_bids < 1 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Você precisa comprar um pacote de lances para participar do Menor Lance Único. Lances de boas-vindas só valem nos leilões de centavos.');
  END IF;

  SELECT bid_balance INTO v_balance FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF COALESCE(v_balance, 0) < 1 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Saldo de lances insuficiente.');
  END IF;

  -- Bypassar trigger de proteção e debitar 1 lance
  PERFORM set_config('app.allow_profile_update', 'true', true);
  UPDATE public.profiles SET bid_balance = bid_balance - 1 WHERE id = v_user;

  INSERT INTO public.unique_bids (tenant_id, campaign_id, user_id, value)
  VALUES (v_campaign.tenant_id, p_campaign_id, v_user, p_value);

  -- Registrar transação para histórico/contabilidade
  INSERT INTO public.transactions (user_id, amount, type, description, status)
  VALUES (v_user, -1, 'bid_usage', 'Palpite no Menor Lance Único (' || p_value::text || ')', 'completed');

  RETURN jsonb_build_object('success', true, 'new_balance', COALESCE(v_balance, 0) - 1);
END;
$function$;