-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;

-- Create a view that only exposes published values
CREATE OR REPLACE VIEW public.site_settings_public AS
SELECT id, key, published_value, updated_at
FROM public.site_settings;

-- Grant access to the view
GRANT SELECT ON public.site_settings_public TO anon, authenticated;