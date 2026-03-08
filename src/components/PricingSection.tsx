import { useState } from 'react';
import { Check, Crown } from 'lucide-react';
import { toast } from 'sonner';

const plans = [
  {
    name: 'Seeker AI',
    monthly: 4.99,
    yearly: 47.99,
    // TODO: Replace with your Stripe Payment Links
    // monthlyLink: 'https://buy.stripe.com/YOUR_SEEKER_MONTHLY_LINK',
    // yearlyLink: 'https://buy.stripe.com/YOUR_SEEKER_YEARLY_LINK',
    features: ['50 AI questions/day', 'Basic Islamic Q&A', 'Hadith search', 'Email support'],
  },
  {
    name: 'Student AI',
    monthly: 9.99,
    yearly: 95.99,
    popular: true,
    // TODO: Replace with your Stripe Payment Links
    // monthlyLink: 'https://buy.stripe.com/YOUR_STUDENT_MONTHLY_LINK',
    // yearlyLink: 'https://buy.stripe.com/YOUR_STUDENT_YEARLY_LINK',
    features: ['150 AI questions/day', 'Advanced Islamic guidance', 'Quran tafsir access', 'Fiqh comparisons', 'Priority support'],
  },
  {
    name: 'Scholar AI',
    monthly: 19.99,
    yearly: 191.99,
    // TODO: Replace with your Stripe Payment Links
    // monthlyLink: 'https://buy.stripe.com/YOUR_SCHOLAR_MONTHLY_LINK',
    // yearlyLink: 'https://buy.stripe.com/YOUR_SCHOLAR_YEARLY_LINK',
    features: ['500 AI questions/day', 'Scholarly research tools', 'Arabic language support', 'Hadith chain analysis', 'Multi-language translations'],
  },
  {
    name: 'Imam AI',
    monthly: 39.99,
    yearly: 383.99,
    // TODO: Replace with your Stripe Payment Links
    // monthlyLink: 'https://buy.stripe.com/YOUR_IMAM_MONTHLY_LINK',
    // yearlyLink: 'https://buy.stripe.com/YOUR_IMAM_YEARLY_LINK',
    features: ['Unlimited AI questions', 'Khutbah preparation tools', 'Community management', 'Custom Islamic curriculum', 'Dedicated support'],
  },
];

const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false);

  const handleSubscribe = (plan: typeof plans[0]) => {
    // TODO: Uncomment and use when Stripe links are ready
    // const link = isYearly ? plan.yearlyLink : plan.monthlyLink;
    // if (link) window.open(link, '_blank');

    // Confirmation of perks upon subscribing
    toast.success(
      `${plan.name} — ${isYearly ? 'Yearly' : 'Monthly'} Plan\n\nYou'll get:\n${plan.features.join('\n')}`,
      { duration: 6000 }
    );
    toast.info('Stripe integration coming soon! Your perks will activate after payment.', { duration: 4000 });
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Upgrade Your Islamic Knowledge</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Choose a plan to unlock more AI questions, advanced features, and deeper Islamic scholarship tools.
        </p>

        {/* Billing toggle */}
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(plan => (
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
            <h3 className="text-foreground font-bold text-lg">{plan.name}</h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold text-foreground">
                ${isYearly ? plan.yearly : plan.monthly}
              </span>
              <span className="text-muted-foreground text-sm">
                /{isYearly ? 'year' : 'month'}
              </span>
            </div>

            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-secondary-foreground">
                  <Check size={14} className="text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan)}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                plan.popular
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              Get Started
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingSection;
