-- Atualizar tick_auctions para ser mais preciso
CREATE OR REPLACE FUNCTION public.tick_auctions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_pending_count INTEGER := 0;
    v_started_count INTEGER := 0;
    v_finished_count INTEGER := 0;
BEGIN
    -- 1. Iniciar leilões agendados
    WITH started AS (
        UPDATE public.auctions
        SET 
            status = 'live',
            -- Garantimos que o end_time seja exatamente timer_duration a partir de AGORA
            end_time = now() + (COALESCE(timer_duration, 15) || ' seconds')::interval
        WHERE status = 'scheduled' AND start_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_started_count FROM started;

    -- 2. Mover leilões expirados para auditoria pendente
    -- Usamos uma margem de 500ms para evitar que oscilações de rede finalizem o leilão prematuramente
    WITH pending AS (
        UPDATE public.auctions
        SET status = 'pending_audit'
        WHERE status = 'live' AND end_time < (now() - interval '500 milliseconds')
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

-- Limpar leilões que não funcionaram (opcional, mas ajuda a limpar a interface como solicitado)
UPDATE public.auctions 
SET status = 'finished' 
WHERE status IN ('live', 'scheduled') 
AND (end_time < now() OR start_time < now() - interval '30 minutes')
AND id NOT IN (SELECT id FROM public.auctions WHERE status = 'scheduled' AND start_time > now());

-- Criar um novo leilão de teste (iPhone 15 Pro) para iniciar em 1 minuto
INSERT INTO public.auctions (
    product_id, 
    status, 
    start_time, 
    timer_duration, 
    current_price, 
    bid_count,
    robot_enabled
) 
SELECT 
    id, 
    'scheduled', 
    now() + interval '1 minute', 
    30, 
    0.01, 
    0,
    true
FROM public.products 
WHERE name ILIKE '%iPhone 15 Pro%' 
LIMIT 1;
