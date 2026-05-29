CREATE OR REPLACE VIEW v_user_ranking AS
SELECT 
    p.id as user_id,
    p.username,
    p.avatar_url,
    p.full_name,
    COUNT(w.id) as total_wins,
    COALESCE(SUM(w.savings_percentage), 0) as total_savings_sum,
    CASE 
        WHEN COUNT(w.id) > 0 THEN SUM(w.savings_percentage) / COUNT(w.id) 
        ELSE 0 
    END as avg_savings
FROM profiles p
LEFT JOIN winners w ON p.id = w.user_id
WHERE p.is_bot = false OR p.is_bot IS NULL
GROUP BY p.id, p.username, p.avatar_url, p.full_name
HAVING COUNT(w.id) > 0
ORDER BY total_wins DESC;

GRANT SELECT ON public.v_user_ranking TO anon;
GRANT SELECT ON public.v_user_ranking TO authenticated;
GRANT ALL ON public.v_user_ranking TO service_role;
