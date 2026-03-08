CREATE TABLE public.library_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('hadith', 'dua', 'khutbah', 'seerah')),
  title TEXT,
  arabic TEXT NOT NULL DEFAULT '',
  english TEXT NOT NULL DEFAULT '',
  pashto TEXT NOT NULL DEFAULT '',
  dari TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  narrator TEXT,
  hadith_number INTEGER,
  occasion TEXT,
  imam TEXT,
  event_date TEXT,
  content_subtype TEXT,
  full_text TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.library_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read library content"
  ON public.library_content FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage library content"
  ON public.library_content FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));