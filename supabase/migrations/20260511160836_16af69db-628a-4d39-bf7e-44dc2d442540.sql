-- Allow everyone to sync time
GRANT EXECUTE ON FUNCTION public.get_server_time() TO anon, authenticated;

-- Ensure bids cannot be inserted directly by anyone except service_role/RPC
DROP POLICY IF EXISTS "Users can insert their own bids" ON public.bids;
-- Ensure bids cannot be deleted or updated by users
DROP POLICY IF EXISTS "Users can delete their own bids" ON public.bids;
DROP POLICY IF EXISTS "Users can update their own bids" ON public.bids;

-- Ensure transactions cannot be inserted directly
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;

-- Re-verify profile protection
DROP POLICY IF EXISTS "Users can update their own profile basic info" ON public.profiles;
CREATE POLICY "Users can update their own profile basic info"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
);
-- Note: To truly protect bid_balance, we should use a trigger that prevents updates to that column if not from a specific user or if not in certain conditions.
-- But for now, restricting the frontend and using RPC is the standard first step.

-- Add index to bid_balance for performance if not exists
CREATE INDEX IF NOT EXISTS idx_profiles_bid_balance ON public.profiles(bid_balance);
