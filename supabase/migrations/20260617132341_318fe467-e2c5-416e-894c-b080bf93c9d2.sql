
CREATE OR REPLACE FUNCTION public.admin_list_claims(p_search text DEFAULT NULL)
RETURNS SETOF jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', w.id,
    'auction_id', w.auction_id,
    'user_id', w.user_id,
    'final_price', w.final_price,
    'savings_percentage', w.savings_percentage,
    'created_at', w.created_at,
    'payment_receipt_url', w.payment_receipt_url,
    'payment_status', w.payment_status,
    'profile', jsonb_build_object('username', p.username, 'full_name', p.full_name),
    'auction', jsonb_build_object(
      'slug', a.slug,
      'product', jsonb_build_object('name', pr.name, 'images', pr.images)
    )
  )
  FROM public.winners w
  LEFT JOIN public.profiles p ON p.id = w.user_id
  LEFT JOIN public.auctions a ON a.id = w.auction_id
  LEFT JOIN public.products pr ON pr.id = a.product_id
  WHERE p_search IS NULL
     OR p.username ILIKE '%'||p_search||'%'
     OR p.full_name ILIKE '%'||p_search||'%'
  ORDER BY w.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_claims(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_claims(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_winners()
RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', w.id,
    'auction_id', w.auction_id,
    'user_id', w.user_id,
    'final_price', w.final_price,
    'savings_percentage', w.savings_percentage,
    'created_at', w.created_at,
    'payment_receipt_url', w.payment_receipt_url,
    'payment_status', w.payment_status,
    'auction', to_jsonb(a.*) || jsonb_build_object('product', to_jsonb(pr.*))
  )
  FROM public.winners w
  LEFT JOIN public.auctions a ON a.id = w.auction_id
  LEFT JOIN public.products pr ON pr.id = a.product_id
  WHERE w.user_id = auth.uid()
  ORDER BY w.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_winners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_winners() TO authenticated;
