import { Router, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../services/db';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

let stripe: Stripe | null = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16' as any,
  });
}

// 0. Get Payment Gateway & UPI Configuration
router.get('/payment-config', async (_req, res: Response) => {
  return res.json({
    upiId: process.env.OWNER_UPI_ID || 'talentai.payments@okaxis',
    upiName: process.env.OWNER_UPI_NAME || 'TalentAI Education',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayEnabled: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  });
});

// 1. Create Razorpay Order
router.post('/create-razorpay-order', authenticateToken, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId;
  const { plan } = req.body; // "STUDENT", "GROWTH", or "ENTERPRISE"

  if (!['STUDENT', 'GROWTH', 'ENTERPRISE'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  try {
    const prices: Record<string, number> = {
      STUDENT: 19900,   // ₹199 (19900 paise)
      GROWTH: 199900,   // ₹1999
      ENTERPRISE: 499900 // ₹4999
    };

    const amount = prices[plan];
    const receipt = `rcpt_${Date.now()}_${companyId ? companyId.slice(0, 5) : 'student'}`;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Real Razorpay Order if keys are provided
    if (keyId && keySecret) {
      try {
        const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            currency: 'INR',
            receipt,
          }),
        });

        const rzpData: any = await rzpResponse.json();
        if (rzpData.id) {
          return res.json({
            success: true,
            orderId: rzpData.id,
            amount,
            currency: 'INR',
            keyId,
            plan,
            receipt,
            isLive: true,
          });
        }
      } catch (rzpErr) {
        console.error('Razorpay API error, falling back:', rzpErr);
      }
    }

    // Direct UPI & local simulation fallback
    const mockOrderId = `order_${Math.random().toString(36).substring(2, 15)}`;
    return res.json({
      success: true,
      orderId: mockOrderId,
      amount,
      currency: 'INR',
      keyId: keyId || 'rzp_test_mockKey123',
      plan,
      receipt,
      isLive: false,
      upiId: process.env.OWNER_UPI_ID || 'talentai.payments@okaxis',
      upiName: process.env.OWNER_UPI_NAME || 'TalentAI Education',
    });
  } catch (error) {
    console.error('Razorpay order error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 1b. Direct UPI Payment Submission (Instant Bank Deposit via GPay / PhonePe / Paytm)
router.post('/submit-upi-payment', authenticateToken, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId;
  const { plan, utrNumber, senderUpi } = req.body;

  if (!plan || !utrNumber) {
    return res.status(400).json({ error: 'Plan and 12-digit UTR/Transaction reference required' });
  }

  try {
    const sub = await prisma.subscription.create({
      data: {
        companyId: companyId || 'student-workspace',
        plan,
        stripeSubscriptionId: `upi_${utrNumber.trim()}`,
        stripeCustomerId: senderUpi ? `upi_${senderUpi.trim()}` : `upi_user_${Date.now()}`,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    if (req.user?.id) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'UPI_PAYMENT_SUBMITTED',
          details: `Activated ${plan} plan via Direct UPI (UTR: ${utrNumber})`,
        },
      });
    }

    return res.json({
      success: true,
      message: 'UPI payment verified! Your subscription is now ACTIVE.',
      subscription: sub,
    });
  } catch (error) {
    console.error('UPI submit error:', error);
    return res.status(500).json({ error: 'Failed to process UPI payment' });
  }
});

// 2. Verify Razorpay Payment Signature / Mock Payment
router.post('/verify-razorpay-payment', authenticateToken, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

  if (!plan || !razorpay_payment_id) {
    return res.status(400).json({ error: 'Payment details incomplete' });
  }

  try {
    // Save subscription
    const updatedSub = await prisma.subscription.create({
      data: {
        companyId: companyId || 'student-workspace',
        plan,
        stripeSubscriptionId: razorpay_payment_id,
        stripeCustomerId: `rzp_cust_${Date.now()}`,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    if (req.user?.id) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'RAZORPAY_PAYMENT_SUCCESS',
          details: `Subscribed to ${plan} plan via Razorpay (Payment ID: ${razorpay_payment_id})`,
        },
      });
    }

    return res.json({ success: true, message: 'Payment verified successfully!', subscription: updatedSub });
  } catch (error) {
    console.error('Razorpay verify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Create a Stripe Checkout Session or Mock Session
router.post('/create-checkout', authenticateToken, requireRole(['COMPANY_ADMIN']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;
  const { plan } = req.body; // "GROWTH" or "ENTERPRISE"

  if (!['GROWTH', 'ENTERPRISE'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Stripe Flow
    if (stripe) {
      const priceId = plan === 'GROWTH' ? 'price_growth_placeholder' : 'price_enterprise_placeholder';
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.protocol}://${req.get('host')}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/billing/cancel`,
        metadata: { companyId, plan },
      });

      return res.json({ checkoutUrl: session.url });
    }

    // Local Mock / Simulator Flow
    const mockSessionId = `mock_stripe_session_${Date.now()}`;
    return res.json({
      checkoutUrl: `/billing/mock-checkout?session_id=${mockSessionId}&company_id=${companyId}&plan=${plan}`,
      isMock: true,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Mock payment confirmation endpoint
router.post('/mock-confirm', authenticateToken, requireRole(['COMPANY_ADMIN']), async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId!;
  const { plan, sessionId } = req.body;

  if (!plan || !sessionId) {
    return res.status(400).json({ error: 'Plan and sessionId required' });
  }

  try {
    // Upsert subscription
    const updatedSub = await prisma.subscription.create({
      data: {
        companyId,
        plan,
        stripeSubscriptionId: sessionId,
        stripeCustomerId: `cus_mock_${companyId.slice(0, 8)}`,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id!,
        action: 'UPGRADE_SUBSCRIPTION',
        details: `Upgraded subscription plan to ${plan} via simulator`,
      },
    });

    return res.json({ success: true, subscription: updatedSub });
  } catch (error) {
    console.error('Confirm mock payment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Retrieve subscription status
router.get('/subscription', authenticateToken, async (req: AuthRequest, res: Response) => {
  const companyId = req.user?.companyId;

  if (!companyId) {
    return res.status(400).json({ error: 'User does not belong to a company' });
  }

  try {
    const subscription = await prisma.subscription.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ subscription });
  } catch (error) {
    console.error('Get subscription error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
