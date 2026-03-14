-- Add unique constraint for the ON CONFLICT clause
ALTER TABLE public.ai_daily_usage
ADD CONSTRAINT ai_daily_usage_user_date_unique UNIQUE (user_id, usage_date);