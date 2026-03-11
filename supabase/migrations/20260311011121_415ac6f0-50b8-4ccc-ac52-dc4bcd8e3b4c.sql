
-- Create AI daily usage table for persistent tracking
CREATE TABLE public.ai_daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, usage_date)
);

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage" ON public.ai_daily_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own usage" ON public.ai_daily_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON public.ai_daily_usage
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Update auto_grant_admin to grant 'dev' instead
CREATE OR REPLACE FUNCTION public.auto_grant_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_emails TEXT[] := ARRAY['moosakhailn1@gmail.com', 'moosakhailn@gmail.com'];
BEGIN
  IF NEW.email = ANY(admin_emails) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'dev')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update has_role to also work with dev
-- (no change needed - it checks exact role match which is correct)

-- Upgrade existing admin roles for the owner emails to dev
UPDATE public.user_roles 
SET role = 'dev' 
WHERE role = 'admin' 
AND user_id IN (
  SELECT id FROM public.profiles WHERE email IN ('moosakhailn1@gmail.com', 'moosakhailn@gmail.com')
);
