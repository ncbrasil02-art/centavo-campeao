CREATE OR REPLACE FUNCTION public.pay_with_bid_balance(p_auction_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_final_price NUMERIC;
    v_bid_balance INTEGER;
    v_needed_bids INTEGER;
BEGIN
    -- Obter o ID do usuário que chama a função
    v_user_id := auth.uid();
    
    -- Verificar se o usuário é o ganhador e obter o preço final
    SELECT user_id, final_price INTO v_user_id, v_final_price
    FROM public.winners
    WHERE auction_id = p_auction_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Leilão não encontrado ou você não é o ganhador.');
    END IF;

    -- Obter saldo de lances do usuário
    SELECT bid_balance INTO v_bid_balance
    FROM public.profiles
    WHERE id = v_user_id;

    -- Calcular quantos lances são necessários (1 lance = R$ 1,00)
    v_needed_bids := ceil(v_final_price);

    -- Verificar se o usuário tem saldo suficiente
    IF v_bid_balance < v_needed_bids THEN
        RETURN json_build_object('success', false, 'message', 'Saldo de lances insuficiente. Você precisa de ' || v_needed_bids || ' lances.');
    END IF;

    -- Deduzir lances do perfil
    UPDATE public.profiles
    SET bid_balance = bid_balance - v_needed_bids
    WHERE id = v_user_id;

    -- Atualizar status do pagamento na tabela winners
    UPDATE public.winners
    SET payment_status = 'approved',
        payment_receipt_url = 'PAGO COM SALDO DE LANCES'
    WHERE auction_id = p_auction_id;

    -- Registrar a transação
    INSERT INTO public.transactions (user_id, amount, description, type, status)
    VALUES (v_user_id, -v_needed_bids, 'Pagamento de leilão ' || p_auction_id || ' com saldo de lances', 'bid_usage', 'completed');

    RETURN json_build_object('success', true, 'message', 'Pagamento realizado com sucesso usando seu saldo de lances!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.pay_with_bid_balance(UUID) TO authenticated;
