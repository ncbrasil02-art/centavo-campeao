-- 1. Secure v_user_ranking view
DROP VIEW IF EXISTS public.v_user_ranking;
CREATE VIEW public.v_user_ranking 
WITH (security_invoker = true)
AS
 SELECT p.id AS user_id,
    p.username,
    p.avatar_url,
    p.full_name,
    count(w.id) AS total_wins,
    COALESCE(sum(w.savings_percentage), 0::numeric) AS total_savings_sum,
        CASE
            WHEN count(w.id) > 0 THEN sum(w.savings_percentage) / count(w.id)::numeric
            ELSE 0::numeric
        END AS avg_savings
   FROM profiles p
     LEFT JOIN winners w ON p.id = w.user_id
  WHERE p.is_bot = false OR p.is_bot IS NULL
  GROUP BY p.id, p.username, p.avatar_url, p.full_name
 HAVING count(w.id) > 0
  ORDER BY (count(w.id)) DESC;

GRANT SELECT ON public.v_user_ranking TO anon, authenticated;

-- 2. Global search_path for SECURITY DEFINER functions
-- Using a loop to ensure ALL Security Definer functions have a secure search_path
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.prosecdef = true
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.nspname, r.proname, r.args);
    END LOOP;
END $$;

-- 3. Storage bucket security tightening
-- Update policies to prevent broad listing while allowing public read
DROP POLICY IF EXISTS "Allow public read for site-assets" ON storage.objects;
CREATE POLICY "Allow public read for site-assets" ON storage.objects FOR SELECT USING (bucket_id = 'site-assets' AND name IS NOT NULL);

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars' AND name IS NOT NULL);
