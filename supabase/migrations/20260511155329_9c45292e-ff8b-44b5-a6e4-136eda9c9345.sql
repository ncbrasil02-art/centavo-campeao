-- 1. Refinar perfis e adicionar is_admin
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Garantir que bid_balance tenha default 0 se for nulo
ALTER TABLE public.profiles ALTER COLUMN bid_balance SET DEFAULT 0;
UPDATE public.profiles SET bid_balance = 0 WHERE bid_balance IS NULL;

-- 3. Função para criar perfil automático
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, bid_balance)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    10 -- Oferece 10 lances de bônus ao cadastrar
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger para criar perfil após insert em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Sistema de Créditos: Função para adicionar lances
CREATE OR REPLACE FUNCTION public.add_bids_to_user(p_user_id UUID, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET bid_balance = bid_balance + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Garantir RLS em todas as tabelas
ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

-- 7. Políticas adicionais
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can manage everything' AND tablename = 'bid_packages') THEN
        CREATE POLICY "Admin can manage everything" ON public.bid_packages FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
        );
    END IF;
END $$;

-- 8. Tabela de pacotes de lances (se não houver dados, popular alguns)
-- INSERT INTO public.bid_packages (name, bid_amount, price)
-- SELECT 'Pacote Iniciante', 50, 45.00
-- WHERE NOT EXISTS (SELECT 1 FROM public.bid_packages);
