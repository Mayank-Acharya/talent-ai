import React, { useState, useEffect } from 'react';
import { 
  Lock, CheckCircle2, QrCode, ShieldCheck, Crown, 
  Sparkles, ArrowRight, Copy, Check, AlertCircle, CreditCard, RefreshCw 
} from 'lucide-react';

interface TrialPaywallProps {
  onUnlockAsMaster: () => void;
  onPaymentSuccess?: () => void;
  onNavigateLanding?: () => void;
}

export default function TrialPaywall({ onUnlockAsMaster, onPaymentSuccess, onNavigateLanding }: TrialPaywallProps) {
  const [selectedPlan, setSelectedPlan] = useState<'STUDENT' | 'ORGANISATION'>('STUDENT');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [senderUpi, setSenderUpi] = useState('');
  const [submittingUpi, setSubmittingUpi] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Config from backend
  const [paymentConfig, setPaymentConfig] = useState({
    upiId: '30062006@cnrb',
    upiName: 'MAYANK KUMAR ACHARYA',
    razorpayKeyId: '',
    razorpayEnabled: false,
  });

  useEffect(() => {
    fetch('/api/billing/payment-config')
      .then(r => r.json())
      .then(data => {
        if (data.upiId) setPaymentConfig(data);
      })
      .catch(() => {});
  }, []);

  const planPrice = selectedPlan === 'STUDENT' ? 199 : 1999;
  const planLabel = selectedPlan === 'STUDENT' ? 'Student Pro Pass (₹199/mo)' : 'Organisation Suite (₹1,999/mo)';

  // Generate UPI QR Code URL
  const upiUri = `upi://pay?pa=${encodeURIComponent(paymentConfig.upiId)}&pn=${encodeURIComponent(paymentConfig.upiName)}&am=${planPrice}&cu=INR&tn=${encodeURIComponent(selectedPlan + ' Subscription')}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(paymentConfig.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleVerifyUpiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      setError('Please enter a valid 12-digit UPI Transaction ID / UTR from your payment app.');
      return;
    }

    setSubmittingUpi(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/billing/submit-upi-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          plan: selectedPlan,
          utrNumber: utrNumber.trim(),
          senderUpi: senderUpi.trim() || undefined,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setSuccessMsg('Payment Submitted & Verified! Unlocking full platform access...');
      localStorage.removeItem('talentai_demo_locked');
      localStorage.removeItem('is_demo_guest');
      
      setTimeout(() => {
        if (onPaymentSuccess) onPaymentSuccess();
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Payment submission failed. Please verify your UTR.');
    } finally {
      setSubmittingUpi(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col justify-between p-4 sm:p-8 font-sans">
      <div className="max-w-4xl w-full mx-auto my-auto space-y-6">
        
        {/* Header Alert: Trial Expired */}
        <div className="p-6 sm:p-8 rounded-3xl border text-center space-y-3 relative overflow-hidden shadow-2xl"
          style={{ background: 'var(--bg-card)', borderColor: '#f59e0b' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border inline-block mb-1"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}>
              1-Time Free Demo Walkthrough Completed
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Unlock Full Access to TalentAI
            </h1>
            <p className="text-xs sm:text-sm max-w-xl mx-auto mt-1" style={{ color: 'var(--text-muted)' }}>
              You've explored the live demo! To continue practicing 12,000+ LeetCode problems, dueling in the 1v1 Battle Arena, running ATS resume scans, and tracking streaks, activate your plan below.
            </p>
          </div>
        </div>

        {/* Pricing & Payment Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Column 1: Plan Picker & Feature List */}
          <div className="p-6 rounded-3xl border flex flex-col justify-between space-y-4 shadow-xl"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div>
              <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                1. Select Your Subscription Plan
              </p>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedPlan('STUDENT')}
                  className={`p-3 rounded-2xl border text-left transition-all ${selectedPlan === 'STUDENT' ? 'ring-2 ring-blue-500 shadow-md' : 'opacity-70'}`}
                  style={{
                    background: selectedPlan === 'STUDENT' ? 'rgba(37,99,235,0.12)' : 'var(--bg-secondary)',
                    borderColor: selectedPlan === 'STUDENT' ? '#2563eb' : 'var(--border)',
                  }}
                >
                  <p className="text-xs font-black" style={{ color: '#2563eb' }}>Student Pass</p>
                  <p className="text-xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>₹199<span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>/mo</span></p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Personal Practice</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPlan('ORGANISATION')}
                  className={`p-3 rounded-2xl border text-left transition-all ${selectedPlan === 'ORGANISATION' ? 'ring-2 ring-purple-500 shadow-md' : 'opacity-70'}`}
                  style={{
                    background: selectedPlan === 'ORGANISATION' ? 'rgba(124,58,237,0.12)' : 'var(--bg-secondary)',
                    borderColor: selectedPlan === 'ORGANISATION' ? '#7c3aed' : 'var(--border)',
                  }}
                >
                  <p className="text-xs font-black" style={{ color: '#7c3aed' }}>Org Suite</p>
                  <p className="text-xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>₹1,999<span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>/mo</span></p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Hiring & Proctoring</p>
                </button>
              </div>

              {/* What is Unlocked */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>What you get:</p>
                <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>12,000+ Problem Bank</strong> (LeetCode, CP-31, Striver Sheets)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>1v1 Battle Arena</strong> with live multiplayer matchmaking & rating</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>ATS Resume Parser</strong> with actual keyword extraction & role scoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Authentic Solved Tracker</strong> with real 12-month calendar streaks</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Master Owner Bypass Banner */}
            <div className="p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-2"
              style={{ background: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.25)' }}>
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="font-bold text-[11px]" style={{ color: 'var(--text-primary)' }}>Are you the platform owner?</span>
              </div>
              <button
                type="button"
                onClick={onUnlockAsMaster}
                className="px-3 py-1.5 rounded-xl font-black text-[11px] text-white shadow-sm"
                style={{ background: '#7c3aed' }}
              >
                Owner VIP Login
              </button>
            </div>
          </div>

          {/* Column 2: Direct UPI QR Code & Instant Verification */}
          <div className="p-6 rounded-3xl border flex flex-col justify-between space-y-4 shadow-xl"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  2. Scan UPI QR &amp; Pay (Instant)
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                  ⚡ GPay / PhonePe / Paytm / BHIM
                </span>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-3 rounded-2xl border text-center my-2"
                style={{ background: '#ffffff', borderColor: 'var(--border)' }}>
                <img
                  src={qrCodeUrl}
                  alt="UPI Payment QR Code"
                  className="w-40 h-40 object-contain rounded-lg"
                />
                <p className="text-xs font-black text-slate-900 mt-2">
                  Scan to Pay ₹{planPrice} via any UPI App
                </p>
                <div className="flex items-center gap-1.5 mt-1 bg-slate-100 px-3 py-1 rounded-full text-[11px] font-mono font-bold text-slate-700">
                  <span>{paymentConfig.upiId}</span>
                  <button type="button" onClick={handleCopyUpi} className="hover:text-blue-600 transition-colors">
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Alerts */}
              {error && (
                <div className="p-3 rounded-xl border text-xs text-red-500 mb-2 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl border text-xs text-emerald-500 mb-2 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' }}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Form: UTR Verification */}
              <form onSubmit={handleVerifyUpiPayment} className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                    Enter 12-Digit UPI Reference / UTR Number from your payment:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 429182390123"
                    value={utrNumber}
                    onChange={e => setUtrNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border outline-none font-mono"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingUpi}
                  className="w-full py-3 rounded-xl font-black text-xs text-white shadow-lg flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff' }}
                >
                  {submittingUpi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Submit UTR &amp; Unlock Account Instantly</span>
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
