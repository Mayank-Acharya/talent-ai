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
  ArrowRight,
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

  // Payment configuration from backend
  const [paymentConfig, setPaymentConfig] = useState({
    upiId: '30062006@cnrb',
    upiName: 'MAYANK KUMAR ACHARYA',
    razorpayKeyId: '',
    razorpayEnabled: false,
  });

  // Selected tier & UPI verification
  const [selectedPlan, setSelectedPlan] = useState<'STUDENT' | 'ORGANISATION'>('STUDENT');
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submittingUpi, setSubmittingUpi] = useState(false);
  const [upiSuccess, setUpiSuccess] = useState('');
  const [upiError, setUpiError] = useState('');



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
          plan: selectedPlan,
          utrNumber: utrNumber.trim(),
        }),
      });

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

  const planPrice = selectedPlan === 'STUDENT' ? 199 : 1999;
  const planName = selectedPlan === 'STUDENT' ? 'Student Pass' : 'Organisation Suite';
  const upiUri = `upi://pay?pa=${encodeURIComponent(paymentConfig.upiId)}&pn=${encodeURIComponent(paymentConfig.upiName)}&am=${planPrice}&cu=INR&tn=${encodeURIComponent(selectedPlan + ' Plan')}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto w-full font-sans space-y-6">
      
      {/* ── Simple Clean Header ── */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
          Subscription &amp; Payments
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Select a tier and scan the UPI QR code to activate your plan instantly.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 1. Plan Selector (Student or Organisation) ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Student Option */}
        <button
          type="button"
          onClick={() => setSelectedPlan('STUDENT')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
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
            <span className="text-lg font-black text-blue-600">₹199<span className="text-[10px] text-[var(--text-muted)] font-normal">/mo</span></span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            12k+ LeetCode DSA, 1v1 Arena, ATS Resume Parser &amp; Calendar Streak.
          </p>
        </button>

        {/* Organisation Option */}
        <button
          type="button"
          onClick={() => setSelectedPlan('ORGANISATION')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
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
            <span className="text-lg font-black text-purple-600">₹1,999<span className="text-[10px] text-[var(--text-muted)] font-normal">/mo</span></span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Full hiring suite with AI video proctoring, test links &amp; candidate tables.
          </p>
        </button>
      </div>

      {/* ── 2. Simple Payment Methods (Scanner & NetBanking) ── */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-md space-y-6">
        
        {/* Method A: UPI QR Scanner */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
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
                Scan to Pay ₹{planPrice} for {planName}
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
      </div>
    </div>
  );
}
