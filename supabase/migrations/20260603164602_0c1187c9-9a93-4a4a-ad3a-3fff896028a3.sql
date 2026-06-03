-- Update tick_auctions to reset start_time when going live
CREATE OR REPLACE FUNCTION public.tick_auctions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_pending_count INTEGER := 0;
    v_started_count INTEGER := 0;
    v_finished_count INTEGER := 0;
BEGIN
    -- 1. Iniciar leilões agendados
    -- Atualizamos o start_time para now() para que o cronômetro de duração dos robôs 
    -- comece a contar a partir do início real do leilão.
    WITH started AS (
        UPDATE public.auctions
        SET 
            status = 'live',
            start_time = now(),
            end_time = now() + (COALESCE(timer_duration, 15) || ' seconds')::interval
        WHERE status = 'scheduled' AND start_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_started_count FROM started;

    -- 2. Mover leilões expirados para auditoria pendente
    WITH pending AS (
        UPDATE public.auctions
        SET status = 'pending_audit'
        WHERE status = 'live' AND end_time <= (now() - interval '1 second')
        RETURNING id
    )
    SELECT count(*) INTO v_pending_count FROM pending;

    -- 3. Mover confirmados para finalizados após 5 minutos
    WITH finished AS (
        UPDATE public.auctions
        SET status = 'finished'
        WHERE status = 'confirmed' AND confirmed_at <= now() - interval '5 minutes'
        RETURNING id
    )
    SELECT count(*) INTO v_finished_count FROM finished;

    RETURN jsonb_build_object(
        'success', true,
        'started_count', v_started_count,
        'pending_count', v_pending_count,
        'finished_count', v_finished_count,
        'timestamp', now()
    );
END;
$function$;
