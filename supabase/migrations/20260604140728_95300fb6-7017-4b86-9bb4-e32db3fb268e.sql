-- 1. Melhorar a função process_robot_bids para ser mais robusta e respeitar target_winner
CREATE OR REPLACE FUNCTION public.process_robot_bids()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auction RECORD;
    v_robot_id UUID;
    v_bid_result jsonb;
    v_bids_placed INTEGER := 0;
    v_last_bidder_is_bot BOOLEAN;
    v_time_remaining_ms FLOAT;
    v_random_factor FLOAT;
    v_minutes_since_start FLOAT;
    v_settings RECORD;
    v_should_bid BOOLEAN;
BEGIN
    -- Loop por todos os leilões ativos com robô habilitado
    FOR v_auction IN 
        SELECT a.id, a.timer_duration, a.last_bidder_id, a.end_time, a.start_time, a.target_winner
        FROM public.auctions a
        WHERE a.status = 'live' AND a.robot_enabled = true 
    LOOP
        -- SEGURANÇA EXTRA: Nunca dar lance se o leilão ainda não deveria ter começado
        IF now() < v_auction.start_time THEN
            CONTINUE;
        END IF;

        -- Pega as configurações específicas do robô para este leilão
        SELECT * INTO v_settings FROM public.robot_settings WHERE auction_id = v_auction.id AND active = true;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        v_random_factor := random();
        v_minutes_since_start := EXTRACT(EPOCH FROM (now() - v_auction.start_time)) / 60;

        -- Verifica se está dentro da janela de tempo configurada
        IF v_minutes_since_start < COALESCE(v_settings.start_after_minutes, 0) THEN
            CONTINUE;
        END IF;

        IF (v_settings.dispute_duration_minutes IS NOT NULL AND v_minutes_since_start > v_settings.dispute_duration_minutes) OR
           (v_settings.stop_after_minutes IS NOT NULL AND v_minutes_since_start > v_settings.stop_after_minutes) THEN
            -- Se o tempo de disputa acabou e o alvo era o robô, ele ainda pode tentar um último lance se não for o vencedor
            IF v_auction.target_winner = 'robot' AND v_auction.last_bidder_id IS NOT NULL THEN
                 SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
                 IF COALESCE(v_last_bidder_is_bot, false) THEN
                    CONTINUE;
                 END IF;
            ELSE
                CONTINUE;
            END IF;
        END IF;

        -- Verifica se o último lance foi de robô
        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_should_bid := false;

        -- Lógica baseada no TARGET_WINNER
        IF v_auction.target_winner = 'robot' THEN
            -- Se o alvo é o robô ganhar, ele DEVE cobrir qualquer lance humano
            IF NOT v_last_bidder_is_bot THEN
                -- Se o tempo estiver baixo (menos de 80% do total ou menos de 5s), ele cobre
                IF v_time_remaining_ms <= 5000 OR v_time_remaining_ms <= (v_auction.timer_duration * 1000 * 0.8) THEN
                    v_should_bid := true;
                END IF;
            END IF;
        ELSIF v_auction.target_winner = 'user' THEN
            -- Se o alvo é o usuário ganhar, o robô para de dar lances se o tempo estiver baixo
            IF NOT v_last_bidder_is_bot AND v_time_remaining_ms <= 10000 THEN
                v_should_bid := false; -- Deixa o usuário ganhar
            ELSIF NOT v_last_bidder_is_bot AND v_random_factor < 0.3 THEN
                v_should_bid := true; -- Dá lances ocasionais para fingir disputa no início
            END IF;
        ELSE
            -- Lógica Padrão (Humano vs Robô - Aleatório/Equilibrado)
            IF NOT v_last_bidder_is_bot THEN
                IF v_time_remaining_ms <= 3000 THEN
                    v_should_bid := true;
                ELSIF v_time_remaining_ms <= (v_auction.timer_duration * 1000 * 0.7) THEN
                    IF v_random_factor < 0.85 THEN
                        v_should_bid := true;
                    END IF;
                END IF;
            END IF;
        END IF;

        -- Disputa INTERNA (Robô contra Robô) - ativa se inner_dispute_enabled estiver true
        IF NOT v_should_bid AND COALESCE(v_settings.inner_dispute_enabled, false) AND v_time_remaining_ms <= 4000 THEN
            -- Se o último lance foi de robô, outro robô pode cobrir para manter o leilão vivo
            -- Mas apenas se o alvo não for o usuário (para não atrapalhar o usuário de ganhar)
            IF v_auction.target_winner != 'user' AND v_random_factor < 0.5 THEN
                v_should_bid := true;
            END IF;
        END IF;

        IF v_should_bid THEN
            -- Seleciona um robô aleatório diferente do último
            SELECT id INTO v_robot_id FROM public.profiles WHERE is_bot = true AND id != COALESCE(v_auction.last_bidder_id, '00000000-0000-0000-0000-000000000000'::uuid) ORDER BY random() LIMIT 1;
            
            IF v_robot_id IS NOT NULL THEN
                v_bid_result := public.place_bid(v_auction.id, v_robot_id);
                IF (v_bid_result->>'success')::boolean THEN
                    v_bids_placed := v_bids_placed + 1;
                    UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE id = v_settings.id;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'bids_placed', v_bids_placed);
END;
$$;

-- 2. Corrigir a função tick_auctions para ser mais precisa
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
BEGIN
    -- 1. Iniciar leilões agendados
    WITH started AS (
        UPDATE public.auctions
        SET 
            status = 'live',
            end_time = now() + (COALESCE(timer_duration, 15) || ' seconds')::interval
        WHERE status = 'scheduled' AND start_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_started_count FROM started;

    -- 2. Processar lances de robô
    v_robot_bids := public.process_robot_bids();

    -- 3. Finalizar leilões expirados
    -- Aumentamos o buffer para 0.8s para ser mais conservador e evitar reclamações de "lance sumiu"
    WITH pending AS (
        UPDATE public.auctions
        SET status = 'pending_audit'
        WHERE status = 'live' 
          AND end_time < (now() - interval '0.8 second')
        RETURNING id
    )
    SELECT count(*) INTO v_finished_count FROM pending;

    RETURN jsonb_build_object(
        'success', true, 
        'started', v_started_count, 
        'finished', v_finished_count,
        'robot_bids', v_robot_bids,
        'timestamp', now()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.tick_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO anon;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO service_role;