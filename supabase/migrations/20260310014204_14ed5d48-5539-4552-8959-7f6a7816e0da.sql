
-- Site settings table for navbar/footer configuration with draft/publish
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  draft_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read published settings
CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  TO public
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can manage site settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for site assets (logo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true);

-- Allow anyone to read site assets
CREATE POLICY "Anyone can read site assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'site-assets');

-- Only admins can upload/delete site assets
CREATE POLICY "Admins can manage site assets"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.site_settings (key, draft_value, published_value) VALUES
('navbar', '{
  "siteName": "Islamic Association of Texas",
  "siteTagline": "Community • Education • Worship",
  "ribbonText": "Ramadan Mubarak — Islamic Association of Texas",
  "logoUrl": "",
  "address": "132 N Glenville Dr, Richardson, TX 75081",
  "phone": "(972) 863-9696",
  "email": "abuhanifahiat@gmail.com",
  "links": [
    {"label": "Home", "href": "/", "isDonate": false},
    {"label": "Quran", "href": "/quran/", "isDonate": false},
    {"label": "Islam", "href": "/islam/", "isDonate": false},
    {"label": "Events", "href": "/events/", "isDonate": false},
    {"label": "Donate", "href": "/donate/", "isDonate": true},
    {"label": "Contact", "href": "/contact/", "isDonate": false}
  ]
}'::jsonb, '{
  "siteName": "Islamic Association of Texas",
  "siteTagline": "Community • Education • Worship",
  "ribbonText": "Ramadan Mubarak — Islamic Association of Texas",
  "logoUrl": "",
  "address": "132 N Glenville Dr, Richardson, TX 75081",
  "phone": "(972) 863-9696",
  "email": "abuhanifahiat@gmail.com",
  "links": [
    {"label": "Home", "href": "/", "isDonate": false},
    {"label": "Quran", "href": "/quran/", "isDonate": false},
    {"label": "Islam", "href": "/islam/", "isDonate": false},
    {"label": "Events", "href": "/events/", "isDonate": false},
    {"label": "Donate", "href": "/donate/", "isDonate": true},
    {"label": "Contact", "href": "/contact/", "isDonate": false}
  ]
}'::jsonb),
('footer', '{
  "brandName": "Islamic Association of Texas",
  "brandDescription": "Serving the Richardson community with prayer, education, and unity — grounded in the Qur''an and Sunnah.",
  "address": "132 N Glenville Dr, Richardson, TX 75081",
  "phone": "(972) 863-9696",
  "email": "abuhanifahiat@gmail.com",
  "quickLinks": [
    {"label": "Home", "href": "/"},
    {"label": "Donate", "href": "/donate/"},
    {"label": "Events", "href": "/events/"},
    {"label": "Community Services", "href": "/contact/"}
  ],
  "resourceLinks": [
    {"label": "Digital Qur''an", "href": "/quran/"},
    {"label": "AI Memorization Tool", "href": "/"},
    {"label": "Islam", "href": "/islam/"},
    {"label": "Terms of Use", "href": "#"}
  ],
  "developerName": "Numanullah Moosakhail",
  "developerUrl": "https://numanullah.com"
}'::jsonb, '{
  "brandName": "Islamic Association of Texas",
  "brandDescription": "Serving the Richardson community with prayer, education, and unity — grounded in the Qur''an and Sunnah.",
  "address": "132 N Glenville Dr, Richardson, TX 75081",
  "phone": "(972) 863-9696",
  "email": "abuhanifahiat@gmail.com",
  "quickLinks": [
    {"label": "Home", "href": "/"},
    {"label": "Donate", "href": "/donate/"},
    {"label": "Events", "href": "/events/"},
    {"label": "Community Services", "href": "/contact/"}
  ],
  "resourceLinks": [
    {"label": "Digital Qur''an", "href": "/quran/"},
    {"label": "AI Memorization Tool", "href": "/"},
    {"label": "Islam", "href": "/islam/"},
    {"label": "Terms of Use", "href": "#"}
  ],
  "developerName": "Numanullah Moosakhail",
  "developerUrl": "https://numanullah.com"
}'::jsonb);
