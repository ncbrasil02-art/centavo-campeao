ALTER TABLE public.narration_phrases ADD COLUMN IF NOT EXISTS mention_future_auctions BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.future_auction_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.future_auction_templates TO authenticated;
GRANT ALL ON public.future_auction_templates TO service_role;
ALTER TABLE public.future_auction_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for future_auction_templates" ON public.future_auction_templates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage future_auction_templates" ON public.future_auction_templates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

INSERT INTO public.future_auction_templates (template_text) VALUES 
('O leilão do {product} vai acontecer {date} às {time}, não perca essa oportunidade!'),
('Prepare-se! {product} em leilão {date} às {time}. Faça seu cadastro e garanta seus lances!'),
('Vem aí: {product} no dia {date} às {time}. Fique ligado para não perder!!');
