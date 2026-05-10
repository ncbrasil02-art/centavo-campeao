ALTER TABLE public.chat_messages ALTER COLUMN auction_id DROP NOT NULL;

-- Enable realtime for a general channel
-- (Already enabled for the whole table, but good to keep in mind)
