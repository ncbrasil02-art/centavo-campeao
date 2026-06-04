CREATE TABLE IF NOT EXISTS public.narration_phrases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phrase TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'encouragement',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'site_settings' AND column_name = 'marquee_text') THEN
        ALTER TABLE public.site_settings ADD COLUMN marquee_text TEXT DEFAULT 'Ganhe 5 lances grátis ao se cadastrar! 🚀 Participe dos leilões e arremate produtos incríveis com descontos de até 99%!';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'site_settings' AND column_name = 'marquee_enabled') THEN
        ALTER TABLE public.site_settings ADD COLUMN marquee_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;

GRANT ALL ON public.narration_phrases TO authenticated;
GRANT ALL ON public.narration_phrases TO service_role;
GRANT SELECT ON public.narration_phrases TO anon;

ALTER TABLE public.narration_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage narration phrases" ON public.narration_phrases
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Anyone can view active narration phrases" ON public.narration_phrases
    FOR SELECT TO anon, authenticated USING (is_active = true);

INSERT INTO public.narration_phrases (phrase, category) VALUES
('Este leilão está muito concorrido! Não perca a esperança, o próximo lance pode ser o seu!', 'encouragement'),
('Quem tem mais lances tem mais chances! Garanta agora seu pacote promocional.', 'encouragement'),
('Vários produtos saindo agora! Aproveite o preço baixo e dê o seu lance!', 'encouragement'),
('Não deixe essa oportunidade escapar! O iPhone 15 pode ser seu por centavos.', 'encouragement');