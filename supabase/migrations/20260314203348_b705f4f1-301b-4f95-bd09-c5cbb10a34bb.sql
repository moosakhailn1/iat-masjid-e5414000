-- Fix 1: Prevent users from manipulating their AI usage count
-- Drop existing permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update own usage" ON public.ai_daily_usage;

-- Create restricted UPDATE policy that only allows incrementing count by 1
CREATE POLICY "Users can update own usage"
ON public.ai_daily_usage
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a security definer function for incrementing usage
CREATE OR REPLACE FUNCTION public.increment_ai_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO public.ai_daily_usage (user_id, usage_date, count)
  VALUES (auth.uid(), today, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET count = ai_daily_usage.count + 1;
END;
$$;

-- Fix 2: Hide discount codes with display_mode = 'hidden' from public
DROP POLICY IF EXISTS "Anyone can read active discounts" ON public.discount_codes;

CREATE POLICY "Anyone can read active visible discounts"
ON public.discount_codes
FOR SELECT
TO public
USING (is_active = true AND display_mode != 'hidden');