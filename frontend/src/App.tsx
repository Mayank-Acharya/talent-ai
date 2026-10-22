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
import { Crown, Lock, ArrowRight, LogOut, Clock, GraduationCap, Building2, Award } from 'lucide-react';

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

  // Single Unified Dynamic Student Points & Tier
  const [studentPoints, setStudentPoints] = useState<number>(0);
  const [studentTier, setStudentTier] = useState<string>('BRONZE');

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

  // ── Unified Dynamic Points Synchronization ──
  useEffect(() => {
    if (!token || !isStudent) return;
    const fetchPoints = async () => {
      try {
        const res = await fetch('/api/student/points-summary', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStudentPoints(data.points ?? 0);
          setStudentTier(data.tier ?? 'BRONZE');
        }
      } catch (e) {
        // silently fallback
      }
    };
    fetchPoints();

    const handleUpdate = (e: any) => {
      if (e.detail?.points !== undefined) {
        setStudentPoints(e.detail.points);
        if (e.detail?.tier) setStudentTier(e.detail.tier);
      } else {
        fetchPoints();
      }
    };

    window.addEventListener('talentai_points_updated', handleUpdate);
    return () => window.removeEventListener('talentai_points_updated', handleUpdate);
  }, [token, isStudent]);

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

  const isPaid = user?.isPaid === true || 
    company?.plan === 'STUDENT' || 
    company?.plan === 'ORGANISATION' || 
    company?.plan === 'GROWTH' || 
    company?.plan === 'ENTERPRISE' || 
    company?.plan === 'PRO' ||
    localStorage.getItem(`talentai_paid_${user?.id || user?.email || 'default'}`) === 'true';

  const trialStartTime = user ? getTrialStartTime() : Date.now();
  const timeElapsed = Date.now() - trialStartTime;
  const timeRemaining = Math.max(0, trialDurationMs - timeElapsed);
  const isTrialExpired = !isMasterOwner && !isPaid && (timeElapsed >= trialDurationMs);

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
          isPaid={isPaid}
          isMasterOwner={isMasterOwner}
          trialRemainingText={formatRemaining()}
          onUpgradeClick={() => setActiveTab('billing')}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto relative">
          {/* Top-Right Unified Dynamic Points Counter */}
          {isStudent && (
            <div
              onClick={() => setActiveTab('arena')}
              className="fixed top-3.5 right-6 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-card)]/90 backdrop-blur-md border border-amber-500/40 text-amber-400 font-bold text-xs shadow-lg shadow-amber-500/10 transition-all hover:scale-105 hover:border-amber-400 cursor-pointer select-none"
              title="Click to view 1v1 Arena & Global Leaderboard"
            >
              <Award className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-mono text-sm tracking-tight text-amber-300 font-black">{studentPoints} pts</span>
              <span className="text-[10px] text-amber-400/80 font-black uppercase tracking-wider pl-1.5 border-l border-amber-500/30">
                {studentTier}
              </span>
            </div>
          )}

          {activeTab === 'dashboard'     && <Dashboard token={token} onTabChange={handleTabChange} />}
          {activeTab === 'interviews'    && (!isStudent ? <Interviews token={token} /> : <QuestionBank token={token} />)}
          {activeTab === 'questions'     && <QuestionBank token={token} />}
          {activeTab === 'tracker'       && <SolvedTracker token={token} />}
          {activeTab === 'arena'         && <Arena token={token} />}
          {activeTab === 'candidates'    && <Candidates token={token} user={user} />}
          {activeTab === 'resume-parser' && <ResumeParser token={token} />}
          {activeTab === 'billing'       && (
            <Billing 
              token={token} 
              company={company} 
              onCompanyUpdate={handleCompanyUpdate} 
              user={user} 
            />
          )}
          {activeTab === 'settings'      && (
            <Settings 
              token={token} 
              company={company} 
              onCompanyUpdate={handleCompanyUpdate} 
              user={user} 
              onUserUpdate={(updatedUser) => {
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
              }}
            />
          )}
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
