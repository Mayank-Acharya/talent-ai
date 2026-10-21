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
import { Crown, Lock, ArrowRight, LogOut, Clock, GraduationCap, Building2 } from 'lucide-react';

export default function App() {
  // Navigation states
  const [page, setPage] = useState<'landing' | 'login' | 'dashboard' | 'session'>('landing');
  const [sessionToken, setSessionToken] = useState('');

  // Auth states
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Active sidebar tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // Trial tick state (for countdown updates every 30 seconds)
  const [, setTick] = useState(0);

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

  // Periodic trial tick
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const isMasterOwner = user?.isMaster === true || 
    user?.role === 'SUPER_ADMIN' || 
    user?.email === 'mayank074518@gmail.com' || 
    user?.email === 'admin@talentai.com';

  const isStudent = user?.role === 'STUDENT';

  // ── Free Trial Logic: 7 Days for Students, 2 Hours for Organizations ──
  const trialDurationMs = isStudent 
    ? 7 * 24 * 60 * 60 * 1000   // 7 days
    : 2 * 60 * 60 * 1000;        // 2 hours

  const getTrialStartTime = (): number => {
    if (user?.createdAt) {
      const parsed = new Date(user.createdAt).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const key = `talentai_trial_start_${user?.id || user?.email || 'default'}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const val = parseInt(stored, 10);
      if (!isNaN(val) && val > 0) return val;
    }
    const now = Date.now();
    localStorage.setItem(key, String(now));
    return now;
  };

  const trialStartTime = user ? getTrialStartTime() : Date.now();
  const timeElapsed = Date.now() - trialStartTime;
  const timeRemaining = Math.max(0, trialDurationMs - timeElapsed);
  const isTrialExpired = !isMasterOwner && (timeElapsed >= trialDurationMs);

  const formatRemaining = () => {
    if (isStudent) {
      const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      if (days > 0) return `${days}d ${hours}h remaining`;
      const mins = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
      return `${hours}h ${mins}m remaining`;
    } else {
      const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
      const mins = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
      return `${hours}h ${mins}m remaining`;
    }
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };

  const handleAuthSuccess = (newToken: string, newUser: any, newCompany: any) => {
    setToken(newToken);
    setUser(newUser);
    setCompany(newCompany);
    setPage('dashboard');
    const initialTab = newUser?.role === 'STUDENT' ? 'questions' : 'dashboard';
    setActiveTab(initialTab);
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

  const handleCompanyUpdate = (updatedCompany: any) => setCompany(updatedCompany);

  // ── Page router ────────────────────────────────────
  if (page === 'session') return <Session token={sessionToken} />;

  // Unauthenticated users
  if (!token) {
    if (page === 'landing') return <Landing onNavigate={(p) => setPage(p as any)} />;
    return (
      <Login
        onAuthSuccess={handleAuthSuccess}
        onNavigate={(p) => setPage(p as any)}
      />
    );
  }

  if (page === 'landing') return <Landing onNavigate={(p) => setPage(p as any)} />;
  if (page === 'login') {
    return (
      <Login
        onAuthSuccess={handleAuthSuccess}
        onNavigate={(p) => setPage(p as any)}
      />
    );
  }

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden"
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Compact Floating Free Trial Box with Timer (Zero vertical layout intrusion) ── */}
      {!isMasterOwner && !isTrialExpired && (
        <div
          className="fixed top-3 right-6 z-50 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full shadow-xl border border-blue-400/40 backdrop-blur-md transition-all animate-fade-in-up"
          style={{
            background: 'rgba(30, 58, 138, 0.92)',
            color: '#ffffff',
          }}
        >
          <div className="flex items-center gap-1.5 font-bold text-xs text-white">
            <span className="p-1 rounded-full bg-blue-500/30 shrink-0">
              {isStudent ? <GraduationCap className="w-3.5 h-3.5 text-blue-200" /> : <Building2 className="w-3.5 h-3.5 text-blue-200" />}
            </span>
            <span className="text-blue-100">{isStudent ? '7-Day Trial:' : '2-Hr Trial:'}</span>
            <span className="font-extrabold text-amber-300 font-mono tracking-wide ml-0.5">{formatRemaining()}</span>
          </div>
          <button
            onClick={() => setActiveTab('billing')}
            className="px-2.5 py-0.5 rounded-full bg-white text-blue-800 hover:bg-blue-50 font-black text-[10px] tracking-wide shadow-sm transition-all cursor-pointer flex items-center gap-1 shrink-0 ml-1"
          >
            <span>Upgrade</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {/* ── Master Owner Permanent VIP Banner (Mayank Kumar Acharya) ── */}
      {isMasterOwner && (
        <div className="force-white w-full px-4 py-2 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white text-xs font-bold flex items-center justify-between shrink-0 border-b border-purple-500/30 z-50 shadow-sm" style={{ color: '#ffffff' }}>
          <div className="flex items-center gap-2.5" style={{ color: '#ffffff' }}>
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span style={{ color: '#ffffff' }}>
              👑 <strong style={{ color: '#ffffff', fontWeight: 800 }}>Master Owner Lifetime Access:</strong> Unlimited permanent access active for Mayank Kumar Acharya. Zero trial limits apply.
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] uppercase font-black tracking-wider text-purple-200 bg-purple-500/30 px-2.5 py-0.5 rounded-full border border-purple-400/40" style={{ color: '#f3e8ff' }}>
              Founder VIP
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

      {/* ── Trial Expired Redirect Overlay (Locks app & redirects to billing) ── */}
      {isTrialExpired && activeTab !== 'billing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in-up">
          <div className="w-full max-w-md rounded-3xl p-8 bg-[var(--bg-card)] border border-red-500/40 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 inline-block mb-2">
                {isStudent ? '7-Day Free Trial Expired' : '2-Hour Free Trial Expired'}
              </span>
              <h2 className="text-2xl font-black text-[var(--text-primary)]">
                Upgrade to Keep Access
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                {isStudent
                  ? 'Your 7-day student trial has concluded. Activate your Student Pass for ₹199/month to continue unlimited practice, arena duels, and ATS resume scans.'
                  : 'Your 2-hour organization trial has concluded. Upgrade to the Recruiter Suite for ₹1,999/month for full candidate pipeline & AI proctoring.'}
              </p>
            </div>

            <button
              onClick={() => setActiveTab('billing')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-xs shadow-lg shadow-indigo-600/30 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Unlock Access via Instant UPI Scanner (₹{isStudent ? 199 : 1999})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="text-xs text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
