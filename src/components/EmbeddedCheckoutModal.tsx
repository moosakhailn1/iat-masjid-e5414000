import { useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { STRIPE_PUBLISHABLE_KEY } from '@/config/stripe';
import { supabase } from '@/integrations/supabase/client';

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface Props {
  priceId: string;
  onClose: () => void;
}

const EmbeddedCheckoutModal = ({ priceId, onClose }: Props) => {
  const fetchClientSecret = useCallback(async () => {
    const returnUrl = window.location.href.replace(/[?#].*$/, '') + '?checkout=success';

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceId, returnUrl, embedded: true },
    });

    if (error || !data?.clientSecret) {
      throw new Error(data?.error || error?.message || 'Failed to create checkout session');
    }

    return data.clientSecret as string;
  }, [priceId]);

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-foreground font-semibold">Complete Your Purchase</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-4" id="checkout">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
};

export default EmbeddedCheckoutModal;
