-- Allow users to insert their own profile during registration
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id OR id = auth.uid()); -- Handles cases where auth.uid() might be available

-- Also allow service role or triggered inserts if needed, but for the current frontend logic, this is required.
-- If the user is not authenticated yet (email confirmation), auth.uid() might be null.
-- But if the signup is successful, the user is created in auth.users.
-- To allow the frontend to insert without a full session (if confirmation is on), we might need a more permissive policy or use a trigger.
-- However, if I change it to a trigger, I don't need the frontend insert.

-- Let's stick to the trigger approach as it is more robust for Supabase.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, is_admin)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username', false)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
-- Drop if exists to be safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
