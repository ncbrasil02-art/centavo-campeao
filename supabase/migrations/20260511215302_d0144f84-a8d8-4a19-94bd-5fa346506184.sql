CREATE OR REPLACE FUNCTION public.handle_auction_finished()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'finished' AND OLD.status != 'finished') THEN
        -- Garantir que não exista um ganhador já registrado
        IF NOT EXISTS (SELECT 1 FROM public.winners WHERE auction_id = NEW.id) THEN
            -- Inserir o ganhador (último bidder)
            IF NEW.last_bidder_id IS NOT NULL THEN
                INSERT INTO public.winners (
                    auction_id, 
                    user_id, 
                    final_price,
                    savings_percentage
                ) 
                SELECT 
                    NEW.id, 
                    NEW.last_bidder_id, 
                    NEW.current_price,
                    CASE 
                        WHEN p.market_value > 0 THEN 100 - (NEW.current_price * 100 / p.market_value)
                        ELSE 0
                    END
                FROM public.products p
                WHERE p.id = NEW.product_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;