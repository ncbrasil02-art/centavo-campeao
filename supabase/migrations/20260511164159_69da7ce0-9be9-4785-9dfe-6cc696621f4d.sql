ALTER TABLE public.banners 
ADD COLUMN start_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN end_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.banners.start_at IS 'Data/hora para começar a exibir o banner';
COMMENT ON COLUMN public.banners.end_at IS 'Data/hora para parar de exibir o banner';