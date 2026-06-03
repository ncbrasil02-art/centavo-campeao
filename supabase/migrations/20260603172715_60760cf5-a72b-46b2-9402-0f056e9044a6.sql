-- Force set the current test auction to live if it was stuck
UPDATE public.auctions 
SET status = 'live', 
    end_time = now() + (COALESCE(timer_duration, 30) || ' seconds')::interval,
    start_time = now() - interval '1 minute'
WHERE status = 'scheduled' AND id = '50534c29-a076-48a6-83ee-5ad1ba200fdf';

-- Improve tick_auctions to be more reliable
CREATE OR REPLACE FUNCTION public.tick_auctions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_started_count INTEGER := 0;
    v_finished_count INTEGER := 0;
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

    -- 2. Finalizar leilões expirados
    WITH pending AS (
        UPDATE public.auctions
        SET status = 'pending_audit'
        WHERE status = 'live' 
          AND end_time < (now() - interval '1.5 seconds')
        RETURNING id
    )
    SELECT count(*) INTO v_finished_count FROM pending;

    RETURN jsonb_build_object(
        'success', true, 
        'started', v_started_count, 
        'finished', v_finished_count,
        'timestamp', now()
    );
END;
$function$;
