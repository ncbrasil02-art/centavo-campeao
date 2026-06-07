
-- 1) Restringir column-level SELECT em profiles
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, username, full_name, avatar_url, city, state, gender,
  created_at, is_online, last_seen_at, current_page
) ON public.profiles TO anon, authenticated;

-- Permissões para INSERT/UPDATE/DELETE mantidas conforme RLS
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2) RPC: dono lê o próprio perfil completo
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 3) RPC: admin lista perfis (com busca/paginação)
CREATE OR REPLACE FUNCTION public.admin_list_profiles(
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  data jsonb,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.profiles
  WHERE (p_search IS NULL OR username ILIKE '%'||p_search||'%' OR full_name ILIKE '%'||p_search||'%');

  RETURN QUERY
  SELECT to_jsonb(p.*), v_total
  FROM public.profiles p
  WHERE (p_search IS NULL OR p.username ILIKE '%'||p_search||'%' OR p.full_name ILIKE '%'||p_search||'%')
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_profiles(text,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles(text,int,int) TO authenticated;

-- 4) RPC: admin lista usuários online (últimos 5 min)
CREATE OR REPLACE FUNCTION public.admin_list_online_profiles()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  RETURN QUERY
  SELECT to_jsonb(p.*)
  FROM public.profiles p
  WHERE p.last_seen_at > (now() - interval '5 minutes')
  ORDER BY p.last_seen_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_online_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_online_profiles() TO authenticated;

-- 5) RPC: admin lista robôs
CREATE OR REPLACE FUNCTION public.admin_list_robots()
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  RETURN QUERY
  SELECT to_jsonb(p.*)
  FROM public.profiles p
  WHERE p.is_bot = true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_robots() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_robots() TO authenticated;

-- 6) RPC: admin obtém um perfil completo (para detalhes/edição)
CREATE OR REPLACE FUNCTION public.admin_get_profile(p_id uuid)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.profiles;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  SELECT * INTO r FROM public.profiles WHERE id = p_id;
  RETURN r;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_get_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_profile(uuid) TO authenticated;

-- 7) Remover profiles da publicação Realtime
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles';
  END IF;
END $$;
