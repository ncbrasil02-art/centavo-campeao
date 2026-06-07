CREATE OR REPLACE FUNCTION public.process_robot_bids()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_auction RECORD;
    v_robot_id UUID;
    v_bid_result jsonb;
    v_bids_placed INTEGER := 0;
    v_last_bidder_is_bot BOOLEAN;
    v_time_remaining_ms FLOAT;
    v_settings RECORD;
    v_should_bid BOOLEAN;
    v_random_factor FLOAT;
BEGIN
    FOR v_auction IN 
        SELECT a.id, a.last_bidder_id, a.end_time, a.target_winner
        FROM public.auctions a
        WHERE a.status = 'live' AND a.robot_enabled = true 
    LOOP
        SELECT * INTO v_settings FROM public.robot_settings WHERE auction_id = v_auction.id AND active = true;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - clock_timestamp())) * 1000;
        
        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_should_bid := false;
        v_random_factor := random();

        -- LÓGICA DE LANCES NATURAIS
        
        -- 1. RESGATE DE EMERGÊNCIA: Se o tempo expirou ou está quase expirando (< 500ms)
        IF v_time_remaining_ms < 500 THEN
            v_should_bid := true;
        
        -- 2. DISPUTA INTERNA OU FORÇAR ROBÔ
        ELSIF v_auction.target_winner = 'robot' OR COALESCE(v_settings.inner_dispute_enabled, false) THEN
            IF NOT v_last_bidder_is_bot THEN
                -- Se humano deu lance, robô cobre nos últimos segundos de forma natural
                IF v_time_remaining_ms < 3000 THEN
                    v_should_bid := true;
                ELSIF v_time_remaining_ms < 6000 AND v_random_factor < 0.4 THEN
                    v_should_bid := true;
                END IF;
            ELSE
                -- Se robô já é o último, disputa interna entre robôs
                -- Só troca lances nos últimos segundos para não "queimar" tempo
                IF v_time_remaining_ms < 2500 AND v_random_factor < 0.7 THEN
                    v_should_bid := true;
                END IF;
            END IF;

        -- 3. COMPORTAMENTO PADRÃO CONTRA HUMANOS
        ELSIF NOT v_last_bidder_is_bot THEN
            -- Prioridade máxima nos últimos 3 segundos
            IF v_time_remaining_ms < 3000 THEN
                v_should_bid := (v_random_factor < 0.9); -- 90% de chance de cobrir nos últimos 3s
            -- Chance moderada entre 3s e 5s
            ELSIF v_time_remaining_ms < 5000 THEN
                v_should_bid := (v_random_factor < 0.3); -- 30% de chance
            -- Algumas vezes acima de 5s para parecer natural
            ELSIF v_time_remaining_ms < 8000 THEN
                v_should_bid := (v_random_factor < 0.1); -- 10% de chance
            END IF;
        END IF;

        -- EXECUÇÃO
        IF v_should_bid THEN
            -- Pega um robô aleatório diferente do último
            SELECT id INTO v_robot_id 
            FROM public.profiles 
            WHERE is_bot = true 
              AND id != COALESCE(v_auction.last_bidder_id, '00000000-0000-0000-0000-000000000000'::uuid)
            ORDER BY random() 
            LIMIT 1;

            IF v_robot_id IS NOT NULL THEN
                v_bid_result := public.place_robot_bid(v_auction.id, v_robot_id);
                IF (v_bid_result->>'success')::boolean THEN
                    v_bids_placed := v_bids_placed + 1;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'bids_placed', v_bids_placed, 'timestamp', clock_timestamp());
END;
$function$;