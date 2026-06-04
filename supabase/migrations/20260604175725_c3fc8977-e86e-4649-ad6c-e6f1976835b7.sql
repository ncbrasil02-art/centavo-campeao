-- Update winners table
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected'));

-- Update testimonials table
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS auction_id UUID REFERENCES public.auctions(id);
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'video'));
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create auction_claim_messages table for internal chat
CREATE TABLE IF NOT EXISTS public.auction_claim_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auction_claim_messages TO authenticated;
GRANT ALL ON public.auction_claim_messages TO service_role;

GRANT UPDATE ON public.winners TO authenticated;
GRANT UPDATE ON public.testimonials TO authenticated;

-- RLS
ALTER TABLE public.auction_claim_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their won auctions" ON public.auction_claim_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "Users can send messages for their won auctions" ON public.auction_claim_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
