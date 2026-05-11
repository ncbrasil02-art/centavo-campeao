-- Garantir que as tabelas estejam na publicação do realtime
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table winners;

-- Configurar Replica Identity Full para tabelas críticas
-- Isso permite ver os valores antigos em atualizações, o que ajuda na sincronização do frontend
alter table public.auctions replica identity full;
alter table public.bids replica identity full;
alter table public.chat_messages replica identity full;
alter table public.profiles replica identity full;
