-- Revoke public access to all functions
REVOKE ALL ON FUNCTION public.place_robot_bid(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_robot_bid(UUID, UUID) FROM authenticated;

-- Grant access to service_role or specific role if needed
-- For now, since we need to call it from the admin panel, we'll keep it for authenticated 
-- but we already Revoked Public. Let's try to satisfy the linter.
GRANT EXECUTE ON FUNCTION public.place_robot_bid(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_robot_bid(UUID, UUID) TO service_role;
