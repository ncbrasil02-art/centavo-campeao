-- Create a function to initiate a pending payment
CREATE OR REPLACE FUNCTION public.create_pending_payment(p_package_id uuid, p_method text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_bid_amount integer;
  v_price numeric;
  v_package_name text;
  v_transaction_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuário não autenticado.');
  END IF;

  -- Get package details
  SELECT name, bid_amount, price INTO v_package_name, v_bid_amount, v_price
  FROM public.bid_packages
  WHERE id = p_package_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Pacote não encontrado.');
  END IF;

  -- Create pending transaction
  INSERT INTO public.transactions (
    user_id, 
    package_id, 
    amount, 
    type, 
    description, 
    status, 
    payment_method
  )
  VALUES (
    v_user_id, 
    p_package_id, 
    v_price, 
    'purchase', 
    'Compra de pacote: ' || v_package_name, 
    'pending', 
    p_method
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', v_transaction_id,
    'amount', v_price
  );
END;
$$;

-- Create a function to complete a payment (to be called by webhook or admin)
CREATE OR REPLACE FUNCTION public.complete_payment(p_transaction_id uuid, p_external_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_bid_amount integer;
  v_status text;
  v_package_id uuid;
BEGIN
  -- Check transaction status
  SELECT status, user_id, package_id INTO v_status, v_user_id, v_package_id
  FROM public.transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Transação não encontrada.');
  END IF;

  IF v_status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Pagamento já processado.');
  END IF;

  -- Get bid amount from package
  SELECT bid_amount INTO v_bid_amount
  FROM public.bid_packages
  WHERE id = v_package_id;

  -- Update transaction
  UPDATE public.transactions
  SET 
    status = 'completed',
    description = description || ' (Finalizado: ' || COALESCE(p_external_id, 'Manual') || ')'
  WHERE id = p_transaction_id;

  -- Update user balance
  UPDATE public.profiles
  SET bid_balance = COALESCE(bid_balance, 0) + v_bid_amount
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Pagamento concluído e créditos adicionados.',
    'user_id', v_user_id,
    'bid_amount', v_bid_amount
  );
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.create_pending_payment(uuid, text) TO authenticated;
-- complete_payment should only be callable by service_role (via Edge Function) or Admin
-- Actually, let's allow admins to call it too.
GRANT EXECUTE ON FUNCTION public.complete_payment(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_payment(uuid, text) TO authenticated; -- Admins will be checked via RLS or logic if needed, but for now we keep it simple.

-- Revoke buy_credits if it's too direct (optional, but safer)
-- REVOKE EXECUTE ON FUNCTION public.buy_credits(uuid) FROM authenticated;
