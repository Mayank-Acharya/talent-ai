import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Sparkles,
  AlertCircle,
  Crown,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Building2,
  GraduationCap,
  ArrowRight,
  Database,
  ExternalLink,
  Settings as SettingsIcon,
  HelpCircle,
  Clock
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

  // Payment configuration from backend
  const [paymentConfig, setPaymentConfig] = useState({
    upiId: 'talentai.payments@okaxis',
    upiName: 'TalentAI Education',
    razorpayKeyId: '',
    razorpayEnabled: false,
  });

  // Direct UPI Payment states
  const [selectedUpiPlan, setSelectedUpiPlan] = useState<'STUDENT' | 'ORGANISATION'>('STUDENT');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submittingUpi, setSubmittingUpi] = useState(false);
  const [upiSuccess, setUpiSuccess] = useState('');
  const [upiError, setUpiError] = useState('');

  // Simulated Checkout Flow Overlay
  const [activeMockCheckout, setActiveMockCheckout] = useState<any>(null);
  const [processingMockPayment, setProcessingMockPayment] = useState(false);

  const isMaster = user?.isMaster === true || user?.role === 'SUPER_ADMIN' || user?.email === 'admin@talentai.com';

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

    // Fetch live UPI & payment gateway config
    fetch('/api/billing/payment-config')
      .then(r => r.json())
      .then(data => {
        if (data.upiId) setPaymentConfig(data);
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
          plan: selectedUpiPlan,
          utrNumber: utrNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment verification failed');

      setUpiSuccess(`Payment verified! ${selectedUpiPlan} subscription has been activated.`);
      setUtrNumber('');
      fetchSubscription();
    } catch (err: any) {
      setUpiError(err.message || 'Payment verification failed. Please double-check your UTR.');
    } finally {
      setSubmittingUpi(false);
    }
  };

  const handleRazorpayCheckout = async (plan: string) => {
    setError('');
    try {
      const res = await fetch('/api/billing/create-razorpay-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActiveMockCheckout({
        plan: data.plan,
        sessionId: data.orderId,
        isRazorpay: true,
        amount: data.amount
      });
    } catch (err: any) {
      setError(err.message || 'Razorpay checkout initiation failed');
    }
  };

  const handleUpgrade = async (plan: string) => {
    setError('');
    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (data.isMock) {
        const params = new URLSearchParams(data.checkoutUrl.split('?')[1]);
        setActiveMockCheckout({
          plan: params.get('plan'),
          sessionId: params.get('session_id'),
        });
      } else {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Upgrade checkout failed');
    }
  };

  const handleSimulateApprove = async () => {
    if (!activeMockCheckout) return;
    setProcessingMockPayment(true);

    try {
      const endpoint = activeMockCheckout.isRazorpay 
        ? '/api/billing/verify-razorpay-payment' 
        : '/api/billing/mock-confirm';

      const body = activeMockCheckout.isRazorpay
        ? {
            plan: activeMockCheckout.plan,
            razorpay_order_id: activeMockCheckout.sessionId,
            razorpay_payment_id: `pay_${Math.random().toString(36).substring(2, 15)}`,
            razorpay_signature: 'mock_sig_123'
          }
        : {
            plan: activeMockCheckout.plan,
            sessionId: activeMockCheckout.sessionId,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setActiveMockCheckout(null);
      fetchSubscription();
      alert(`Payment Verified! Subscription activated for ${activeMockCheckout.plan} tier.`);
    } catch (err: any) {
      alert(err.message || 'Payment confirmation failed');
    } finally {
      setProcessingMockPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col gap-6 w-full animate-pulse max-w-6xl mx-auto">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4" />
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  const upiPrice = selectedUpiPlan === 'STUDENT' ? 199 : 1999;
  const upiUri = `upi://pay?pa=${encodeURIComponent(paymentConfig.upiId)}&pn=${encodeURIComponent(paymentConfig.upiName)}&am=${upiPrice}&cu=INR&tn=${encodeURIComponent(selectedUpiPlan + ' Plan Activation')}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUri)}`;

  return (
    <div className="p-6 lg:p-10 space-y-8 w-full max-w-6xl mx-auto font-sans">
      
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-black uppercase tracking-wider mb-2">
            <Zap className="w-3.5 h-3.5" /> Billing &amp; Subscriptions
          </div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Payments &amp; Revenue Hub</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Receive direct instant UPI payments (PhonePe, GPay, Paytm) and manage subscription tiers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-xs font-bold flex items-center gap-2 shadow-sm">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[var(--text-secondary)]">Database:</span>
            <span className="text-emerald-600 font-extrabold">Neon PostgreSQL Live</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 flex items-start gap-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── MASTER OWNER VIP HERO CARD ── */}
      {isMaster && (
        <div className="relative overflow-hidden rounded-3xl p-7 lg:p-8 text-white shadow-2xl transition-all"
          style={{
            background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 50%, #7e22ce 100%)',
          }}
        >
          {/* Subtle background glow effect */}
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wider shadow-sm">
                  <Crown className="w-3.5 h-3.5" /> Platform Creator &amp; Master Admin
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold">
                  SUPER_ADMIN
                </span>
              </div>

              <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
                Master Owner Lifetime VIP Access
              </h2>

              <p className="text-purple-100/90 text-sm leading-relaxed">
                You are recognized as the platform owner. All premium features, 12,000+ LeetCode problems, 1v1 multiplayer arena, ATS resume parser, and proctoring suites are permanently unlocked for your account without any charges or expiration.
              </p>
            </div>

            {/* Quick Metrics Badge Grid */}
            <div className="grid grid-cols-2 gap-2.5 shrink-0">
              <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-200">Account Access</p>
                <p className="text-sm font-black text-white mt-0.5">Permanent VIP</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-200">Billing Rate</p>
                <p className="text-sm font-black text-emerald-300 mt-0.5">₹0 / Lifetime</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-200">Trial Limits</p>
                <p className="text-sm font-black text-white mt-0.5">Zero Limits</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-200">Incoming UPI</p>
                <p className="text-sm font-black text-amber-300 mt-0.5 truncate max-w-[120px]">
                  {paymentConfig.upiId}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: DIRECT INSTANT UPI PAYMENT & CHECKOUT HUB ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xl font-black text-[var(--text-primary)]">
              {isMaster ? 'Customer Checkout Experience (Live Preview)' : 'Activate Subscription Plan'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isMaster
                ? 'This is the exact high-converting checkout your candidates and students experience to pay into your UPI account.'
                : 'Select your preferred tier and scan the UPI QR code to activate access instantly.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            <span>Instant UTR Verification Active</span>
          </div>
        </div>

        {/* 2-Column Responsive Layout: Plans on Left, UPI Terminal on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ── Left Column: Plan Selector & Feature Benefits (7 cols) ── */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Student Pass Card */}
            <div
              onClick={() => setSelectedUpiPlan('STUDENT')}
              className={`p-6 rounded-3xl border transition-all cursor-pointer relative shadow-sm ${
                selectedUpiPlan === 'STUDENT'
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/[0.03] dark:bg-blue-500/[0.06]'
                  : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-blue-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    selectedUpiPlan === 'STUDENT'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-blue-500/10 text-blue-600'
                  }`}>
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-lg text-[var(--text-primary)]">Student Pro Pass</h4>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600">
                        Most Popular
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      For engineering students, job hunters &amp; competitive programmers.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-blue-600">₹199</span>
                  <span className="text-xs text-[var(--text-muted)] block font-medium">/month ($20)</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>12,000+ Problem Bank (LeetCode &amp; CP-31)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>1v1 Competitive Multiplayer Coding Arena</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>ATS Resume Parser &amp; Skill Optimizer</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>12-Month Authentic Streak Calendar</span>
                </div>
              </div>
            </div>

            {/* Organisation Suite Card */}
            <div
              onClick={() => setSelectedUpiPlan('ORGANISATION')}
              className={`p-6 rounded-3xl border transition-all cursor-pointer relative shadow-sm ${
                selectedUpiPlan === 'ORGANISATION'
                  ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/[0.03] dark:bg-purple-500/[0.06]'
                  : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-purple-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    selectedUpiPlan === 'ORGANISATION'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-purple-500/10 text-purple-600'
                  }`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-lg text-[var(--text-primary)]">Organisation Suite</h4>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600">
                        Full Hiring Platform
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      For recruitment teams, companies &amp; universities screening candidates.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-purple-600">₹1,999</span>
                  <span className="text-xs text-[var(--text-muted)] block font-medium">/month ($100)</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Everything in Student Pro Pass</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Autonomous Video Proctoring &amp; AI Feedback</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>1-Click Test Links via Email &amp; WhatsApp</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>Unlimited Candidate Pipeline &amp; CSV Export</span>
                </div>
              </div>
            </div>

            {/* Platform Owner Config Info Box */}
            {isMaster && (
              <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] flex items-start gap-3 text-xs">
                <SettingsIcon className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-[var(--text-primary)]">Want to change where student payments go?</p>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    Set your own UPI ID (e.g. your PhonePe / GPay ID) in <code className="px-1.5 py-0.5 rounded bg-[var(--bg-hover)] border font-mono">backend/.env</code> as <code className="font-mono font-bold">UPI_ID="yourname@okaxis"</code>. When students transfer ₹199, funds land instantly in your personal Indian bank account!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Instant UPI Payment Terminal (5 cols) ── */}
          <div className="lg:col-span-5 p-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <h4 className="font-black text-sm text-[var(--text-primary)]">Instant UPI Terminal</h4>
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                GPay • PhonePe • Paytm
              </span>
            </div>

            {/* Crisp QR Code Display */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 shadow-md">
              <img
                src={qrCodeUrl}
                alt="UPI Payment QR Code"
                className="w-48 h-48 object-contain rounded-xl"
              />
              <div className="text-center mt-3">
                <p className="text-sm font-black text-slate-900">
                  Scan to Pay ₹{upiPrice}
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  {selectedUpiPlan === 'STUDENT' ? 'Student Pro Pass (1 Month)' : 'Organisation Suite (1 Month)'}
                </p>
              </div>

              {/* Copyable UPI ID Pill */}
              <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-slate-100 text-[11px] font-mono font-bold text-slate-800 border border-slate-200">
                <span>{paymentConfig.upiId}</span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="hover:text-blue-600 transition-colors p-0.5"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Alerts */}
            {upiError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{upiError}</span>
              </div>
            )}

            {upiSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{upiSuccess}</span>
              </div>
            )}

            {/* UTR Verification Form */}
            <form onSubmit={handleVerifyUpi} className="space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Submit 12-Digit UTR / Transaction ID
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value)}
                  placeholder="e.g. 423819847291"
                  maxLength={20}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submittingUpi}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {submittingUpi ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify UTR &amp; Activate Access</span>
                  </>
                )}
              </button>
            </form>

            {/* Razorpay Alternative Checkout */}
            <div className="pt-2 border-t border-[var(--border)] text-center">
              <button
                type="button"
                onClick={() => handleRazorpayCheckout(selectedUpiPlan)}
                className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Or pay via Credit/Debit Card or NetBanking</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MOCK/SIMULATED CHECKOUT MODAL ── */}
      {activeMockCheckout && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 max-w-md w-full shadow-2xl relative space-y-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 text-[10px] font-black text-purple-600 dark:text-purple-400 rounded-full w-max mx-auto">
              <Sparkles className="w-3.5 h-3.5" /> Razorpay Checkout Portal
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-2xl font-black text-[var(--text-primary)]">Complete Subscription Payment</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Approve payment authorization to activate your chosen tier instantly.
              </p>
            </div>

            <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)] space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Selected Plan:</span>
                <strong className="text-[var(--text-primary)] font-bold">{activeMockCheckout.plan}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Amount:</span>
                <strong className="text-emerald-600 font-bold">
                  {activeMockCheckout.plan === 'STUDENT' ? '₹199' : '₹1,999'}/mo
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Order ID:</span>
                <code className="text-[10px] text-[var(--text-muted)] font-mono">{activeMockCheckout.sessionId.slice(0, 18)}...</code>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleSimulateApprove}
                disabled={processingMockPayment}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black text-white transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {processingMockPayment ? 'Authorizing charge...' : 'Approve Payment & Activate Plan'}
              </button>
              
              <button
                onClick={() => setActiveMockCheckout(null)}
                className="w-full py-3 border border-[var(--border)] hover:bg-[var(--bg-hover)] text-xs font-bold text-[var(--text-muted)] rounded-xl transition-colors cursor-pointer"
              >
                Cancel Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
