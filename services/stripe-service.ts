/**
 * Stripe deposit gateway service.
 *
 * Activation: set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env.
 * Without the key the service operates in sandbox mode (instant simulation),
 * allowing the full app to operate seamlessly without Stripe credentials.
 *
 * When Stripe is active:
 * 1. createDepositIntent() calls the Firebase Cloud Function createPaymentIntent.
 * 2. confirmPaymentWithCard() tokenizes the card directly via Stripe's HTTPS API
 *    and confirms the payment intent with zero client-side native binary requirements.
 */

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const CLOUD_FUNCTION_URL =
  process.env.EXPO_PUBLIC_CREATE_PAYMENT_INTENT_URL || '';

export const isStripeEnabled = (): boolean =>
  typeof PUBLISHABLE_KEY === 'string' && PUBLISHABLE_KEY.startsWith('pk_');

export function getStripePublishableKey(): string {
  if (!isStripeEnabled()) {
    throw new Error('Stripe publishable key is not configured.');
  }
  return PUBLISHABLE_KEY as string;
}

export interface DepositIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  isSandbox: false;
}

export interface SandboxDepositResult {
  isSandbox: true;
  paymentIntentId: string;
}

export interface CardPaymentDetails {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  cardholderName?: string;
}

/**
 * Creates a deposit intent.
 * - In sandbox mode (no Stripe key): returns a mock paymentIntentId immediately.
 * - In live mode: calls the Cloud Function and returns a real client_secret.
 */
export async function createDepositIntent(params: {
  amount: number;
  currency: string;
  businessId: string;
  userId: string;
  idToken: string;
}): Promise<DepositIntentResult | SandboxDepositResult> {
  if (!isStripeEnabled()) {
    return {
      isSandbox: true,
      paymentIntentId: `sandbox_pi_${Date.now()}`,
    };
  }

  if (!CLOUD_FUNCTION_URL) {
    throw new Error(
      'EXPO_PUBLIC_CREATE_PAYMENT_INTENT_URL is not configured. ' +
      'Deploy the Firebase Cloud Function and set the URL in .env.'
    );
  }

  const response = await fetch(CLOUD_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.idToken}`,
    },
    body: JSON.stringify({
      amount: Math.round(params.amount * 100),
      currency: params.currency.toLowerCase(),
      businessId: params.businessId,
      userId: params.userId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Payment intent creation failed: ${errorText}`);
  }

  const data = await response.json();

  if (!data.clientSecret || !data.paymentIntentId) {
    throw new Error('Invalid response from payment intent endpoint.');
  }

  return {
    clientSecret: data.clientSecret,
    paymentIntentId: data.paymentIntentId,
    isSandbox: false,
  };
}

/**
 * Confirms a PaymentIntent directly with Stripe's API using standard
 * form-urlencoded parameters and the publishable key.
 */
export async function confirmPaymentWithCard(
  clientSecret: string,
  card: CardPaymentDetails
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const publishableKey = getStripePublishableKey();

    // 1. Create PaymentMethod with card details directly at Stripe
    const cardData = new URLSearchParams();
    cardData.append('type', 'card');
    cardData.append('card[number]', card.number.replace(/\D/g, ''));
    cardData.append('card[exp_month]', String(card.expMonth));
    cardData.append('card[exp_year]', String(card.expYear));
    cardData.append('card[cvc]', card.cvc);
    if (card.cardholderName) {
      cardData.append('billing_details[name]', card.cardholderName);
    }

    const pmResponse = await fetch('https://api.stripe.com/v1/payment_methods', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publishableKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: cardData.toString(),
    });

    const pmResult = await pmResponse.json();
    if (!pmResponse.ok || pmResult.error) {
      return {
        success: false,
        error: pmResult.error?.message || 'Failed to process card details with network.',
      };
    }

    const paymentMethodId = pmResult.id;

    // 2. Extract payment intent ID from client_secret (format: pi_xxx_secret_yyy)
    const paymentIntentId = clientSecret.split('_secret_')[0];
    if (!paymentIntentId) {
      return { success: false, error: 'Invalid client secret format.' };
    }

    // 3. Confirm the payment intent
    const confirmData = new URLSearchParams();
    confirmData.append('client_secret', clientSecret);
    confirmData.append('payment_method', paymentMethodId);

    const confirmResponse = await fetch(
      `https://api.stripe.com/v1/payment_intents/${paymentIntentId}/confirm`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${publishableKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: confirmData.toString(),
      }
    );

    const confirmResult = await confirmResponse.json();
    if (!confirmResponse.ok || confirmResult.error) {
      return {
        success: false,
        error: confirmResult.error?.message || 'Payment confirmation failed with bank.',
      };
    }

    return {
      success: confirmResult.status === 'succeeded' || confirmResult.status === 'processing',
      status: confirmResult.status,
    };
  } catch (err: any) {
    console.error('[confirmPaymentWithCard] Error:', err);
    return {
      success: false,
      error: err.message || 'An error occurred while confirming card transaction.',
    };
  }
}
