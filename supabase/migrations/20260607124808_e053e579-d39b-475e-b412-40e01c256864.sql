-- 1. Melhorar a função de dar lance (Humano)
CREATE OR REPLACE FUNCTION public.place_bid(p_auction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_current_price DECIMAL(10, 2);
    v_bid_balance INTEGER;
    v_auction_status TEXT;
    v_end_time TIMESTAMP WITH TIME ZONE;
    v_timer_duration INTEGER;
    v_bid_cost INTEGER := 1;
    v_modality TEXT;
    v_min_balance_required NUMERIC(10,2);
    v_user_gender TEXT;
    v_has_won BOOLEAN;
    v_is_bot BOOLEAN;
    v_now TIMESTAMP WITH TIME ZONE;
BEGIN
    v_user_id := auth.uid();
    v_now := clock_timestamp(); -- Usar clock_timestamp para precisão absoluta
    
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'Usuário não autenticado.');
    END IF;

    -- Habilita acesso privilegiado
    PERFORM set_config('app.allow_profile_update', 'true', true);
    PERFORM set_config('app.allow_auction_update', 'true', true);
    PERFORM set_config('app.allow_bid_insert', 'true', true);

    -- 1. Detalhes do leilão com LOCK
    SELECT status, current_price, end_time, timer_duration, modality, min_balance_required
    INTO v_auction_status, v_current_price, v_end_time, v_timer_duration, v_modality, v_min_balance_required
    FROM public.auctions
    WHERE id = p_auction_id
    FOR UPDATE;

    -- SOLUÇÃO DEFINITIVA: Se o tempo real (clock_timestamp) passou do end_time, acabou.
    IF v_auction_status != 'live' THEN
      RETURN jsonb_build_object('success', false, 'message', 'O leilão não está ativo.');
    END IF;

    IF v_end_time <= v_now THEN
      UPDATE public.auctions SET status = 'pending_audit' WHERE id = p_auction_id;
      RETURN jsonb_build_object('success', false, 'message', 'O leilão já encerrou (Tempo esgotado).');
    END IF;

    -- 2. Verificar perfil
    SELECT bid_balance, gender, is_bot INTO v_bid_balance, v_user_gender, v_is_bot
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    -- Restrições de Modalidade
    IF NOT COALESCE(v_is_bot, false) THEN
      IF v_modality = 'novice' THEN
        SELECT EXISTS (SELECT 1 FROM public.winners WHERE user_id = v_user_id) INTO v_has_won;
        IF v_has_won THEN
          RETURN jsonb_build_object('success', false, 'message', 'Este leilão é exclusivo para quem nunca ganhou.');
        END IF;
      END IF;

      IF v_modality = 'male' AND (v_user_gender IS NULL OR v_user_gender != 'male') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este leilão é exclusivo para homens.');
      END IF;
      IF v_modality = 'female' AND (v_user_gender IS NULL OR v_user_gender != 'female') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Este leilão é exclusivo para mulheres.');
      END IF;

      IF v_modality = 'min_balance' AND v_bid_balance < v_min_balance_required THEN
        RETURN jsonb_build_object('success', false, 'message', 'Saldo mínimo de ' || v_min_balance_required || ' lances necessário.');
      END IF;
    END IF;

    -- 3. Custo do lance
    IF v_modality = 'free' THEN v_bid_cost := 0; END IF;

    -- 4. Saldo
    IF v_bid_balance < v_bid_cost THEN
      RETURN jsonb_build_object('success', false, 'message', 'Saldo de lances insuficiente.');
    END IF;

    -- 5. Deduzir saldo
    IF v_bid_cost > 0 THEN
      UPDATE public.profiles SET bid_balance = bid_balance - v_bid_cost WHERE id = v_user_id;
    END IF;

    -- 6. Atualizar leilão
    UPDATE public.auctions
    SET
      current_price = current_price + 0.01,
      bid_count = bid_count + 1,
      last_bidder_id = v_user_id,
      end_time = v_now + (v_timer_duration || ' seconds')::interval
    WHERE id = p_auction_id;

    -- 7. Registrar lance
    INSERT INTO public.bids (auction_id, user_id, price_at_bid)
    VALUES (p_auction_id, v_user_id, v_current_price + 0.01);

    RETURN jsonb_build_object('success', true, 'new_price', v_current_price + 0.01);
END;
$$;

-- 2. Melhorar a função de dar lance (Robô)
CREATE OR REPLACE FUNCTION public.place_robot_bid(p_auction_id uuid, p_robot_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_price DECIMAL(10, 2);
  v_timer_duration INTEGER;
  v_end_time TIMESTAMP WITH TIME ZONE;
  v_now TIMESTAMP WITH TIME ZONE;
BEGIN
  v_now := clock_timestamp();
  
  -- LOCK
  SELECT current_price, timer_duration, end_time INTO v_current_price, v_timer_duration, v_end_time
  FROM public.auctions WHERE id = p_auction_id AND status = 'live' FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Leilão não encontrado ou não está live');
  END IF;

  -- Se já passou do tempo, não deixa o robô dar lance (evita "ressurreição" fantasma)
  IF v_end_time <= v_now THEN
    UPDATE public.auctions SET status = 'pending_audit' WHERE id = p_auction_id;
    RETURN jsonb_build_object('success', false, 'message', 'Tempo esgotado.');
  END IF;

  UPDATE public.auctions 
  SET 
    current_price = current_price + 0.01,
    bid_count = bid_count + 1,
    last_bidder_id = p_robot_id,
    end_time = v_now + (v_timer_duration || ' seconds')::interval
  WHERE id = p_auction_id;

  INSERT INTO public.bids (auction_id, user_id, price_at_bid) 
  VALUES (p_auction_id, p_robot_id, v_current_price + 0.01);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Melhorar o tick_auctions
CREATE OR REPLACE FUNCTION public.tick_auctions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_started_count INTEGER := 0;
    v_finished_count INTEGER := 0;
    v_robot_bids jsonb;
    v_now TIMESTAMP WITH TIME ZONE;
BEGIN
    v_now := clock_timestamp();

    -- 1. Iniciar leilões agendados
    WITH started AS (
        UPDATE public.auctions
        SET 
            status = 'live',
            end_time = v_now + (COALESCE(timer_duration, 15) || ' seconds')::interval
        WHERE status = 'scheduled' AND start_time <= v_now
        RETURNING id
    )
    SELECT count(*) INTO v_started_count FROM started;

    -- 2. Processar lances de robô IMEDIATAMENTE
    v_robot_bids := public.process_robot_bids();

    -- 3. Finalizar leilões expirados
    WITH pending AS (
        UPDATE public.auctions
        SET status = 'pending_audit'
        WHERE status = 'live' 
          AND (
            (target_winner != 'robot' AND end_time < (v_now - interval '0.5 seconds'))
            OR 
            (target_winner = 'robot' AND end_time < (v_now - interval '2 seconds'))
          )
        RETURNING id
    )
    SELECT count(*) INTO v_finished_count FROM pending;

    RETURN jsonb_build_object(
        'success', true, 
        'started', v_started_count, 
        'finished', v_finished_count,
        'robot_bids', v_robot_bids,
        'timestamp', v_now
    );
END;
$$;