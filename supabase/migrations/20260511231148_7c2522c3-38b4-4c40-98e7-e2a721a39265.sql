CREATE TABLE public.app_phrases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'hero' or 'incentive'
    text TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_phrases ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Phrases are viewable by everyone" 
ON public.app_phrases FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage phrases" 
ON public.app_phrases FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Insert Initial Hero Phrases
INSERT INTO public.app_phrases (type, text) VALUES
('hero', 'Arremate produtos incríveis por centavos!'),
('hero', 'iPhones, Consoles e muito mais a partir de R$ 0,01'),
('hero', 'Economize até 99% nos seus produtos favoritos'),
('hero', 'A emoção do leilão em tempo real na sua tela');

-- Insert Initial Incentive Phrases
INSERT INTO public.app_phrases (type, text) VALUES
('incentive', '🔥 Este produto é o máximo!'),
('incentive', '👀 Tem poucas pessoas disputando!'),
('incentive', '💎 Quanto maior o pacote, mais chances!'),
('incentive', '⚡ Não deixe essa chance passar!'),
('incentive', '🏆 Alguém vai levar por quase nada!'),
('incentive', '🚀 O próximo lance pode ser o vencedor!');
