-- Update Bids policies
DROP POLICY IF EXISTS "Admins can manage all bids" ON public.bids;
CREATE POLICY "Admins can manage all bids" 
ON public.bids 
FOR ALL 
TO authenticated 
USING (public.is_admin());

-- Update Transactions policies
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.transactions;
CREATE POLICY "Admins can manage all transactions" 
ON public.transactions 
FOR ALL 
TO authenticated 
USING (public.is_admin());

-- Ensure users can still view their own
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" 
ON public.transactions 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR public.is_admin());
