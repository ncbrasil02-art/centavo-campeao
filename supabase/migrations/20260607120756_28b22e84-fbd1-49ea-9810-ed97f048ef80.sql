-- 1. Garantir que o leilão da GoPro continue recebendo lances para o teste
UPDATE public.auctions 
SET status = 'live', 
    end_time = now() + interval '20 seconds'
WHERE id = '537df60f-c71f-47dd-8906-4ed487ecaae3';

-- 2. Redefinir a função de robô para ser DETERMINÍSTICA (sem sorte, apenas trabalho)
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
    v_settings RECORD;
    v_should_bid BOOLEAN;
BEGIN
    FOR v_auction IN 
        SELECT a.id, a.last_bidder_id, a.end_time, a.target_winner
        FROM public.auctions a
        WHERE a.status = 'live' AND a.robot_enabled = true 
    LOOP
        SELECT * INTO v_settings FROM public.robot_settings WHERE auction_id = v_auction.id AND active = true;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_time_remaining_ms := EXTRACT(EPOCH FROM (v_auction.end_time - now())) * 1000;
        
        v_last_bidder_is_bot := false;
        IF v_auction.last_bidder_id IS NOT NULL THEN
            SELECT is_bot INTO v_last_bidder_is_bot FROM public.profiles WHERE id = v_auction.last_bidder_id;
        END IF;
        v_last_bidder_is_bot := COALESCE(v_last_bidder_is_bot, false);

        v_should_bid := false;

        -- LÓGICA DE TRABALHO GARANTIDO (Sem 'random' se o tempo estiver baixo)
        
        -- Se for FORÇAR ROBÔ ou DISPUTA INTERNA
        IF v_auction.target_winner = 'robot' OR COALESCE(v_settings.inner_dispute_enabled, false) THEN
            -- Se o último não é robô, cobre NA HORA
            IF NOT v_last_bidder_is_bot THEN
                v_should_bid := true;
            -- Se o último JÁ É robô, mas o tempo está abaixo de 10s, outro robô entra para trocar lances
            -- Removi o random para garantir que sempre haja troca de lances na disputa interna
            ELSIF v_time_remaining_ms < 10000 THEN
                v_should_bid := true;
            END IF;
        -- Se for contra humano e tempo acabando
        ELSIF NOT v_last_bidder_is_bot AND v_time_remaining_ms < 7000 THEN
            v_should_bid := true;
        END IF;

        -- EXECUÇÃO
        IF v_should_bid THEN
            -- Pega um robô diferente do último
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
