-- Função para proteger colunas sensíveis
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger AS $$
BEGIN
  -- Se o usuário não for um admin (ou se for uma chamada via API comum), restaurar valores originais
  -- Em chamadas do sistema/admin, isso pode ser contornado se necessário, mas para RLS padrão:
  IF (current_user = 'authenticated') THEN
    NEW.bid_balance := OLD.bid_balance;
    NEW.is_admin := OLD.is_admin;
    NEW.is_bot := OLD.is_bot;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para proteção
DROP TRIGGER IF EXISTS tr_protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER tr_protect_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();
