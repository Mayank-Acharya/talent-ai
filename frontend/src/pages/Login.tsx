import React, { useState } from 'react';
import {
  Brain, Lock, Mail, User, Building, AlertCircle,
  ArrowLeft, Eye, EyeOff, CheckCircle2, GraduationCap, Building2,
  Sparkles, Crown, ArrowRight
} from 'lucide-react';

interface LoginProps {
  onAuthSuccess: (token: string, user: any, company: any) => void;
  onNavigate: (page: string) => void;
  onOpenPaywall?: () => void;
}

function InputRow({
  id, icon: Icon, label, type, value, onChange, placeholder, right
}: any) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-[var(--text-secondary)]"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]"
        />
        <input
          id={id}
          type={type}
          required
          placeholder={placeholder}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors focus:border-[var(--brand)]"
        />
        {right && right}
      </div>
    </div>
  );
}

const features = [
  'Autonomous live video proctoring & AI evaluations',
  '12,000+ LeetCode DSA bank & CP-31 practice sheets',
  'Multi-pass ATS resume parser & honest score optimizer',
  '1-Click candidate links via Email, Phone/SMS, or WhatsApp',
  'Real-time P2P 1v1 competitive coding arena',
];

export default function Login({ onAuthSuccess, onNavigate, onOpenPaywall }: LoginProps) {
  // mode can be: 'login' | 'student_signup' | 'org_signup'
  const [authMode, setAuthMode] = useState<'login' | 'student_signup' | 'org_signup'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isDemoLocked = typeof window !== 'undefined' && localStorage.getItem('talentai_demo_locked') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (authMode !== 'login' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    let endpoint = '/api/auth/login';
    let body: any = { email, password };

    if (authMode === 'student_signup') {
      endpoint = '/api/auth/register-student';
      body = { email, password, name };
    } else if (authMode === 'org_signup') {
      endpoint = '/api/auth/register';
      body = { companyName, email, password, name };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.company) localStorage.setItem('company', JSON.stringify(data.company));
      onAuthSuccess(data.token, data.user, data.company);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Demo Guest Pass Login
  const handleDemoGuestLogin = async () => {
    if (localStorage.getItem('talentai_demo_locked') === 'true') {
      setError('Your 1-time free demo walkthrough has already concluded. Please activate a subscription to continue, or sign in as Master Owner.');
      if (onOpenPaywall) onOpenPaywall();
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize demo pass');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.company) localStorage.setItem('company', JSON.stringify(data.company));

      onAuthSuccess(data.token, data.user, data.company);
    } catch (err: any) {
      setError(err.message || 'Demo initialization failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Master Owner VIP Login (Creator/Owner Bypass)
  const handleMasterOwnerLogin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/master-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Master login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.company) localStorage.setItem('company', JSON.stringify(data.company));
      
      // Clear demo lock for master owner
      localStorage.removeItem('talentai_demo_locked');

      onAuthSuccess(data.token, data.user, data.company);
    } catch (err: any) {
      setError(err.message || 'Master login failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode: 'login' | 'student_signup' | 'org_signup') => {
    setAuthMode(mode);
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setName('');
    setCompanyName('');
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 font-sans">
      
      {/* ── Left Branding Panel ── */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden w-[45%] bg-[var(--bg-secondary)] border-r border-[var(--border)]">
        <div className="absolute pointer-events-none -top-[10%] -left-[10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute pointer-events-none -bottom-[5%] -right-[10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16 cursor-pointer" onClick={() => onNavigate('landing')}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--brand)] shadow-lg shadow-purple-600/30">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-[var(--text-primary)]">Talent<span className="text-[var(--brand)]">AI</span></span>
          </div>

          <h2 className="text-4xl font-black tracking-tight mb-4 leading-tight text-[var(--text-primary)]">
            Empower your hiring with<br />
            <span className="text-gradient">Autonomous AI Intelligence</span>
          </h2>
          <p className="text-sm leading-relaxed mb-10 text-[var(--text-secondary)]">
            The AI-powered interview & assessment platform built for both students and growing technical teams.
          </p>

          <ul className="space-y-4">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-purple-500/10 border border-purple-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand)]" />
                </div>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Plan Highlights */}
        <div className="relative z-10 grid grid-cols-2 gap-3 pt-6 border-t border-[var(--border)]">
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-extrabold uppercase text-[var(--text-primary)]">Student Pass</span>
            </div>
            <p className="text-xl font-black text-blue-500">₹199<span className="text-xs text-[var(--text-muted)] font-normal">/mo ($20)</span></p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">12k+ DSA bank, ATS parser, P2P arena & mock interview links</p>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-extrabold uppercase text-[var(--text-primary)]">Organisation</span>
            </div>
            <p className="text-xl font-black text-purple-500">₹1,999<span className="text-xs text-[var(--text-muted)] font-normal">/mo ($100)</span></p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Full candidate pipeline, video proctoring & plagiarism shield</p>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative bg-[var(--bg-primary)] overflow-y-auto">
        {/* Back to landing */}
        <button
          onClick={() => onNavigate('landing')}
          className="absolute top-8 left-8 flex items-center gap-2 text-sm font-semibold transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <div className="w-full max-w-md py-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--brand)]">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black text-[var(--text-primary)]">Talent<span className="text-[var(--brand)]">AI</span></span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl p-1 mb-6 bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-bold">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 rounded-lg transition-all ${
                authMode === 'login'
                  ? 'bg-[var(--brand)] text-white shadow-md'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('student_signup')}
              className={`flex-1 py-2.5 rounded-lg transition-all ${
                authMode === 'student_signup'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Student (₹199)
            </button>
            <button
              type="button"
              onClick={() => switchMode('org_signup')}
              className={`flex-1 py-2.5 rounded-lg transition-all ${
                authMode === 'org_signup'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Org (₹1,999)
            </button>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] mb-1">
              {authMode === 'login' && 'Welcome back'}
              {authMode === 'student_signup' && 'Student Registration'}
              {authMode === 'org_signup' && 'Organisation Signup'}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {authMode === 'login' && 'Sign in to access your assessments, arena duels, and candidate pipeline.'}
              {authMode === 'student_signup' && 'Practice DSA, parse resumes, and duel in 1v1 arenas for ₹199/mo.'}
              {authMode === 'org_signup' && 'Full recruitment suite with proctoring & analytics for ₹1,999/mo.'}
            </p>
          </div>

          {/* ── 1-CLICK ACCESS PASSES (DEMO GUEST & MASTER OWNER) ── */}
          <div className="space-y-3 mb-6">
            {/* Demo Guest 1-Time Pass */}
            <button
              type="button"
              onClick={handleDemoGuestLogin}
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-2xl border text-sm font-extrabold flex items-center justify-between transition-all shadow-md group ${
                isDemoLocked
                  ? 'border-amber-500/30 bg-amber-500/5 text-amber-500/80 hover:bg-amber-500/10'
                  : 'border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/20 text-amber-400 hover:border-amber-400 hover:shadow-amber-500/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs text-[var(--text-primary)]">Explore as Demo Guest</span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {isDemoLocked ? 'Expired' : '1-Time Free'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] font-normal">
                    {isDemoLocked
                      ? 'Trial concluded. Click to view upgrade plans.'
                      : 'Preview core features & tabs with 1 click.'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Master Owner VIP 1-Click Access */}
            <button
              type="button"
              onClick={handleMasterOwnerLogin}
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold text-purple-400 flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Crown className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="font-extrabold text-[var(--text-primary)]">👑 Master Owner VIP Access</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300">Creator Pass</span>
              </div>
              <span className="text-[11px] font-black text-purple-400 group-hover:underline">Instant Unlock →</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              Or Sign In With Account
            </span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl mb-5 bg-red-500/10 border border-red-500/20 text-red-500">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p>{error}</p>
                {isDemoLocked && onOpenPaywall && (
                  <button
                    type="button"
                    onClick={onOpenPaywall}
                    className="mt-2 inline-flex items-center gap-1 font-bold text-amber-400 underline hover:text-amber-300"
                  >
                    View UPI &amp; Subscription Plans →
                  </button>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 p-4 rounded-xl mb-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs">{success}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'org_signup' && (
              <InputRow
                id="company-name" icon={Building} label="Company / Organisation Name"
                type="text" value={companyName} onChange={setCompanyName}
                placeholder="Acme Systems"
              />
            )}

            {authMode !== 'login' && (
              <InputRow
                id="full-name" icon={User} label="Full Name"
                type="text" value={name} onChange={setName}
                placeholder="Alex Mercer"
              />
            )}

            <InputRow
              id="email" icon={Mail} label="Email Address"
              type="email" value={email} onChange={setEmail}
              placeholder="candidate@example.com"
            />

            {/* Password */}
            <div>
              <label htmlFor="pass" className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-[var(--text-secondary)]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-muted)]" />
                <input
                  id="pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors focus:border-[var(--brand)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {authMode !== 'login' && (
                <p className="text-xs mt-1.5 text-[var(--text-muted)]">Minimum 6 characters required.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 mt-2 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                authMode === 'org_signup'
                  ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
                  : authMode === 'student_signup'
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                  : 'bg-[var(--brand)] hover:bg-purple-500 shadow-purple-500/20'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                authMode === 'login' ? 'Sign In' : authMode === 'student_signup' ? 'Start Student Pass (₹199/mo)' : 'Create Organisation Account (₹1,999/mo)'
              )}
            </button>
          </form>

          {/* Quick toggle link */}
          <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
            {authMode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button onClick={() => switchMode('student_signup')} className="text-blue-500 font-bold hover:underline">
                  Sign up as Student
                </button> or{' '}
                <button onClick={() => switchMode('org_signup')} className="text-purple-500 font-bold hover:underline">
                  Organisation
                </button>
              </p>
            ) : (
              <p>
                Already registered?{' '}
                <button onClick={() => switchMode('login')} className="text-[var(--brand)] font-bold hover:underline">
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
