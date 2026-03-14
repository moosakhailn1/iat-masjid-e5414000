-- Remove ALL direct user write access to ai_daily_usage
DROP POLICY IF EXISTS "Users can update own usage" ON public.ai_daily_usage;
DROP POLICY IF EXISTS "Users can upsert own usage" ON public.ai_daily_usage;

-- Keep only the read policy so users can see their own count
-- All writes now go through the secure increment_ai_usage() function