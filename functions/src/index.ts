import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import cors from 'cors';

admin.initializeApp();
const db = admin.firestore();

const corsHandler = cors({ origin: true });

const getStripe = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured in environment variables.');
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-04-10',
  });
};

/**
 * Creates a Stripe PaymentIntent for a wallet deposit.
 * Authenticates the caller via Firebase Auth ID Token.
 */
export const createPaymentIntent = onRequest({ cors: true }, async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Missing Bearer Token' });
        return;
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const authUid = decodedToken.uid;

      const { amount, currency = 'usd', businessId, userId } = req.body;

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ error: 'Invalid or missing amount' });
        return;
      }

      if (!businessId || !userId) {
        res.status(400).json({ error: 'Missing businessId or userId' });
        return;
      }

      if (authUid !== userId) {
        res.status(403).json({ error: 'Forbidden: UID mismatch' });
        return;
      }

      // Verify business membership and deposit limits
      const bizRef = db.collection('businesses').doc(businessId);
      const bizSnap = await bizRef.get();
      if (!bizSnap.exists) {
        res.status(404).json({ error: 'Business not found' });
        return;
      }

      const bizData = bizSnap.data() || {};
      const members: string[] = bizData.members || [];
      if (!members.includes(userId)) {
        res.status(403).json({ error: 'User is not a member of this business' });
        return;
      }

      const depositMax = bizData.transferLimits?.depositMax;
      if (depositMax !== undefined && amount > depositMax) {
        res.status(400).json({
          error: `Deposit exceeds maximum business limit of ${depositMax} ${bizData.currency || 'USD'}`,
        });
        return;
      }

      const stripe = getStripe();
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: String(currency).toLowerCase(),
        payment_method_types: ['card'],
        metadata: {
          businessId,
          userId,
          amount: String(amount),
          currency: String(currency).toUpperCase(),
        },
      });

      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (err: any) {
      console.error('[createPaymentIntent] Error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });
});

/**
 * Stripe Webhook Handler.
 * Validates cryptographic signature and atomically credits the user's wallet on payment success.
 */
export const stripeWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('[stripeWebhook] Missing signature or STRIPE_WEBHOOK_SECRET');
    res.status(400).send('Webhook Secret or Signature missing');
    return;
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('[stripeWebhook] Signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const metadata = paymentIntent.metadata || {};
    const { businessId, userId, amount: amountStr, currency = 'USD' } = metadata;

    if (!businessId || !userId || !amountStr) {
      console.warn('[stripeWebhook] Missing metadata in PaymentIntent:', paymentIntent.id);
      res.status(200).json({ received: true, warning: 'Incomplete metadata' });
      return;
    }

    const amount = parseFloat(amountStr);

    try {
      const accountRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('accounts')
        .doc(userId);

      const txCol = db
        .collection('businesses')
        .doc(businessId)
        .collection('wallet_transactions');

      // Idempotency check: Ensure payment has not already been processed
      const existingTxSnap = await txCol
        .where('referenceId', '==', paymentIntent.id)
        .limit(1)
        .get();

      if (!existingTxSnap.empty) {
        console.log('[stripeWebhook] PaymentIntent already credited:', paymentIntent.id);
        res.status(200).json({ received: true, message: 'Already processed' });
        return;
      }

      await db.runTransaction(async (t) => {
        const accSnap = await t.get(accountRef);
        const currentMain = accSnap.exists ? (accSnap.data()?.mainBalance || 0) : 0;
        const currentLocked = accSnap.exists ? (accSnap.data()?.lockedSavingsBalance || 0) : 0;

        t.set(
          accountRef,
          {
            id: userId,
            businessId,
            userId,
            mainBalance: currentMain + amount,
            lockedSavingsBalance: currentLocked,
            currency,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        const newTxRef = txCol.doc();
        t.set(newTxRef, {
          id: newTxRef.id,
          businessId,
          userId,
          type: 'deposit',
          amount,
          currency,
          description: `Stripe Card Deposit (${paymentIntent.id.slice(-8)})`,
          status: 'completed',
          referenceId: paymentIntent.id,
          createdAt: new Date().toISOString(),
        });
      });

      console.log(`[stripeWebhook] Successfully credited ${amount} ${currency} to user ${userId}`);

      // Dispatch push notification to recipient device via Expo push service
      const userDoc = await db.collection('users').doc(userId).get();
      const pushToken = userDoc.data()?.pushToken;

      if (pushToken && typeof pushToken === 'string' && pushToken.startsWith('ExponentPushToken')) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            to: pushToken,
            title: 'Deposit Confirmed',
            body: `Your deposit of ${amount} ${currency} has been verified and added to your wallet.`,
            sound: 'default',
            channelId: 'transactions',
          }),
        }).catch((e) => console.warn('[stripeWebhook] Push notification error:', e));
      }
    } catch (dbErr: any) {
      console.error('[stripeWebhook] Database transaction error:', dbErr);
      res.status(500).send('Internal Ledger Error');
      return;
    }
  }

  res.status(200).json({ received: true });
});

/**
 * OAuth Exchange Handler for Discord and GitHub.
 * Receives verified third-party user profile attributes and mints a Firebase Custom Token.
 */
export const oauthExchange = onRequest({ cors: true }, async (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const { provider, email, displayName, photoUrl, providerUid } = req.body;

      if (!email || !provider || !providerUid) {
        res.status(400).json({ error: 'Missing required OAuth parameters (email, provider, providerUid).' });
        return;
      }

      let firebaseUser: admin.auth.UserRecord;
      try {
        firebaseUser = await admin.auth().getUserByEmail(email);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          firebaseUser = await admin.auth().createUser({
            email,
            displayName: displayName || email.split('@')[0],
            photoURL: photoUrl || undefined,
            emailVerified: true,
          });
        } else {
          throw err;
        }
      }

      // Generate custom token for Firebase Client SDK login
      const customToken = await admin.auth().createCustomToken(firebaseUser.uid, {
        provider,
        providerUid,
      });

      // Maintain user profile in Firestore
      const userRef = db.collection('users').doc(firebaseUser.uid);
      const resolvedName = displayName || firebaseUser.displayName || email.split('@')[0];
      const nameParts = resolvedName.trim().split(' ');
      await userRef.set(
        {
          id: firebaseUser.uid,
          email,
          displayName: resolvedName,
          firstName: nameParts[0] || resolvedName,
          lastName: nameParts.slice(1).join(' ') || '',
          photoURL: photoUrl || firebaseUser.photoURL || '',
          provider,
          emailVerified: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      res.status(200).json({ customToken });
    } catch (err: any) {
      console.error('[oauthExchange] Error:', err);
      res.status(500).json({ error: err.message || 'Failed to exchange OAuth token.' });
    }
  });
});
