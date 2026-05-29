-- Create a function to safely increment bid balance
CREATE OR REPLACE FUNCTION public.increment_bid_balance(p_user_id UUID, p_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if the current user is an admin
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  
  IF NOT v_is_admin AND auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Não autorizado');
  END IF;

  -- Update balance
  UPDATE public.profiles
  SET bid_balance = COALESCE(bid_balance, 0) + p_amount
  WHERE id = p_user_id
  RETURNING bid_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuário não encontrado');
  END IF;

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.increment_bid_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_bid_balance TO service_role;
