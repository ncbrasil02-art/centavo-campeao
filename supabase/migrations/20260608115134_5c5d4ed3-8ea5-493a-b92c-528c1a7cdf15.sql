-- Remover job anterior
SELECT cron.unschedule('auction-tick-every-minute');

-- Agendar o novo worker que roda em loop por 55 segundos
SELECT cron.schedule('auction-worker-cron', '* * * * *', 
  $$
  SELECT net.http_post(
    url := 'https://jqwnzcuvslqpltjwawyr.functions.supabase.co/auction-worker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxd256Y3V2c2xxcGx0andhd3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM4MTI3MSwiZXhwIjoyMDkzOTU3MjcxfQ.8kuUlDofPV9zGwCdDeHephn5l_XzO7eW30zc1-D4E-0"}'::jsonb
  )
  $$
);
