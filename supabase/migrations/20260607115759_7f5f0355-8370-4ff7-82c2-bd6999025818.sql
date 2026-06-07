-- 1. Forçar atualização do PlayStation que parece estar com tempo expirado mas status live
UPDATE public.auctions 
SET end_time = now() + interval '15 seconds' 
WHERE slug LIKE 'playstation%' AND status = 'live';

-- 2. Melhorar a tick_auctions para ser mais agressiva com robôs
CREATE OR REPLACE FUNCTION public.tick_auctions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

    -- 2. Processar lances de robô (Chamada da função otimizada)
    v_robot_bids := public.process_robot_bids();

    -- 3. Finalizar leilões expirados (Apenas se o robô não tiver dado lance e o tempo realmente passou)
    -- Se o target_winner for 'robot', damos uma tolerância maior para o robô agir
    WITH pending AS (
        UPDATE public.auctions
        SET status = 'pending_audit'
        WHERE status = 'live' 
          AND end_time < (now() - interval '1.5 second') -- Aumentado buffer para dar tempo ao robô
          AND (target_winner != 'robot' OR end_time < (now() - interval '5 second')) -- Se for robô, espera mais 5s antes de matar
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
$function$;
