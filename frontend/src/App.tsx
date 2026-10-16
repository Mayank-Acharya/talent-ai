import React, { useState, useEffect } from 'react';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Interviews from './pages/Interviews';
import QuestionBank from './pages/QuestionBank';
import Candidates from './pages/Candidates';
import ResumeParser from './pages/ResumeParser';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import Session from './pages/Session';
import Arena from './pages/Arena';
import SolvedTracker from './pages/SolvedTracker';
import TrialPaywall from './components/TrialPaywall';
import { Sparkles, Crown, Lock, ArrowRight, LogOut } from 'lucide-react';

const CORE_TABS = ['questions', 'tracker', 'arena', 'resume-parser'];

export default function App() {
  // Navigation states
  const [page, setPage] = useState<'landing' | 'login' | 'dashboard' | 'session' | 'paywall'>('landing');
  const [sessionToken, setSessionToken] = useState('');

  // Auth states
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Active sidebar tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // Demo guest tracking
  const [demoVisitedTabs, setDemoVisitedTabs] = useState<string[]>([]);
  const [demoLockoutWarning, setDemoLockoutWarning] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState(4);

  // ── Dark / Light mode ─────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Load Auth data on mount
  useEffect(() => {
    const storedUser    = localStorage.getItem('user');
    const storedCompany = localStorage.getItem('company');
    if (storedUser)    setUser(JSON.parse(storedUser));
    if (storedCompany) setCompany(JSON.parse(storedCompany));

    const path = window.location.pathname;
    if (path.startsWith('/session/')) {
      const tok = path.split('/')[2];
      if (tok) { setSessionToken(tok); setPage('session'); }
    } else if (token) {
      setPage('dashboard');
    }
  }, [token]);

  const isMasterOwner = user?.isMaster === true || user?.role === 'SUPER_ADMIN' || user?.email === 'admin@talentai.com';
  const isDemoGuest = !isMasterOwner && (user?.isDemoGuest === true || user?.email === 'demo.guest@talentai.com');

  // Initialize or track visited tabs when user navigates
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);

    if (isDemoGuest && !isMasterOwner) {
      setDemoVisitedTabs(prev => {
        const nextSet = prev.includes(newTab) ? prev : [...prev, newTab];
        
        // Count how many core tabs have been explored
        const coreExplored = CORE_TABS.filter(t => nextSet.includes(t));
        
        if (coreExplored.length >= CORE_TABS.length && !demoLockoutWarning) {
          // Trigger automatic logout sequence
          setDemoLockoutWarning(true);
        }
        return nextSet;
      });
    }
  };

  // Automatic Lockout countdown timer
  useEffect(() => {
    if (!demoLockoutWarning) return;

    if (lockoutCountdown > 0) {
      const timer = setTimeout(() => {
        setLockoutCountdown(c => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Execute 1-time demo logout and lock
      localStorage.setItem('talentai_demo_locked', 'true');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('company');
      setToken('');
      setUser(null);
      setCompany(null);
      setDemoLockoutWarning(false);
      setDemoVisitedTabs([]);
      setPage('paywall');
    }
  }, [demoLockoutWarning, lockoutCountdown]);

  const handleAuthSuccess = (newToken: string, newUser: any, newCompany: any) => {
    setToken(newToken);
    setUser(newUser);
    setCompany(newCompany);
    setPage('dashboard');
    const initialTab = newUser?.role === 'STUDENT' ? 'questions' : 'dashboard';
    setActiveTab(initialTab);

    if (newUser?.isDemoGuest) {
      setDemoVisitedTabs([initialTab]);
    } else {
      setDemoVisitedTabs([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    setToken('');
    setUser(null);
    setCompany(null);
    setPage('landing');
  };

  // Instant Owner VIP Login Bypass
  const handleMasterBypass = async () => {
    try {
      const res = await fetch('/api/auth/master-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Master login failed');

      localStorage.removeItem('talentai_demo_locked');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.company) localStorage.setItem('company', JSON.stringify(data.company));

      handleAuthSuccess(data.token, data.user, data.company);
    } catch (e) {
      console.error(e);
      window.location.reload();
    }
  };

  const handleCompanyUpdate = (updatedCompany: any) => setCompany(updatedCompany);

  // ── Page router ────────────────────────────────────
  if (page === 'session') return <Session token={sessionToken} />;

  // Paywall screen
  if (page === 'paywall') {
    return (
      <TrialPaywall
        onUnlockAsMaster={handleMasterBypass}
        onPaymentSuccess={() => {
          setPage('login');
        }}
        onNavigateLanding={() => setPage('landing')}
      />
    );
  }

  // Unauthenticated users
  if (!token) {
    if (page === 'landing') return <Landing onNavigate={(p) => setPage(p as any)} />;
    return (
      <Login
        onAuthSuccess={handleAuthSuccess}
        onNavigate={(p) => setPage(p as any)}
        onOpenPaywall={() => setPage('paywall')}
      />
    );
  }

  if (page === 'landing') return <Landing onNavigate={(p) => setPage(p as any)} />;
  if (page === 'login') {
    return (
      <Login
        onAuthSuccess={handleAuthSuccess}
        onNavigate={(p) => setPage(p as any)}
        onOpenPaywall={() => setPage('paywall')}
      />
    );
  }

  const exploredCoreCount = CORE_TABS.filter(t => demoVisitedTabs.includes(t)).length;

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Demo Guest Sticky Trial Banner ── */}
      {isDemoGuest && (
        <div className="force-white w-full px-4 py-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-xs font-bold flex items-center justify-between shrink-0 shadow-lg z-50" style={{ color: '#ffffff' }}>
          <div className="flex items-center gap-2" style={{ color: '#ffffff' }}>
            <span className="p-1 rounded-full bg-white/20">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </span>
            <span style={{ color: '#ffffff' }}>
              <strong style={{ color: '#ffffff' }}>⚡ 1-Time Demo Guest Pass:</strong> {exploredCoreCount} of {CORE_TABS.length} core features viewed. Once all 4 are explored, session automatically locks.
            </span>
          </div>
          <button
            onClick={() => setPage('paywall')}
            className="px-3 py-1 rounded-full bg-white text-orange-700 hover:bg-orange-50 font-black text-[11px] shadow-sm flex items-center gap-1 transition-all"
            style={{ color: '#c2410c' }}
          >
            <span>Upgrade to Full Pass (₹199)</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Master Owner Permanent VIP Banner ── */}
      {isMasterOwner && (
        <div className="force-white w-full px-4 py-2 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white text-xs font-bold flex items-center justify-between shrink-0 border-b border-purple-500/30 z-50 shadow-sm" style={{ color: '#ffffff' }}>
          <div className="flex items-center gap-2.5" style={{ color: '#ffffff' }}>
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span style={{ color: '#ffffff' }}>
              👑 <strong style={{ color: '#ffffff', fontWeight: 800 }}>Master Owner Lifetime Access:</strong> Unlimited permanent access active. Zero trial limits or billing charges apply to you.
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] uppercase font-black tracking-wider text-purple-200 bg-purple-500/30 px-2.5 py-0.5 rounded-full border border-purple-400/40" style={{ color: '#f3e8ff' }}>
              Creator VIP
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded-lg bg-red-600/90 hover:bg-red-500 text-white font-extrabold text-[11px] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ml-1"
              title="Sign out of TalentAI"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Main App Layout ── */}
      <div className="flex flex-1 min-h-0 w-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          user={user}
          company={company}
          onLogout={handleLogout}
          isDark={isDark}
          onToggleDark={() => setIsDark(d => !d)}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto relative">
          {activeTab === 'dashboard'     && <Dashboard token={token} onTabChange={handleTabChange} />}
          {activeTab === 'interviews'    && <Interviews token={token} />}
          {activeTab === 'questions'     && <QuestionBank token={token} />}
          {activeTab === 'tracker'       && <SolvedTracker token={token} />}
          {activeTab === 'arena'         && <Arena token={token} />}
          {activeTab === 'candidates'    && <Candidates token={token} user={user} />}
          {activeTab === 'resume-parser' && <ResumeParser token={token} />}
          {activeTab === 'billing'       && <Billing token={token} company={company} onCompanyUpdate={handleCompanyUpdate} user={user} />}
          {activeTab === 'settings'      && <Settings token={token} company={company} onCompanyUpdate={handleCompanyUpdate} />}
        </main>
      </div>

      {/* ── Automatic Demo Lockout Overlay ── */}
      {demoLockoutWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
          <div className="w-full max-w-md rounded-3xl p-8 bg-[var(--bg-card)] border border-amber-500 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-block mb-2">
                1-Time Demo Exploration Completed
              </span>
              <h2 className="text-2xl font-black text-[var(--text-primary)]">
                You've Explored All Core Features!
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                You experienced our Practice Bank, 1v1 Arena, Solved &amp; Streak Calendar, and ATS Resume Parser. Your 1-time free trial has now ended.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-amber-400 font-bold">
              Automatically locking demo session in <span className="text-lg font-black text-amber-300">{lockoutCountdown}</span> seconds...
            </div>

            <button
              onClick={() => {
                localStorage.setItem('talentai_demo_locked', 'true');
                handleLogout();
                setPage('paywall');
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-xs shadow-lg shadow-orange-600/30 hover:brightness-110 transition-all"
            >
              Unlock Unlimited Access via Instant UPI (₹199) →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
