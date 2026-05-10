-- Robot users (fictitious profiles)
CREATE TABLE public.robot_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  city TEXT,
  state TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Robot settings for auctions
CREATE TABLE public.robot_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT false,
  min_delay INTEGER DEFAULT 3, -- seconds
  max_delay INTEGER DEFAULT 12, -- seconds
  bid_chance DECIMAL(3, 2) DEFAULT 0.5, -- chance to bid when timer is low
  max_bids_per_robot INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bid packages
CREATE TABLE public.bid_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bid_amount INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Transactions (buying bids)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  package_id UUID REFERENCES public.bid_packages(id),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  payment_method TEXT, -- pix, credit_card
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Winners table
CREATE TABLE public.winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID REFERENCES public.auctions(id) UNIQUE,
  user_id UUID REFERENCES public.profiles(id),
  final_price DECIMAL(10, 2) NOT NULL,
  savings_percentage DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add some robot users
INSERT INTO public.robot_users (username, city, state) VALUES
('Pedro_Henrique', 'São Paulo', 'SP'),
('Mariana_Lima', 'Curitiba', 'PR'),
('Lucas_Gamer', 'Rio de Janeiro', 'RJ'),
('Amanda_S', 'Belo Horizonte', 'MG'),
('Roberto_P', 'Porto Alegre', 'RS');

-- Add standard bid packages
INSERT INTO public.bid_packages (name, bid_amount, price) VALUES
('Pacote Bronze', 20, 20.00),
('Pacote Prata', 50, 50.00),
('Pacote Ouro', 100, 100.00),
('Pacote VIP', 250, 250.00),
('Pacote Diamante', 500, 500.00);

-- Enable RLS for new tables
ALTER TABLE public.robot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.robot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

-- Policies for new tables
CREATE POLICY "Public robot users are viewable by everyone" ON public.robot_users FOR SELECT USING (true);
CREATE POLICY "Robot settings viewable by everyone" ON public.robot_settings FOR SELECT USING (true);
CREATE POLICY "Bid packages viewable by everyone" ON public.bid_packages FOR SELECT USING (true);
CREATE POLICY "Winners viewable by everyone" ON public.winners FOR SELECT USING (true);
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
