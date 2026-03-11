
-- Create a helper function that checks if user has admin OR dev role
CREATE OR REPLACE FUNCTION public.is_admin_or_dev(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role IN ('admin', 'dev')
  )
$$;

-- Update RLS policies to use the new function for admin access
-- discount_codes
DROP POLICY IF EXISTS "Admins can manage discounts" ON public.discount_codes;
CREATE POLICY "Admins can manage discounts" ON public.discount_codes
  FOR ALL TO public USING (is_admin_or_dev(auth.uid()));

-- library_content
DROP POLICY IF EXISTS "Admins can manage library content" ON public.library_content;
CREATE POLICY "Admins can manage library content" ON public.library_content
  FOR ALL TO public USING (is_admin_or_dev(auth.uid()));

-- payment_links (dev only for writes, but reads for authenticated)
DROP POLICY IF EXISTS "Admins can manage payment links" ON public.payment_links;
CREATE POLICY "Admins can manage payment links" ON public.payment_links
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'dev'));

-- site_settings
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings" ON public.site_settings
  FOR ALL TO authenticated USING (is_admin_or_dev(auth.uid()));

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO public USING (is_admin_or_dev(auth.uid()));

-- user_subscriptions
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can manage subscriptions" ON public.user_subscriptions
  FOR ALL TO public USING (is_admin_or_dev(auth.uid()));

-- profiles - admin read
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO public USING (is_admin_or_dev(auth.uid()));
