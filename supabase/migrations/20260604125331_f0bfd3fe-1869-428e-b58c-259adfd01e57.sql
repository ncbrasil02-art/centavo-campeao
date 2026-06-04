-- 1. Melhorar a função process_robot_bids para respeitar os novos parâmetros do painel
CREATE OR REPLACE FUNCTION public.process_robot_bids()
RETURNS jsonb
LANGUAGE plpgsql
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
    FOR v_auction IN 
        SELECT a.id, a.timer_duration, a.last_bidder_id, a.end_time, a.start_time
        FROM public.auctions a
        WHERE a.status = 'live' AND a.robot_enabled = true 
    LOOP
        -- Pega as configurações específicas do robô para este leilão
        SELECT * INTO v_settings FROM public.robot_settings WHERE auction_id = v_auction.id AND active = true;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        v_random_factor := random();
        v_minutes_since_start := EXTRACT(EPOCH FROM (now() - v_auction.start_time)) / 60;

        -- Verifica se está dentro da janela de disputa configurada
        IF v_minutes_since_start < COALESCE(v_settings.start_after_minutes, 0) THEN
            CONTINUE;
        END IF;

        -- Se stop_after_minutes estiver definido, para após esse tempo
        IF v_settings.stop_after_minutes IS NOT NULL AND v_minutes_since_start > v_settings.stop_after_minutes THEN
            CONTINUE;
        END IF;

        -- Se dispute_duration_minutes estiver definido, para após esse tempo (prioridade se ambos existirem)
        IF v_settings.dispute_duration_minutes IS NOT NULL AND v_minutes_since_start > v_settings.dispute_duration_minutes THEN
            CONTINUE;
        END IF;

        -- Verifica se o último lance foi de robô
        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_should_bid := false;

        -- Lógica de disputa:
        IF NOT v_last_bidder_is_bot THEN
            -- Aumentamos a agressividade se o tempo estiver acabando para garantir que o robô responda
            -- Especialmente se o bid_chance for alto nas configurações
            
            IF v_time_remaining_ms <= 1500 THEN
                -- Últimos 1.5 segundos: Quase certo de dar lance se o chance permitir
                IF v_random_factor < COALESCE(v_settings.bid_chance, 0.95) THEN
                    v_should_bid := true;
                END IF;
            ELSIF v_time_remaining_ms <= 4000 THEN
                -- Entre 1.5s e 4s: Resposta estratégica
                IF v_random_factor < (COALESCE(v_settings.bid_chance, 0.5) * 0.8) THEN
                    v_should_bid := true;
                END IF;
            ELSIF v_time_remaining_ms <= (v_auction.timer_duration * 300) THEN
                -- Meio do caminho: Raro
                IF v_random_factor < 0.05 THEN
                    v_should_bid := true;
                END IF;
            END IF;

            IF v_should_bid THEN
                -- Seleciona um robô aleatório
                SELECT id INTO v_robot_id FROM public.profiles WHERE is_bot = true ORDER BY random() LIMIT 1;
                
                IF v_robot_id IS NOT NULL THEN
                    v_bid_result := public.place_bid(v_auction.id, v_robot_id);
                    IF (v_bid_result->>'success')::boolean THEN
                        v_bids_placed := v_bids_placed + 1;
                        UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE id = v_settings.id;
                    END IF;
                END IF;
            END IF;
        
        -- Disputa INTERNA (Robô contra Robô):
        ELSIF COALESCE(v_settings.inner_dispute_enabled, false) AND v_time_remaining_ms <= 2000 AND v_random_factor < 0.15 THEN
            SELECT id INTO v_robot_id FROM public.profiles WHERE is_bot = true AND id != v_auction.last_bidder_id ORDER BY random() LIMIT 1;
            IF v_robot_id IS NOT NULL THEN
                v_bid_result := public.place_bid(v_auction.id, v_robot_id);
                IF (v_bid_result->>'success')::boolean THEN
                    v_bids_placed := v_bids_placed + 1;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'bids_placed', v_bids_placed);
END;
$$;

-- 2. Corrigir a função tick_auctions para ser mais precisa e evitar gaps de finalização
CREATE OR REPLACE FUNCTION public.tick_auctions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

    -- 2. Processar lances de robô ANTES de finalizar (para dar chance de reação no mesmo tick)
    -- Isso ajuda se o tick demorar um pouco
    v_robot_bids := public.process_robot_bids();

    -- 3. Finalizar leilões expirados
    -- Usamos um pequeno buffer de 0.5s para evitar finalização prematura por lag de rede no cliente
    WITH pending AS (
        UPDATE public.auctions
        SET status = 'pending_audit'
        WHERE status = 'live' 
          AND end_time < (now() - interval '0.5 second')
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

-- 3. Garantir que as permissões estão corretas
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO anon;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_robot_bids() TO service_role;
