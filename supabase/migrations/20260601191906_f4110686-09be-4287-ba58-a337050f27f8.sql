-- Add modality and min_balance_required to auctions
ALTER TABLE public.auctions 
ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS min_balance_required NUMERIC(10,2) DEFAULT 0;

-- Add gender to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'not_specified'));

-- Create an index for performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_auctions_modality ON public.auctions(modality);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);

-- Ensure RLS allows users to update their own gender
-- The existing policy "Users can update their own profile basic info" likely covers this,
-- but let's make sure it doesn't restrict specific columns unless intended.
-- Based on previous view, it uses: USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id))
-- Which is fine for adding a column.

-- Grant permissions (already granted to authenticated/service_role on table level usually)
GRANT SELECT, INSERT, UPDATE ON public.auctions TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
