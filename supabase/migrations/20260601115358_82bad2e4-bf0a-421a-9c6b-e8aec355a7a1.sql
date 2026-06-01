CREATE OR REPLACE FUNCTION public.create_pending_payment(p_package_id uuid, p_method text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 DECLARE
   v_user_id uuid;
   v_bid_amount integer;
   v_price numeric;
   v_package_name text;
   v_transaction_id uuid;
 BEGIN
   -- Use provided user_id or fall back to auth.uid()
   v_user_id := COALESCE(p_user_id, auth.uid());
                                                                                        
   IF v_user_id IS NULL THEN                                                            
     RETURN jsonb_build_object('success', false, 'message', 'Usuário não identificado.');
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
 $function$;
