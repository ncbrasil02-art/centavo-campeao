CREATE OR REPLACE FUNCTION public.tick_auctions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_finished_count INTEGER := 0;
    v_started_count INTEGER := 0;
BEGIN
    -- 1. Iniciar leilões agendados que já deveriam ter começado
    WITH started AS (
        UPDATE public.auctions
        SET 
            status = 'live',
            -- Inicializa o end_time com o timer_duration a partir de agora
            end_time = now() + (timer_duration || ' seconds')::interval
        WHERE status = 'scheduled' AND start_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_started_count FROM started;

    -- 2. Finalizar leilões que expiraram
    WITH finished AS (
        UPDATE public.auctions
        SET status = 'finished'
        WHERE status = 'live' AND end_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_finished_count FROM finished;

    RETURN jsonb_build_object(
        'success', true,
        'started_count', v_started_count,
        'finished_count', v_finished_count,
        'timestamp', now()
    );
END;
$$;