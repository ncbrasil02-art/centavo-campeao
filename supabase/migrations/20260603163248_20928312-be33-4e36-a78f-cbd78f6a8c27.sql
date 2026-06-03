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
    v_is_admin BOOLEAN;
BEGIN
    -- Permitir service_role (cron) ou admins
    SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
    
    IF auth.uid() IS NOT NULL AND NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Não autorizado');
    END IF;

    -- 1. Iniciar leilões agendados
    WITH started AS (
        UPDATE public.auctions
        SET 
            status = 'live',
            -- Garante que o end_time inicial use o timer_duration configurado
            end_time = now() + (COALESCE(timer_duration, 15) || ' seconds')::interval
        WHERE status = 'scheduled' AND start_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_started_count FROM started;

    -- 2. Mover leilões expirados para auditoria pendente
    -- Adicionamos uma pequena margem de segurança de 1 segundo para evitar problemas de sincronia
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