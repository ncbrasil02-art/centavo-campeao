-- 1. Reabrir o leilão do Apple Watch para teste real e imediato
UPDATE public.auctions 
SET status = 'live', 
    end_time = now() + interval '30 seconds',
    start_time = now() - interval '1 minute'
WHERE slug LIKE 'apple-watch%' OR id = '00c1aeb3-1b0d-4251-ad8f-bb363eba9ab3';

-- 2. Tornar o processamento de robôs MAIS AGRESSIVO
CREATE OR REPLACE FUNCTION public.process_robot_bids()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_auction RECORD;
    v_robot_id UUID;
    v_bid_result jsonb;
    v_bids_placed INTEGER := 0;
    v_last_bidder_is_bot BOOLEAN;
    v_time_remaining_ms FLOAT;
    v_random_factor FLOAT;
    v_settings RECORD;
    v_should_bid BOOLEAN;
BEGIN
    -- Processamos todos os leilões live com robô
    FOR v_auction IN 
        SELECT a.id, a.last_bidder_id, a.end_time, a.target_winner
        FROM public.auctions a
        WHERE a.status = 'live' AND a.robot_enabled = true 
    LOOP
        SELECT * INTO v_settings FROM public.robot_settings WHERE auction_id = v_auction.id AND active = true;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        v_random_factor := random();
        
        -- Verifica se o último bidder é robô
        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_should_bid := false;

        -- LÓGICA ULTRA AGRESSIVA
        
        -- Se for DISPUTA INTERNA ou FORÇAR ROBÔ
        IF v_auction.target_winner = 'robot' OR COALESCE(v_settings.inner_dispute_enabled, false) THEN
            -- Se eu NÃO sou o líder, eu DOU lance (sempre, para manter o leilão vivo)
            IF NOT v_last_bidder_is_bot THEN
                v_should_bid := true;
            -- Se JÁ é um robô liderando, mas o tempo está muito baixo, outro robô entra para trocar lances
            ELSIF v_time_remaining_ms < 6000 AND v_random_factor < 0.7 THEN
                v_should_bid := true;
            END IF;
        -- Se for contra humano
        ELSIF NOT v_last_bidder_is_bot AND v_time_remaining_ms < 8000 THEN
            v_should_bid := true;
        END IF;

        -- EXECUTAR LANCE IMEDIATO
        IF v_should_bid THEN
            -- Seleciona um robô diferente do atual
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

    RETURN jsonb_build_object('success', true, 'bids_placed', v_bids_placed, 'timestamp', now());
END;
$function$;
