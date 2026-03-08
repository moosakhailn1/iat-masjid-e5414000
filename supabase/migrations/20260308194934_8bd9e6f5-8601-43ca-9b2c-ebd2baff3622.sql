
-- Create function to auto-grant admin based on email
CREATE OR REPLACE FUNCTION public.auto_grant_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_emails TEXT[] := ARRAY['moosakhailn1@gmail.com', 'moosakhailn@gmail.com'];
BEGIN
  IF NEW.email = ANY(admin_emails) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Run on new user creation (after the existing trigger)
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin();

-- Also grant admin to existing user
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
WHERE p.email IN ('moosakhailn1@gmail.com', 'moosakhailn@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
