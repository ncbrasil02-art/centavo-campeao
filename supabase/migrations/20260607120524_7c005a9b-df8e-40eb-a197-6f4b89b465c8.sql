-- Ajustar o leilão mais recente (GoPro) para garantir o comportamento robô vs robô
UPDATE public.auctions 
SET target_winner = 'robot'
WHERE id = '537df60f-c71f-47dd-8906-4ed487ecaae3';

-- Garantir que a disputa interna esteja ativa
UPDATE public.robot_settings
SET inner_dispute_enabled = true
WHERE auction_id = '537df60f-c71f-47dd-8906-4ed487ecaae3';
