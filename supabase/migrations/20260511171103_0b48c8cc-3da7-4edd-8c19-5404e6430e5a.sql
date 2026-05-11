-- Função para processar lances de robôs automaticamente
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
BEGIN
    -- Encontrar leilões ativos que tenham robôs habilitados e estejam nos últimos segundos
    FOR v_auction IN 
        SELECT a.id, s.min_delay, s.max_delay, s.bid_chance
        FROM public.auctions a
        JOIN public.robot_settings s ON a.id = s.auction_id
        WHERE a.status = 'live' 
          AND a.robot_enabled = true 
          AND s.active = true
          AND (a.end_time - now()) < interval '10 seconds' -- Robôs agem nos últimos 10 segundos
    LOOP
        -- Chance de o robô dar um lance (baseado no bid_chance 0-1)
        IF random() < v_auction.bid_chance THEN
            -- Selecionar um robô aleatório
            SELECT id INTO v_robot_id 
            FROM public.profiles 
            WHERE is_bot = true 
            ORDER BY random() 
            LIMIT 1;

            IF v_robot_id IS NOT NULL THEN
                -- Realizar o lance do robô
                v_bid_result := public.place_robot_bid(v_auction.id, v_robot_id);
                IF (v_bid_result->>'success')::boolean THEN
                    v_bids_placed := v_bids_placed + 1;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'bids_placed', v_bids_placed,
        'timestamp', now()
    );
END;
$$;
