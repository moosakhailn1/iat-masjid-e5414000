
-- Payment links table: stores Stripe payment links per plan
CREATE TABLE public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan TEXT NOT NULL,
  monthly_link TEXT,
  yearly_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE(plan)
);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read active payment links
CREATE POLICY "Anyone can read active payment links" ON public.payment_links
  FOR SELECT TO authenticated USING (is_active = true);

-- Admins can manage payment links
CREATE POLICY "Admins can manage payment links" ON public.payment_links
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add display_mode to discount_codes: 'hidden' (code only), 'banner' (public banner), 'card' (show on pricing card)
ALTER TABLE public.discount_codes ADD COLUMN display_mode TEXT NOT NULL DEFAULT 'hidden';
