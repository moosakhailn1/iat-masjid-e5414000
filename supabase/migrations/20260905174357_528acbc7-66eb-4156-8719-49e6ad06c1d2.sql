CREATE TABLE public.account_recovery (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);
GRANT ALL ON public.account_recovery TO service_role;
ALTER TABLE public.account_recovery ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.signup_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  answer TEXT NOT NULL,
  ip TEXT,
  consumed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '10 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.signup_challenges TO service_role;
ALTER TABLE public.signup_challenges ENABLE ROW LEVEL SECURITY;
CREATE INDEX signup_challenges_ip_created_idx ON public.signup_challenges (ip, created_at);