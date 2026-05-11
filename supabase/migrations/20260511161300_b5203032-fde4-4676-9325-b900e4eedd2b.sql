ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing transactions to have a default type
UPDATE public.transactions SET type = 'purchase' WHERE type IS NULL;
