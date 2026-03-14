import { useState, useEffect } from 'react';
import { Check, Crown, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import EmbeddedCheckoutModal from './EmbeddedCheckoutModal';

const plans = [
  {
    name: 'Seeker AI',
    monthly: 4.99,
    yearly: 47.99,
    features: [
      '50 AI questions/day',
      'Strong Quran + Hadith referenced answers',
      'English conversation mode',
      'Image attachments in chat (up to 3 per message)',
      'Live typing indicator + session chat continuity',
      'Email support',
    ],
  },
  {
    name: 'Student AI',
    monthly: 9.99,
    yearly: 95.99,
    popular: true,
    features: [
      '150 AI questions/day',
      'English + Pashto + Dari conversations',
      'Deep Thinking mode for harder questions',
      'Web Search context mode',
      'Richer Fiqh comparison answers',
      'Priority support',
    ],
  },
  {
    name: 'Scholar AI',
    monthly: 19.99,
    yearly: 191.99,
    features: [
      '500 AI questions/day',
      'All supported languages (15)',
      'High-intelligence scholar model',
      'Advanced structured references + nuanced analysis',
      'File & image uploads (up to 3 per message)',
      'Dedicated support',
    ],
  },
  {
    name: 'Imam AI',
    monthly: 39.99,
    yearly: 383.99,
    features: [
      'Unlimited AI questions',
      'All supported languages (15)',
      'Strongest model for complex Islamic questions',
      'Unlimited web search & deep thinking modes',
      'Full image & file analysis',
      'Premium dedicated support',
    ],
  },
];

const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [subLoading, setSubLoading] = useState(true);
  const [priceMap, setPriceMap] = useState<Record<string, { monthly: string; yearly: string }>>({});
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadDiscounts();
    loadPriceMap();
  }, []);

  useEffect(() => {
    if (!user) { setCurrentPlan('free'); setSubLoading(false); return; }

    const fetchSub = async () => {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .maybeSingle();
      setCurrentPlan(data?.plan || 'free');
      setSubLoading(false);
    };

    const syncAndFetch = async () => {
      await supabase.functions.invoke('sync-subscription');
      await fetchSub();
    };

    syncAndFetch();

    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      toast.success('Payment successful! Your plan is being activated…');
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        await supabase.functions.invoke('sync-subscription');
        await fetchSub();
        if (attempts >= 6) clearInterval(pollInterval);
      }, 5000);

      window.history.replaceState({}, '', window.location.pathname);
    }

    const channel = supabase
      .channel(`user_sub:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_subscriptions',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new?.plan) setCurrentPlan(payload.new.plan);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadDiscounts = async () => {
    const { data } = await supabase.from('discount_codes').select('*');
    setDiscounts(data || []);
  };

  const loadPriceMap = async () => {
    const { data } = await supabase.from('payment_links').select('*');
    const map: Record<string, { monthly: string; yearly: string }> = {};
    (data || []).forEach((row: any) => {
      if (row.monthly_price_id || row.yearly_price_id) {
        map[row.plan] = {
          monthly: row.monthly_price_id || '',
          yearly: row.yearly_price_id || '',
        };
      }
    });
    setPriceMap(map);
  };

  const bannerDiscounts = discounts.filter(d => d.is_active && d.display_mode === 'banner');
  const cardDiscounts = discounts.filter(d => d.is_active && d.display_mode === 'card');

  const applyPromoCode = () => {
    const found = discounts.find(d => d.code === promoCode.toUpperCase() && d.is_active);
    if (found) {
      setAppliedDiscount(found);
      toast.success(`Code "${found.code}" applied — ${found.discount_percent}% off!`);
    } else {
      toast.error('Invalid or expired promo code');
    }
  };

  const getDiscountForPlan = (planName: string) => {
    if (appliedDiscount && (!appliedDiscount.plan || appliedDiscount.plan === planName)) {
      return appliedDiscount.discount_percent;
    }
    const cardDiscount = cardDiscounts.find(d => !d.plan || d.plan === planName);
    if (cardDiscount) return cardDiscount.discount_percent;
    return 0;
  };

  const getDiscountedPrice = (price: number, planName: string) => {
    const pct = getDiscountForPlan(planName);
    if (!pct) return price;
    return +(price * (1 - pct / 100)).toFixed(2);
  };

  const handleSubscribe = (plan: typeof plans[0]) => {
    if (!user) {
      toast.info('Please sign in first to subscribe.');
      return;
    }

    const prices = priceMap[plan.name];
    if (!prices) {
      toast.error('Payment not configured for this plan.');
      return;
    }

    const priceId = isYearly ? prices.yearly : prices.monthly;
    if (!priceId) {
      toast.error('Price not configured for this billing period.');
      return;
    }

    setCheckoutPriceId(priceId);
  };

  return (
    <div className="animate-fade-in">
      {checkoutPriceId && (
        <EmbeddedCheckoutModal
          priceId={checkoutPriceId}
          onClose={() => setCheckoutPriceId(null)}
        />
      )}

      {bannerDiscounts.map(d => (
        <div key={d.id} className="mb-4 bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
          <Tag size={16} className="inline mr-2 text-primary" />
          <span className="text-foreground font-semibold">
            Use code <span className="font-mono text-primary">{d.code}</span> for {d.discount_percent}% off
            {d.plan ? ` on ${d.plan}` : ' any plan'}!
          </span>
        </div>
      ))}

      {user && !subLoading && (
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-5 py-2.5">
            <Crown size={16} className="text-primary" />
            <span className="text-sm text-muted-foreground">Your current plan:</span>
            <span className="text-sm font-bold text-foreground capitalize">
              {currentPlan === 'free' ? 'Free' : currentPlan}
            </span>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Upgrade Your Islamic Knowledge</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Choose a plan to unlock more AI questions, advanced features, and deeper Islamic scholarship tools.
        </p>

        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={`text-sm ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-12 h-6 rounded-full transition-colors ${isYearly ? 'bg-primary' : 'bg-secondary'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${isYearly ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-sm ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            Yearly <span className="text-primary text-xs">Save 20%</span>
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          <input
            value={promoCode}
            onChange={e => setPromoCode(e.target.value)}
            placeholder="Promo code"
            className="bg-secondary text-foreground rounded-lg px-3 py-2 text-sm border border-border focus:border-primary focus:outline-none w-40"
          />
          <button
            onClick={applyPromoCode}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            Apply
          </button>
          {appliedDiscount && (
            <button onClick={() => { setAppliedDiscount(null); setPromoCode(''); }} className="text-xs text-muted-foreground hover:text-foreground">
              ✕ Remove
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(plan => {
          const discount = getDiscountForPlan(plan.name);
          const basePrice = isYearly ? plan.yearly : plan.monthly;
          const finalPrice = getDiscountedPrice(basePrice, plan.name);
          const cardDiscount = cardDiscounts.find(d => !d.plan || d.plan === plan.name);

          return (
            <div
              key={plan.name}
              className={`bg-card border rounded-xl p-5 flex flex-col ${
                plan.popular ? 'border-primary card-glow' : 'border-border'
              }`}
            >
              {plan.popular && (
                <div className="flex items-center gap-1 text-primary text-xs font-semibold mb-2">
                  <Crown size={12} /> Most Popular
                </div>
              )}

              {cardDiscount && !appliedDiscount && (
                <div className="flex items-center gap-1 text-xs font-semibold mb-2 text-green-400">
                  <Tag size={12} /> {cardDiscount.discount_percent}% off — {cardDiscount.code}
                </div>
              )}

              <h3 className="text-foreground font-bold text-lg">{plan.name}</h3>
              <div className="mt-2 mb-4">
                {discount > 0 ? (
                  <>
                    <span className="text-lg text-muted-foreground line-through mr-2">${basePrice}</span>
                    <span className="text-3xl font-bold text-foreground">${finalPrice}</span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-foreground">${basePrice}</span>
                )}
                <span className="text-muted-foreground text-sm">/{isYearly ? 'year' : 'month'}</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-secondary-foreground">
                    <Check size={14} className="text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {currentPlan === plan.name ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-primary/20 text-primary cursor-default"
                >
                  ✓ Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    plan.popular
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-secondary text-secondary-foreground hover:bg-muted'
                  }`}
                >
                  {currentPlan !== 'free' && plans.findIndex(p => p.name === currentPlan) > plans.findIndex(p => p.name === plan.name) ? 'Downgrade' : 'Get Started'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingSection;
