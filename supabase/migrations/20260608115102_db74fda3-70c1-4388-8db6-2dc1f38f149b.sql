CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar a execução do tick_auctions a cada minuto
-- Como o tick_auctions agora é rápido, podemos chamar via pg_cron
-- No entanto, para ter lances a cada poucos segundos, o ideal é o worker em Edge Function.
-- Mas vamos começar garantindo que pelo menos a cada minuto ele processe.
SELECT cron.schedule('auction-tick-every-minute', '* * * * *', 'SELECT public.tick_auctions()');

-- Para uma frequência maior (ex: a cada 2 segundos), precisamos de um worker externo ou loop.
-- Vamos habilitar o pg_net para permitir que o banco chame a si mesmo se necessário, 
-- ou usaremos a Edge Function Worker que é mais robusta no Supabase.
CREATE EXTENSION IF NOT EXISTS pg_net;
