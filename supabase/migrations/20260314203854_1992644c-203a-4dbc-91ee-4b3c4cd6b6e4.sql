-- Drop the security definer view
DROP VIEW IF EXISTS public.site_settings_public;

-- Re-add a public SELECT policy but only for published_value column
-- Since Postgres RLS can't restrict columns, use a secure function instead
CREATE OR REPLACE FUNCTION public.get_published_settings()
RETURNS TABLE(id uuid, key text, published_value jsonb, updated_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, key, published_value, updated_at
  FROM public.site_settings;
$$;

-- Grant execute to public
GRANT EXECUTE ON FUNCTION public.get_published_settings() TO anon, authenticated;