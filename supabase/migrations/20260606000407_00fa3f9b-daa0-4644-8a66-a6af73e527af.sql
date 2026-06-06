-- 1. Tighten auction_claim_messages INSERT: only the actual winner (or admin) may post
DROP POLICY IF EXISTS "Users can send messages for their won auctions" ON public.auction_claim_messages;

CREATE POLICY "Winners and admins can send claim messages"
ON public.auction_claim_messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.winners w
      WHERE w.auction_id = auction_claim_messages.auction_id
        AND w.user_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  )
);

-- 2. Profiles: restrict anon SELECT to safe columns only via column-level grants
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id,
  username,
  full_name,
  avatar_url,
  city,
  state,
  gender,
  created_at,
  is_online,
  last_seen_at,
  current_page
) ON public.profiles TO anon;

-- Keep full access for authenticated (RLS still applies)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;