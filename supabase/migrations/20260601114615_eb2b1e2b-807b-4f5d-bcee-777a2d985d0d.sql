ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT,
ADD COLUMN IF NOT EXISTS pix_qr_code TEXT;

-- Update the complete_payment function to handle external_id correctly if needed
-- (The existing function already uses p_external_id as a parameter and updates description, but let's make it store it in the column too)
CREATE OR REPLACE FUNCTION public.complete_payment(p_transaction_id uuid, p_external_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
     external_id = COALESCE(p_external_id, external_id),
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
 $function$;
