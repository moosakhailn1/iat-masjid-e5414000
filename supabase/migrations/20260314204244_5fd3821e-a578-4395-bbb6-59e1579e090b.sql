-- Replace public SELECT policy with a secure function that excludes created_by
DROP POLICY IF EXISTS "Anyone can read active visible discounts" ON public.discount_codes;

CREATE OR REPLACE FUNCTION public.get_active_discount_codes()
RETURNS TABLE(id uuid, code text, discount_percent integer, plan text, display_mode text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, code, discount_percent, plan, display_mode
  FROM public.discount_codes
  WHERE is_active = true AND display_mode != 'hidden';
$$;

GRANT EXECUTE ON FUNCTION public.get_active_discount_codes() TO anon, authenticated;