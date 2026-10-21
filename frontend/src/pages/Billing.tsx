import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Copy, 
  Check, 
  ShieldCheck, 
  GraduationCap, 
  Building2, 
  CreditCard,
  Globe,
  Lock,
  Zap,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface BillingProps {
  token: string;
  company: any;
  onCompanyUpdate: (updatedCompany: any) => void;
  user?: any;
}

export default function Billing({ token, company, onCompanyUpdate, user }: BillingProps) {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment method selector: Domestic UPI vs International Stripe
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'STRIPE'>('UPI');

  // Payment configuration from backend
  const [paymentConfig, setPaymentConfig] = useState({
    upiId: '30062006@cnrb',
    upiName: 'MAYANK KUMAR ACHARYA',
    stripePublishableKey: '',
    stripeEnabled: true,
  });

  // Selected tier (Student Pass or Organisation Suite)
  const [selectedPlan, setSelectedPlan] = useState<'STUDENT' | 'ORGANISATION'>('STUDENT');

  // Domestic UPI State
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submittingUpi, setSubmittingUpi] = useState(false);
  const [upiSuccess, setUpiSuccess] = useState('');
  const [upiError, setUpiError] = useState('');

  // International Stripe State
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardCountry, setCardCountry] = useState('United States');
  const [cardZip, setCardZip] = useState('');
  const [submittingStripe, setSubmittingStripe] = useState(false);
  const [stripeSuccess, setStripeSuccess] = useState('');
  const [stripeError, setStripeError] = useState('');

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSub(data.subscription);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();

    fetch('/api/billing/payment-config')
      .then(r => r.json())
      .then(data => {
        if (data.upiId) {
          setPaymentConfig(prev => ({
            ...prev,
            upiId: data.upiId,
            upiName: data.upiName || prev.upiName,
            stripePublishableKey: data.stripePublishableKey || prev.stripePublishableKey,
            stripeEnabled: data.stripeEnabled ?? true,
          }));
        }
      })
      .catch(() => {});
  }, [token]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(paymentConfig.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Submit Direct UPI UTR verification
  const handleVerifyUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpiError('');
    setUpiSuccess('');

    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      setUpiError('Please enter a valid 12-digit UPI Transaction ID / UTR number.');
      return;
    }

    setSubmittingUpi(true);
    try {
      const res = await fetch('/api/billing/submit-upi-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: selectedPlan,
          utrNumber: utrNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment verification failed');

      setUpiSuccess(`Payment verified! ${selectedPlan} subscription activated successfully.`);
      setUtrNumber('');
      localStorage.setItem(`talentai_paid_${user?.id || user?.email || 'default'}`, 'true');
      if (company && onCompanyUpdate) {
        onCompanyUpdate({ ...company, plan: selectedPlan });
      }
      fetchSubscription();
    } catch (err: any) {
      setUpiError(err.message || 'Payment verification failed. Please check your UTR.');
    } finally {
      setSubmittingUpi(false);
    }
  };

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/[\s\S]{1,4}/g) || [];
    setCardNumber(parts.join(' '));
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Detect card brand
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\s+/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return 'Mastercard';
    if (/^3[47]/.test(clean)) return 'American Express';
    if (/^6(011|5)/.test(clean)) return 'Discover';
    return 'Credit / Debit Card';
  };

  // Submit Stripe International Card Payment
  const handleStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setStripeError('');
    setStripeSuccess('');

    const cleanCard = cardNumber.replace(/\s+/g, '');
    if (cleanCard.length < 13) {
      setStripeError('Please enter a valid card number.');
      return;
    }
    if (cardExpiry.length < 5) {
      setStripeError('Please enter card expiry in MM/YY format.');
      return;
    }
    if (cardCvc.trim().length < 3) {
      setStripeError('Please enter a valid 3 or 4 digit CVC security code.');
      return;
    }

    setSubmittingStripe(true);
    try {
      // 1. Request Stripe Session from backend
      const res = await fetch('/api/billing/create-stripe-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize Stripe checkout');

      // If backend redirects to live Stripe Checkout page
      if (data.url && data.isLive) {
        window.location.href = data.url;
        return;
      }

      // 2. Confirm Stripe Payment through our secure handler
      const confirmRes = await fetch('/api/billing/confirm-stripe-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: selectedPlan,
          sessionId: data.sessionId,
          cardLast4: cleanCard.slice(-4),
          cardBrand: getCardBrand(cleanCard),
        }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmData.error || 'Stripe card confirmation failed');

      setStripeSuccess(`🎉 International payment confirmed! ${selectedPlan === 'STUDENT' ? 'Student Pass' : 'Organisation Suite'} is now ACTIVE.`);
      setCardNumber('');
      setCardExpiry('');
      setCardCvc('');
      setCardZip('');
      
      localStorage.setItem(`talentai_paid_${user?.id || user?.email || 'default'}`, 'true');
      if (company && onCompanyUpdate) {
        onCompanyUpdate({ ...company, plan: selectedPlan });
      }
      fetchSubscription();
    } catch (err: any) {
      setStripeError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setSubmittingStripe(false);
    }
  };

  const isStudent = selectedPlan === 'STUDENT';
  const domesticPrice = isStudent ? 199 : 1999;
  const stripePriceUsd = isStudent ? 3 : 29;
  const planName = isStudent ? 'Student Pass' : 'Organisation Suite';

  const upiUri = `upi://pay?pa=${encodeURIComponent(paymentConfig.upiId)}&pn=${encodeURIComponent(paymentConfig.upiName)}&am=${domesticPrice}&cu=INR&tn=${encodeURIComponent(selectedPlan + ' Plan')}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;

  const isUserPaid = typeof window !== 'undefined' && localStorage.getItem(`talentai_paid_${user?.id || user?.email || 'default'}`) === 'true';
  const isSubscriptionActive = sub?.status === 'ACTIVE' || isUserPaid;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto w-full font-sans space-y-6">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
            Subscription &amp; Payments
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Choose your plan and pay securely via Domestic UPI or International Stripe (Cards &amp; Apple Pay).
          </p>
        </div>

        {isSubscriptionActive && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-bold shrink-0 self-start md:self-auto">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Active Plan: {sub?.plan || (user?.role === 'STUDENT' ? 'Student Pass' : 'Organisation Suite')}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 1. Plan Selector (Student or Organisation) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student Option */}
        <button
          type="button"
          onClick={() => setSelectedPlan('STUDENT')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            selectedPlan === 'STUDENT'
              ? 'border-blue-600 bg-blue-500/[0.08] ring-2 ring-blue-500/20 shadow-md'
              : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-blue-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm text-[var(--text-primary)]">Student Pass</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-blue-600">
                {paymentMethod === 'UPI' ? '₹199' : '$3'}
                <span className="text-[10px] text-[var(--text-muted)] font-normal">/mo</span>
              </span>
              <p className="text-[10px] text-[var(--text-muted)]">
                {paymentMethod === 'UPI' ? '≈ $3.00 USD' : '₹199 INR'}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            12k+ LeetCode DSA, 1v1 Arena, ATS Resume Parser &amp; Calendar Streak.
          </p>
        </button>

        {/* Organisation Option */}
        <button
          type="button"
          onClick={() => setSelectedPlan('ORGANISATION')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            selectedPlan === 'ORGANISATION'
              ? 'border-purple-600 bg-purple-500/[0.08] ring-2 ring-purple-500/20 shadow-md'
              : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-purple-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm text-[var(--text-primary)]">Organisation Suite</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-purple-600">
                {paymentMethod === 'UPI' ? '₹1,999' : '$29'}
                <span className="text-[10px] text-[var(--text-muted)] font-normal">/mo</span>
              </span>
              <p className="text-[10px] text-[var(--text-muted)]">
                {paymentMethod === 'UPI' ? '≈ $29.00 USD' : '₹1,999 INR'}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Full hiring suite with AI video proctoring, test links &amp; candidate tables.
          </p>
        </button>
      </div>

      {/* ── 2. Payment Gateway Mode Switcher ── */}
      <div className="flex rounded-xl p-1 bg-[var(--bg-card)] border border-[var(--border)]">
        <button
          type="button"
          onClick={() => setPaymentMethod('UPI')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            paymentMethod === 'UPI'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>🇮🇳 Domestic India (UPI QR • GPay • PhonePe)</span>
        </button>

        <button
          type="button"
          onClick={() => setPaymentMethod('STRIPE')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            paymentMethod === 'STRIPE'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>🌍 International (Stripe • Cards • Apple Pay)</span>
        </button>
      </div>

      {/* ── 3A. Method A: UPI QR Scanner ── */}
      {paymentMethod === 'UPI' && (
        <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-md space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
                Scan &amp; Pay via UPI (Instant Activation)
              </h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
              GPay • PhonePe • Paytm • BHIM
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 text-center shadow-sm">
              <img
                src={qrCodeUrl}
                alt="Payment QR Code"
                className="w-40 h-40 object-contain rounded-lg"
              />
              <p className="text-xs font-black text-slate-900 mt-2">
                Scan to Pay ₹{domesticPrice} for {planName}
              </p>
              
              <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono font-bold text-slate-700">
                <span>{paymentConfig.upiId}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="p-0.5 hover:text-blue-600 transition-colors"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* UTR Verification Form */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-[var(--text-primary)]">
                After paying, enter your 12-digit UTR to activate:
              </p>

              {upiError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{upiError}</span>
                </div>
              )}

              {upiSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{upiSuccess}</span>
                </div>
              )}

              <form onSubmit={handleVerifyUpi} className="space-y-2.5">
                <input
                  type="text"
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value)}
                  placeholder="Enter 12-digit UTR (e.g. 423819847291)"
                  maxLength={20}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-500"
                />

                <button
                  type="submit"
                  disabled={submittingUpi}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {submittingUpi ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify UTR &amp; Activate Plan</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── 3B. Method B: International Stripe Payment ── */}
      {paymentMethod === 'STRIPE' && (
        <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-md space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
                International Card Payment (Stripe)
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
              <Lock className="w-3 h-3" />
              <span>256-Bit SSL • PCI-DSS Level 1</span>
            </div>
          </div>

          {stripeError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{stripeError}</span>
            </div>
          )}

          {stripeSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{stripeSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card Preview & Badges */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-white shadow-lg space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black tracking-wider text-blue-400">TalentAI Stripe</span>
                  <span className="text-xs font-bold text-slate-300">{getCardBrand(cardNumber)}</span>
                </div>
                
                <div className="pt-2">
                  <div className="w-9 h-7 rounded bg-amber-400/80 mb-3 border border-amber-300" />
                  <p className="font-mono text-sm tracking-widest text-slate-100">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-300">
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-slate-400">Cardholder</p>
                    <p className="font-bold truncate max-w-[110px]">{cardName || 'YOUR NAME'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-wider text-slate-400">Expires</p>
                    <p className="font-bold">{cardExpiry || 'MM/YY'}</p>
                  </div>
                </div>
              </div>

              {/* Supported brands */}
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-center space-y-1.5">
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Accepted Payment Methods
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-[var(--text-primary)] flex-wrap">
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">Visa</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">Mastercard</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">Amex</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">Apple Pay</span>
                </div>
              </div>
            </div>

            {/* Card Inputs Form */}
            <form onSubmit={handleStripePayment} className="md:col-span-2 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-blue-500"
                  />
                  <CreditCard className="w-4 h-4 absolute right-3.5 top-3 text-[var(--text-muted)] pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    value={cardCvc}
                    onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    Country / Region
                  </label>
                  <select
                    value={cardCountry}
                    onChange={e => setCardCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] outline-none focus:border-blue-500"
                  >
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="Singapore">Singapore</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                    <option value="Other">Other Country</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    ZIP / Postal Code
                  </label>
                  <input
                    type="text"
                    value={cardZip}
                    onChange={e => setCardZip(e.target.value)}
                    placeholder="94016"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingStripe}
                className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {submittingStripe ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Pay ${stripePriceUsd}.00 USD via Stripe</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 4. Feature Highlights ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Instant Plan Activation</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            Accounts are upgraded automatically upon verification with zero delay.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>Bank-Grade Encryption</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            Card details are processed through PCI-DSS Level 1 compliant Stripe infrastructure.
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <span>Full Money-Back Guarantee</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            Cancel anytime or contact support within 7 days for a hassle-free refund.
          </p>
        </div>
      </div>
    </div>
  );
}
