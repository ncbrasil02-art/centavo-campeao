-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  cpf TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  avatar_url TEXT,
  bid_balance INTEGER DEFAULT 5, -- Start with 5 free bids
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  market_value DECIMAL(10, 2) NOT NULL,
  category TEXT,
  images TEXT[], -- Array of image URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Auctions table
CREATE TABLE public.auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  current_price DECIMAL(10, 2) DEFAULT 0.00,
  bid_count INTEGER DEFAULT 0,
  last_bidder_id UUID REFERENCES public.profiles(id),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'upcoming', -- upcoming, live, finished
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bids table
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  price_at_bid DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);

CREATE POLICY "Auctions are viewable by everyone" ON public.auctions FOR SELECT USING (true);

CREATE POLICY "Bids are viewable by everyone" ON public.bids FOR SELECT USING (true);
CREATE POLICY "Users can insert their own bids" ON public.bids FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chat messages are viewable by everyone" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Users can insert their own chat messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
