
-- ============ SUPPORT TICKETS ============
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and admins can view tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can create their own tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners and admins can update tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id, created_at DESC);

CREATE TRIGGER trg_support_tickets_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============ SUPPORT MESSAGES ============
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_admin_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket owner and admins can view messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Ticket owner and admins can insert messages"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id AND t.user_id = auth.uid()
      )
    )
  );

CREATE INDEX idx_support_messages_ticket ON public.support_messages(ticket_id, created_at ASC);

-- ============ RPCs ============

-- Histórico de lances do usuário
CREATE OR REPLACE FUNCTION public.get_my_bids_history(p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', b.id,
    'auction_id', b.auction_id,
    'price_at_bid', b.price_at_bid,
    'created_at', b.created_at,
    'auction_slug', a.slug,
    'auction_status', a.status,
    'product_name', pr.name,
    'product_image', COALESCE(pr.images->>0, NULL),
    'is_winner', (a.last_bidder_id = b.user_id AND a.status IN ('pending_audit','finished','confirmed'))
  )
  FROM public.bids b
  LEFT JOIN public.auctions a ON a.id = b.auction_id
  LEFT JOIN public.products pr ON pr.id = a.product_id
  WHERE b.user_id = auth.uid()
  ORDER BY b.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Palpites do Menor Lance Único do usuário
CREATE OR REPLACE FUNCTION public.get_my_unique_bids()
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  RETURN QUERY
  WITH counts AS (
    SELECT campaign_id, value, count(*) AS c
    FROM public.unique_bids
    GROUP BY campaign_id, value
  )
  SELECT jsonb_build_object(
    'id', ub.id,
    'campaign_id', ub.campaign_id,
    'value', ub.value,
    'created_at', ub.created_at,
    'is_unique', (c.c = 1),
    'campaign_status', cmp.status,
    'campaign_winner_value', cmp.winner_value,
    'campaign_winner_user_id', cmp.winner_user_id,
    'is_winner', (cmp.winner_user_id = ub.user_id AND cmp.winner_value = ub.value),
    'product_name', pr.name,
    'product_image', COALESCE(pr.images->>0, NULL)
  )
  FROM public.unique_bids ub
  JOIN counts c ON c.campaign_id = ub.campaign_id AND c.value = ub.value
  LEFT JOIN public.unique_bid_campaigns cmp ON cmp.id = ub.campaign_id
  LEFT JOIN public.products pr ON pr.id = cmp.product_id
  WHERE ub.user_id = auth.uid()
  ORDER BY ub.created_at DESC;
END;
$$;

-- Histórico de compras (pacotes)
CREATE OR REPLACE FUNCTION public.get_my_purchases()
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', t.id,
    'amount', t.amount,
    'status', t.status,
    'payment_method', t.payment_method,
    'description', t.description,
    'created_at', t.created_at,
    'package_name', bp.name,
    'bid_amount', bp.bid_amount
  )
  FROM public.transactions t
  LEFT JOIN public.bid_packages bp ON bp.id = t.package_id
  WHERE t.user_id = auth.uid() AND t.type = 'purchase'
  ORDER BY t.created_at DESC;
END;
$$;

-- Estatísticas do painel
CREATE OR REPLACE FUNCTION public.get_my_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_bids int;
  v_wins int;
  v_unique_bids int;
  v_total_spent numeric;
  v_purchases_count int;
  v_balance int;
  v_pending_payment int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  SELECT count(*) INTO v_bids FROM public.bids WHERE user_id = v_user;
  SELECT count(*) INTO v_wins FROM public.winners WHERE user_id = v_user;
  SELECT count(*) INTO v_unique_bids FROM public.unique_bids WHERE user_id = v_user;
  SELECT COALESCE(sum(amount),0), count(*) INTO v_total_spent, v_purchases_count
    FROM public.transactions WHERE user_id = v_user AND type = 'purchase' AND status = 'completed';
  SELECT COALESCE(bid_balance,0) INTO v_balance FROM public.profiles WHERE id = v_user;
  SELECT count(*) INTO v_pending_payment FROM public.winners
    WHERE user_id = v_user AND COALESCE(payment_status,'pending') NOT IN ('approved','paid');

  RETURN jsonb_build_object(
    'bids_count', v_bids,
    'wins_count', v_wins,
    'unique_bids_count', v_unique_bids,
    'total_spent', v_total_spent,
    'purchases_count', v_purchases_count,
    'bid_balance', v_balance,
    'pending_payment_count', v_pending_payment
  );
END;
$$;

-- Abrir ticket de suporte
CREATE OR REPLACE FUNCTION public.open_support_ticket(p_subject text, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ticket_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  IF p_subject IS NULL OR length(trim(p_subject)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Assunto muito curto.');
  END IF;
  IF p_body IS NULL OR length(trim(p_body)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Mensagem muito curta.');
  END IF;

  INSERT INTO public.support_tickets (user_id, subject)
  VALUES (v_user, left(trim(p_subject), 200))
  RETURNING id INTO v_ticket_id;

  INSERT INTO public.support_messages (ticket_id, user_id, body, is_admin_reply)
  VALUES (v_ticket_id, v_user, left(trim(p_body), 4000), false);

  RETURN jsonb_build_object('success', true, 'ticket_id', v_ticket_id);
END;
$$;

-- Responder ticket
CREATE OR REPLACE FUNCTION public.reply_support_ticket(p_ticket_id uuid, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_is_admin boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  IF p_body IS NULL OR length(trim(p_body)) < 1 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Mensagem vazia.');
  END IF;

  SELECT user_id INTO v_owner FROM public.support_tickets WHERE id = p_ticket_id;
  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ticket não encontrado.');
  END IF;

  v_is_admin := public.is_admin();
  IF v_owner <> v_user AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  INSERT INTO public.support_messages (ticket_id, user_id, body, is_admin_reply)
  VALUES (p_ticket_id, v_user, left(trim(p_body), 4000), v_is_admin);

  UPDATE public.support_tickets
    SET status = CASE WHEN v_is_admin THEN 'answered' ELSE 'open' END,
        updated_at = now()
    WHERE id = p_ticket_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Listar meus tickets com última mensagem
CREATE OR REPLACE FUNCTION public.get_my_tickets()
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', t.id,
    'subject', t.subject,
    'status', t.status,
    'priority', t.priority,
    'created_at', t.created_at,
    'updated_at', t.updated_at,
    'messages_count', (SELECT count(*) FROM public.support_messages m WHERE m.ticket_id = t.id),
    'last_message', (
      SELECT jsonb_build_object('body', m.body, 'is_admin_reply', m.is_admin_reply, 'created_at', m.created_at)
      FROM public.support_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1
    )
  )
  FROM public.support_tickets t
  WHERE t.user_id = auth.uid()
  ORDER BY t.updated_at DESC;
END;
$$;

-- Mensagens de um ticket específico
CREATE OR REPLACE FUNCTION public.get_ticket_messages(p_ticket_id uuid)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  SELECT user_id INTO v_owner FROM public.support_tickets WHERE id = p_ticket_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Ticket não encontrado'; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id', m.id,
    'body', m.body,
    'is_admin_reply', m.is_admin_reply,
    'user_id', m.user_id,
    'created_at', m.created_at
  )
  FROM public.support_messages m
  WHERE m.ticket_id = p_ticket_id
  ORDER BY m.created_at ASC;
END;
$$;
