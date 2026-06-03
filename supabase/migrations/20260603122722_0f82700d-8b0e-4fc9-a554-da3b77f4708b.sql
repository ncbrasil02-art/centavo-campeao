-- Revoke execution from PUBLIC for the new admin function
REVOKE EXECUTE ON FUNCTION public.process_robot_bids_admin() FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_robot_bids_admin() TO authenticated;
-- The internal check in process_robot_bids_admin() already verifies is_admin()
