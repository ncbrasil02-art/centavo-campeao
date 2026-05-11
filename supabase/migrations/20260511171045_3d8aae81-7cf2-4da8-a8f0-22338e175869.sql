-- 1. Função para registrar o ganhador automaticamente quando um leilão muda para 'finished'
CREATE OR REPLACE FUNCTION public.handle_auction_finished()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'finished' AND OLD.status != 'finished') THEN
        -- Garantir que não exista um ganhador já registrado
        IF NOT EXISTS (SELECT 1 FROM public.winners WHERE auction_id = NEW.id) THEN
            -- Inserir o ganhador (último bidder)
            IF NEW.last_bidder_id IS NOT NULL THEN
                INSERT INTO public.winners (
                    auction_id, 
                    user_id, 
                    final_price,
                    savings_percentage
                ) 
                SELECT 
                    NEW.id, 
                    NEW.last_bidder_id, 
                    NEW.current_price,
                    100 - (NEW.current_price * 100 / p.price)
                FROM public.products p
                WHERE p.id = NEW.product_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para registrar ganhador
DROP TRIGGER IF EXISTS tr_handle_auction_finished ON public.auctions;
CREATE TRIGGER tr_handle_auction_finished
    AFTER UPDATE ON public.auctions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auction_finished();

-- 2. Melhorar a função de lance para ser mais robusta e tratar expiração
CREATE OR REPLACE FUNCTION public.place_bid(p_auction_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_price DECIMAL(10, 2);
  v_bid_balance INTEGER;
  v_auction_status TEXT;
  v_end_time TIMESTAMP WITH TIME ZONE;
  v_bid_cost INTEGER := 1;
BEGIN
  -- Security check
  IF p_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Ação não autorizada.');
  END IF;

  -- 1. Check auction status and time
  SELECT status, current_price, end_time INTO v_auction_status, v_current_price, v_end_time
  FROM public.auctions 
  WHERE id = p_auction_id
  FOR UPDATE; -- Lock row for concurrency
  
  IF v_auction_status != 'live' THEN
    RETURN jsonb_build_object('success', false, 'message', 'O leilão não está ativo.');
  END IF;

  -- Se o tempo já expirou, finalizar o leilão agora e recusar o lance
  IF v_end_time <= now() THEN
    UPDATE public.auctions SET status = 'finished' WHERE id = p_auction_id;
    RETURN jsonb_build_object('success', false, 'message', 'O leilão já encerrou.');
  END IF;

  -- 2. Check user balance
  SELECT bid_balance INTO v_bid_balance 
  FROM public.profiles 
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF v_bid_balance < v_bid_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Saldo de lances insuficiente.');
  END IF;

  -- 3. Deduct balance
  UPDATE public.profiles 
  SET bid_balance = bid_balance - v_bid_cost 
  WHERE id = p_user_id;

  -- 4. Update auction
  UPDATE public.auctions 
  SET 
    current_price = current_price + 0.01,
    bid_count = bid_count + 1,
    last_bidder_id = p_user_id,
    end_time = CASE 
      WHEN (end_time - now()) < interval '15 seconds' THEN now() + interval '15 seconds'
      ELSE end_time
    END
  WHERE id = p_auction_id;

  -- 5. Record bid
  INSERT INTO public.bids (auction_id, user_id, price_at_bid) 
  VALUES (p_auction_id, p_user_id, v_current_price + 0.01);

  RETURN jsonb_build_object('success', true, 'new_price', v_current_price + 0.01);
END;
$function$;

-- 3. Função para "bater" nos leilões (heartbeat)
-- Esta função encerra leilões expirados e pode ser chamada periodicamente
CREATE OR REPLACE FUNCTION public.tick_auctions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_finished_count INTEGER;
BEGIN
    -- Finalizar leilões que expiraram
    WITH updated AS (
        UPDATE public.auctions
        SET status = 'finished'
        WHERE status = 'live' AND end_time <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_finished_count FROM updated;

    RETURN jsonb_build_object(
        'success', true,
        'finished_count', v_finished_count,
        'timestamp', now()
    );
END;
$$;

-- 4. Melhorar place_robot_bid para incluir log de auditoria ou triggers se necessário
-- (Já parece bem funcional, mas garantindo que respeite a expiração)
CREATE OR REPLACE FUNCTION public.place_robot_bid(p_auction_id uuid, p_robot_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_price DECIMAL(10, 2);
  v_auction_status TEXT;
  v_end_time TIMESTAMP WITH TIME ZONE;
  v_is_bot BOOLEAN;
BEGIN
  -- Verify bot
  SELECT is_bot INTO v_is_bot FROM public.profiles WHERE id = p_robot_id;
  IF NOT v_is_bot THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este usuário não é um robô.');
  END IF;

  -- Check status
  SELECT status, current_price, end_time INTO v_auction_status, v_current_price, v_end_time
  FROM public.auctions 
  WHERE id = p_auction_id
  FOR UPDATE;
  
  IF v_auction_status != 'live' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Leilão inativo.');
  END IF;

  IF v_end_time <= now() THEN
    UPDATE public.auctions SET status = 'finished' WHERE id = p_auction_id;
    RETURN jsonb_build_object('success', false, 'message', 'Leilão expirado.');
  END IF;

  -- Update auction
  UPDATE public.auctions 
  SET 
    current_price = current_price + 0.01,
    bid_count = bid_count + 1,
    last_bidder_id = p_robot_id,
    end_time = CASE 
      WHEN (end_time - now()) < interval '15 seconds' THEN now() + interval '15 seconds'
      ELSE end_time
    END
  WHERE id = p_auction_id;

  -- Record bid
  INSERT INTO public.bids (auction_id, user_id, price_at_bid) 
  VALUES (p_auction_id, p_robot_id, v_current_price + 0.01);

  RETURN jsonb_build_object('success', true, 'new_price', v_current_price + 0.01);
END;
$function$;
