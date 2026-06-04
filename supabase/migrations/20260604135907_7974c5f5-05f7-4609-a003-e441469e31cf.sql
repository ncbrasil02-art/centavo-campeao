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
    v_bid_threshold_ms INTEGER;
BEGIN
    -- Loop por todos os leilões ativos com robô habilitado
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

        -- Verifica se está dentro da janela de tempo configurada (Dispute Duration)
        IF v_minutes_since_start < COALESCE(v_settings.start_after_minutes, 0) THEN
            CONTINUE;
        END IF;

        IF (v_settings.dispute_duration_minutes IS NOT NULL AND v_minutes_since_start > v_settings.dispute_duration_minutes) OR
           (v_settings.stop_after_minutes IS NOT NULL AND v_minutes_since_start > v_settings.stop_after_minutes) THEN
            CONTINUE;
        END IF;

        -- Verifica se o último lance foi de robô
        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_should_bid := false;

        -- Lógica de disputa (Humano vs Robô):
        IF NOT v_last_bidder_is_bot THEN
            -- Se faltar menos de 3 segundos, o robô entra em modo de defesa agressiva
            -- Aumentamos de 1.5s para 3s para dar margem ao processamento do servidor
            IF v_time_remaining_ms <= 3000 THEN
                v_should_bid := true;
            ELSIF v_time_remaining_ms <= (v_auction.timer_duration * 1000 * 0.7) THEN
                -- Se o tempo estiver abaixo de 70% do total, chance de 85% de lance (ignora config baixa do usuário para garantir funcionamento)
                IF v_random_factor < 0.85 THEN
                    v_should_bid := true;
                END IF;
            END IF;

            IF v_should_bid THEN
                -- Seleciona um robô aleatório diferente de um possível último robô
                SELECT id INTO v_robot_id FROM public.profiles WHERE is_bot = true ORDER BY random() LIMIT 1;
                
                IF v_robot_id IS NOT NULL THEN
                    -- Chamada direta da função de lance
                    v_bid_result := public.place_bid(v_auction.id, v_robot_id);
                    IF (v_bid_result->>'success')::boolean THEN
                        v_bids_placed := v_bids_placed + 1;
                        UPDATE public.robot_settings SET last_robot_bid_at = now() WHERE id = v_settings.id;
                    END IF;
                END IF;
            END IF;
        
        -- Disputa INTERNA (Robô contra Robô) quando ativada no painel
        ELSIF COALESCE(v_settings.inner_dispute_enabled, false) AND v_time_remaining_ms <= 4000 THEN
            -- Robôs trocam lances entre si para manter o leilão vivo se faltar menos de 4s
            IF v_random_factor < 0.75 THEN
                SELECT id INTO v_robot_id FROM public.profiles WHERE is_bot = true AND id != v_auction.last_bidder_id ORDER BY random() LIMIT 1;
                IF v_robot_id IS NOT NULL THEN
                    v_bid_result := public.place_bid(v_auction.id, v_robot_id);
                    IF (v_bid_result->>'success')::boolean THEN
                        v_bids_placed := v_bids_placed + 1;
                    END IF;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'bids_placed', v_bids_placed);
END;
$$;