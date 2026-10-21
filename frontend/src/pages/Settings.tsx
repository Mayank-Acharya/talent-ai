import React, { useState, useEffect } from 'react';
import {
  User, Building, Building2, Palette, ShieldAlert, Save, CheckCircle2,
  FileText, Globe, Lock, Bell, Monitor, Zap, GraduationCap, Briefcase,
  ExternalLink, Code2, Sparkles, Key, Mail, Phone, MapPin, Award,
  Check, RefreshCw, Sliders, Eye, EyeOff, AlertCircle, ShieldCheck,
  Clock, ArrowRight, Target
} from 'lucide-react';

interface SettingsProps {
  token: string;
  company: any;
  onCompanyUpdate: (updatedCompany: any) => void;
  user?: any;
  onUserUpdate?: (updatedUser: any) => void;
}

const ACCENT_COLORS = [
  { name: 'Violet',   value: '#7c3aed' },
  { name: 'Indigo',   value: '#4f46e5' },
  { name: 'Blue',     value: '#2563eb' },
  { name: 'Cyan',     value: '#0891b2' },
  { name: 'Emerald',  value: '#059669' },
  { name: 'Rose',     value: '#e11d48' },
  { name: 'Orange',   value: '#ea580c' },
  { name: 'Amber',    value: '#d97706' },
];

/* ── Brand Logos for Developer & Social Platforms ── */
function LinkedInIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
    </svg>
  );
}

function GitHubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

function LeetCodeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.102 17.93l-2.697 2.607c-.466.467-1.111.662-1.823.662s-1.357-.195-1.824-.662l-4.332-4.363c-.467-.467-.702-1.15-.702-1.863s.235-1.357.702-1.824l4.319-4.38c.467-.467 1.125-.645 1.837-.645s1.357.195 1.823.662l2.697 2.606c.514.515 1.365.497 1.9-.038.535-.536.553-1.387.039-1.901l-2.609-2.636a5.215 5.215 0 0 0-3.85-1.428c-1.439 0-2.834.567-3.85 1.583L3.418 10.45c-1.016 1.016-1.583 2.411-1.583 3.85s.567 2.834 1.583 3.85l4.332 4.363c1.016 1.016 2.411 1.583 3.85 1.583s2.834-.567 3.85-1.583l2.609-2.636c.514-.514.496-1.365-.039-1.901-.535-.535-1.386-.553-1.9-.038z"/>
      <path d="M10.811 13.086h8.437c.746 0 1.352-.605 1.352-1.352s-.606-1.352-1.352-1.352h-8.437c-.746 0-1.352.605-1.352 1.352s.606 1.352 1.352 1.352z"/>
    </svg>
  );
}

function CodeforcesIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.5 7.5a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-3 0V9a1.5 1.5 0 0 1 1.5-1.5zm7.5-4a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-3 0V5A1.5 1.5 0 0 1 12 3.5zm7.5 7a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-3 0v-6a1.5 1.5 0 0 1 1.5-1.5z"/>
    </svg>
  );
}

function TwitterIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

export default function Settings({ token, company, onCompanyUpdate, user, onUserUpdate }: SettingsProps) {
  const isStudent = user?.role === 'STUDENT';
  const storageKey = `talentai_profile_${user?.id || user?.email || 'user'}`;

  // Read saved cached profile from localStorage
  const savedProfile = (() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();

  // ── Form State ──
  // Profile (Student & Recruiter common/specific)
  const [name, setName] = useState(savedProfile.name || user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(savedProfile.phone || '');
  const [location, setLocation] = useState(savedProfile.location || (isStudent ? 'Bengaluru, India' : ''));
  const [bio, setBio] = useState(savedProfile.bio || (isStudent 
    ? 'Passionate engineer enthusiastic about full-stack development, modern distributed architecture, and algorithm optimization.' 
    : ''));

  // Student Specific
  const [college, setCollege] = useState(savedProfile.college || (isStudent ? 'Delhi Technological University' : ''));
  const [degree, setDegree] = useState(savedProfile.degree || (isStudent ? 'B.Tech - Computer Science & Engineering' : ''));
  const [graduationYear, setGraduationYear] = useState(savedProfile.graduationYear || '2025');
  const [targetRole, setTargetRole] = useState(savedProfile.targetRole || (isStudent ? 'Software Engineer (SDE-1)' : ''));

  // Org Specific
  const [companyName, setCompanyName] = useState(company?.name || savedProfile.companyName || 'My Organization');
  const [industry, setIndustry] = useState(savedProfile.industry || 'Technology & SaaS');
  const [companySize, setCompanySize] = useState(savedProfile.companySize || '11-50 employees');
  const [websiteUrl, setWebsiteUrl] = useState(savedProfile.websiteUrl || '');
  const [primaryColor, setPrimaryColor] = useState(company?.primaryColor || '#7c3aed');
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl || '');
  const [emailSignature, setEmailSignature] = useState(savedProfile.emailSignature || `Best regards,\nThe Hiring Team at ${company?.name || 'our company'}`);
  const [proctoringStrictness, setProctoringStrictness] = useState<'STRICT' | 'BALANCED' | 'RELAXED'>(savedProfile.proctoringStrictness || 'STRICT');
  const [sessionExpiryHours, setSessionExpiryHours] = useState(savedProfile.sessionExpiryHours || '48');

  // Social & Developer Accounts
  const [linkedinUrl, setLinkedinUrl] = useState(savedProfile.linkedinUrl || '');
  const [githubUrl, setGithubUrl] = useState(savedProfile.githubUrl || '');
  const [leetcodeUrl, setLeetcodeUrl] = useState(savedProfile.leetcodeUrl || '');
  const [codeforcesUrl, setCodeforcesUrl] = useState(savedProfile.codeforcesUrl || '');
  const [portfolioUrl, setPortfolioUrl] = useState(savedProfile.portfolioUrl || '');
  const [twitterUrl, setTwitterUrl] = useState(savedProfile.twitterUrl || '');

  // Preferences (Coding & Notifications)
  const [preferredLanguage, setPreferredLanguage] = useState(savedProfile.preferredLanguage || 'C++');
  const [dailyGoal, setDailyGoal] = useState(savedProfile.dailyGoal || '2');
  const [soundEffects, setSoundEffects] = useState(savedProfile.soundEffects !== undefined ? savedProfile.soundEffects : true);
  const [autoFormat, setAutoFormat] = useState(savedProfile.autoFormat !== undefined ? savedProfile.autoFormat : true);
  const [notifySubmission, setNotifySubmission] = useState(savedProfile.notifySubmission !== undefined ? savedProfile.notifySubmission : true);
  const [notifyCheating, setNotifyCheating] = useState(savedProfile.notifyCheating !== undefined ? savedProfile.notifyCheating : true);
  const [notifyAiScored, setNotifyAiScored] = useState(savedProfile.notifyAiScored !== undefined ? savedProfile.notifyAiScored : true);
  const [weeklyDigest, setWeeklyDigest] = useState(savedProfile.weeklyDigest !== undefined ? savedProfile.weeklyDigest : false);

  // Password Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<string>(isStudent ? 'profile' : 'company');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Define tabs depending on role
  const tabs = isStudent ? [
    { id: 'profile',     label: 'Personal Profile',      icon: User },
    { id: 'social',      label: 'Dev & Social Accounts',  icon: Globe },
    { id: 'preferences', label: 'Coding Preferences',    icon: Sliders },
    { id: 'security',    label: 'Account & Security',     icon: Lock },
  ] : [
    { id: 'company',       label: 'Organization Profile',  icon: Building },
    { id: 'social',        label: 'Social & Public Links', icon: Globe },
    { id: 'branding',      label: 'Brand Identity',        icon: Palette },
    { id: 'proctoring',    label: 'Anti-Cheat & Security', icon: ShieldCheck },
    { id: 'notifications', label: 'Notification Alerts',   icon: Bell },
    { id: 'security',      label: 'Admin Password',        icon: Lock },
  ];

  // Helper to open link in safe new window
  const handleTestLink = (url: string) => {
    if (!url.trim()) return;
    let target = url.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  // Count connected developer/social accounts
  const connectedSocialCount = [linkedinUrl, githubUrl, leetcodeUrl, codeforcesUrl, portfolioUrl, twitterUrl].filter(Boolean).length;

  // ── Save All Settings ──
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      // 1. Compile full profile payload
      const profileData = {
        name,
        phone,
        location,
        bio,
        college,
        degree,
        graduationYear,
        targetRole,
        companyName,
        industry,
        companySize,
        websiteUrl,
        emailSignature,
        proctoringStrictness,
        sessionExpiryHours,
        linkedinUrl,
        githubUrl,
        leetcodeUrl,
        codeforcesUrl,
        portfolioUrl,
        twitterUrl,
        preferredLanguage,
        dailyGoal,
        soundEffects,
        autoFormat,
        notifySubmission,
        notifyCheating,
        notifyAiScored,
        weeklyDigest,
        updatedAt: new Date().toISOString(),
      };

      // 2. Persist to localStorage
      localStorage.setItem(storageKey, JSON.stringify(profileData));

      // 3. Update User in DB via /api/auth/me
      const authRes = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const authData = await authRes.json();
      if (authRes.ok && authData.user) {
        onUserUpdate?.({ ...authData.user, ...profileData });
      }

      // 4. If organization, update company branding in DB via /api/companies/me
      if (!isStudent && company) {
        const compRes = await fetch('/api/companies/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: companyName,
            primaryColor,
            logoUrl,
          }),
        });
        const compData = await compRes.json();
        if (compRes.ok && compData.company) {
          localStorage.setItem('company', JSON.stringify(compData.company));
          onCompanyUpdate(compData.company);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Password Change Handler ──
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      setPasswordLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPasswordSuccess('Password successfully updated! Keep your new password secure.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Error updating password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 w-full overflow-y-auto max-w-7xl mx-auto" style={{ minHeight: '100%' }}>
      {/* ── Top Header & Role Badge ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight">
              {isStudent ? 'Student Profile & Settings' : 'Organization Workspace & Settings'}
            </h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider"
              style={{
                background: isStudent ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)',
                color: isStudent ? '#60a5fa' : '#c084fc',
                border: `1px solid ${isStudent ? 'rgba(59,130,246,0.3)' : 'rgba(168,85,247,0.3)'}`,
              }}
            >
              {isStudent ? '🎓 Student / Candidate' : '🏢 Company Admin'}
            </span>
          </div>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">
            {isStudent
              ? 'Manage your personal details, developer accounts (GitHub, LinkedIn, LeetCode), and coding preferences'
              : 'Configure company branding, recruiter identity, anti-cheat proctoring rules, and developer links'}
          </p>
        </div>

        {/* Global Save Button in Header */}
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved Successfully!</span>
            </div>
          )}
          <button
            onClick={handleSaveProfile}
            disabled={saveLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {saveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saveLoading ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center gap-3 text-red-400 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* ── Main Layout: Tabs on left, Content on right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar Tabs */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{tab.label}</span>
                  {tab.id === 'social' && connectedSocialCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/20 text-indigo-300">
                      {connectedSocialCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick User Identity Card */}
          <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                {(name || email || 'U').substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{name || 'Your Name'}</p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">{email}</p>
              </div>
            </div>
            
            <div className="pt-2 border-t border-[var(--border-color)] text-[11px] space-y-1.5 text-[var(--text-secondary)]">
              <div className="flex justify-between items-center">
                <span>Account Type:</span>
                <span className="font-bold text-[var(--text-primary)]">{isStudent ? 'Candidate / Student' : 'Company Admin'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Dev Accounts:</span>
                <span className="font-bold text-emerald-400">{connectedSocialCount} Connected</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Member Since:</span>
                <span className="font-mono text-[10px]">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="lg:col-span-3 space-y-6">

          {/* ─────────────────────────────────────────────────────────────
              TAB 1 (STUDENT): PERSONAL PROFILE
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'profile' && isStudent && (
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Personal & Academic Details</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Your student credentials displayed across mock interviews and ATS resume evaluations</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. Mayank Kumar Acharya"
                      />
                    </div>
                  </div>

                  {/* Email (Verified / Read-only) */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Email Address (Verified)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="email"
                        readOnly
                        value={email}
                        className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-black/40 border border-[var(--border-color)] text-xs text-[var(--text-secondary)] cursor-not-allowed opacity-80"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Verified
                      </span>
                    </div>
                  </div>

                  {/* Phone / WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Phone / WhatsApp Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  {/* Current Location */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Current Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. Bengaluru, Karnataka, India"
                      />
                    </div>
                  </div>

                  {/* College / University */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      College / University Name
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={college}
                        onChange={e => setCollege(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. IIT Delhi, BITS Pilani, etc."
                      />
                    </div>
                  </div>

                  {/* Degree & Major */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Degree & Major
                    </label>
                    <div className="relative">
                      <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={degree}
                        onChange={e => setDegree(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. B.Tech Computer Science & Engineering"
                      />
                    </div>
                  </div>

                  {/* Graduation Year */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Graduation / Passing Year
                    </label>
                    <select
                      value={graduationYear}
                      onChange={e => setGraduationYear(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                    >
                      <option value="2023">2023 (Graduated)</option>
                      <option value="2024">2024 (Graduated)</option>
                      <option value="2025">2025 (Final Year)</option>
                      <option value="2026">2026 (Pre-Final Year)</option>
                      <option value="2027">2027 (Sophomore)</option>
                      <option value="2028">2028 (Freshman)</option>
                    </select>
                  </div>

                  {/* Target Role */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Target Job Role / Title
                    </label>
                    <div className="relative">
                      <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={targetRole}
                        onChange={e => setTargetRole(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. Software Engineer (SDE-1), Full Stack Developer"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Bio / Headline */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Professional Headline & Bio
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full p-4 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="Brief description of your key skills, technical stack, and coding achievements..."
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Profile</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 1 (ORG): ORGANIZATION PROFILE & ADMIN
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'company' && !isStudent && (
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Company & Recruiter Details</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Manage your hiring organization profile and recruiter contact info</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Company Name */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Company Name *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. Acme Technologies"
                      />
                    </div>
                  </div>

                  {/* Primary Admin Name */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Primary Admin / Recruiter Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. Alex Johnson"
                      />
                    </div>
                  </div>

                  {/* Work Email */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="email"
                        readOnly
                        value={email}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-[var(--border-color)] text-xs text-[var(--text-secondary)] cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>

                  {/* Official Website */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Official Company Website
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={e => setWebsiteUrl(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                        placeholder="https://company.com"
                      />
                    </div>
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Primary Industry
                    </label>
                    <select
                      value={industry}
                      onChange={e => setIndustry(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Technology & SaaS">Technology & SaaS</option>
                      <option value="Fintech & Banking">Fintech & Banking</option>
                      <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                      <option value="Healthcare & BioTech">Healthcare & BioTech</option>
                      <option value="Consulting & IT Services">Consulting & IT Services</option>
                      <option value="Artificial Intelligence">Artificial Intelligence & ML</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Company Size */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Company Headcount
                    </label>
                    <select
                      value={companySize}
                      onChange={e => setCompanySize(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                    >
                      <option value="1-10 employees">1 - 10 employees (Seed stage)</option>
                      <option value="11-50 employees">11 - 50 employees (Early stage)</option>
                      <option value="51-200 employees">51 - 200 employees (Growth)</option>
                      <option value="201-1,000 employees">201 - 1,000 employees (Mid-Market)</option>
                      <option value="1,000+ employees">1,000+ employees (Enterprise)</option>
                    </select>
                  </div>
                </div>

                {/* Company Bio */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Company Overview & Mission
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full p-4 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 resize-none"
                    placeholder="Short description of your engineering culture, tech stack, and what makes your company exciting..."
                  />
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Company Profile</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 2: DEVELOPER & SOCIAL ACCOUNTS (STUDENT & ORG)
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'social' && (
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {isStudent ? 'Developer & Social Profiles' : 'Company Social & Public Handles'}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {isStudent
                        ? 'Connect your GitHub, LinkedIn, LeetCode and Portfolio for recruiters and automated ATS evaluations'
                        : 'Connect official LinkedIn company page, GitHub organization, and public job portal'}
                    </p>
                  </div>
                </div>

                <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{connectedSocialCount} / {isStudent ? 6 : 4} Linked</span>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* 1. LinkedIn */}
                <div className="p-4 rounded-xl bg-black/20 border border-[var(--border-color)] hover:border-blue-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-[#0077b5]/20 text-[#0077b5]">
                        <LinkedInIcon className="w-4 h-4" />
                      </span>
                      <span>{isStudent ? 'LinkedIn Profile URL' : 'LinkedIn Company Page'}</span>
                    </label>
                    {linkedinUrl && (
                      <button
                        type="button"
                        onClick={() => handleTestLink(linkedinUrl)}
                        className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={e => setLinkedinUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                    placeholder={isStudent ? 'https://linkedin.com/in/username' : 'https://linkedin.com/company/yourcompany'}
                  />
                </div>

                {/* 2. GitHub */}
                <div className="p-4 rounded-xl bg-black/20 border border-[var(--border-color)] hover:border-slate-400/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-white/10 text-white">
                        <GitHubIcon className="w-4 h-4" />
                      </span>
                      <span>{isStudent ? 'GitHub Profile URL' : 'GitHub Organization / Repos'}</span>
                    </label>
                    {githubUrl && (
                      <button
                        type="button"
                        onClick={() => handleTestLink(githubUrl)}
                        className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-slate-400"
                    placeholder={isStudent ? 'https://github.com/username' : 'https://github.com/your-org'}
                  />
                </div>

                {/* 3. LeetCode (Student) or Career Page (Org) */}
                {isStudent ? (
                  <div className="p-4 rounded-xl bg-black/20 border border-[var(--border-color)] hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-amber-500/20 text-[#FFA116]">
                          <LeetCodeIcon className="w-4 h-4" />
                        </span>
                        <span>LeetCode Profile Handle or URL</span>
                      </label>
                      {leetcodeUrl && (
                        <button
                          type="button"
                          onClick={() => handleTestLink(leetcodeUrl.startsWith('http') ? leetcodeUrl : `https://leetcode.com/u/${leetcodeUrl}`)}
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={leetcodeUrl}
                      onChange={e => setLeetcodeUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-black/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                      placeholder="https://leetcode.com/u/your_username or just username"
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-black/20 border border-[var(--border-color)] hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <Briefcase className="w-4 h-4" />
                        </span>
                        <span>Careers / Job Openings Page</span>
                      </label>
                      {websiteUrl && (
                        <button
                          type="button"
                          onClick={() => handleTestLink(websiteUrl)}
                          className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={e => setWebsiteUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-black/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                      placeholder="https://company.com/careers"
                    />
                  </div>
                )}

                {/* 4. Codeforces / CodeChef (Student) */}
                {isStudent && (
                  <div className="p-4 rounded-xl bg-black/20 border border-[var(--border-color)] hover:border-sky-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                          <CodeforcesIcon className="w-4 h-4" />
                        </span>
                        <span>Codeforces / Competitive Programming Profile</span>
                      </label>
                      {codeforcesUrl && (
                        <button
                          type="button"
                          onClick={() => handleTestLink(codeforcesUrl.startsWith('http') ? codeforcesUrl : `https://codeforces.com/profile/${codeforcesUrl}`)}
                          className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={codeforcesUrl}
                      onChange={e => setCodeforcesUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-black/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                      placeholder="https://codeforces.com/profile/handle or handle"
                    />
                  </div>
                )}

                {/* 5. Personal Portfolio / Website */}
                <div className="p-4 rounded-xl bg-black/20 border border-[var(--border-color)] hover:border-purple-500/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                        <Globe className="w-4 h-4" />
                      </span>
                      <span>{isStudent ? 'Portfolio / Personal Website' : 'Company Engineering Blog / Tech Site'}</span>
                    </label>
                    {portfolioUrl && (
                      <button
                        type="button"
                        onClick={() => handleTestLink(portfolioUrl)}
                        className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={e => setPortfolioUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-purple-500"
                    placeholder="https://myportfolio.dev"
                  />
                </div>

                {/* 6. Twitter / X */}
                <div className="p-4 rounded-xl bg-black/20 border border-[var(--border-color)] hover:border-zinc-400/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-white/10 text-white">
                        <TwitterIcon className="w-4 h-4" />
                      </span>
                      <span>Twitter / X Profile</span>
                    </label>
                    {twitterUrl && (
                      <button
                        type="button"
                        onClick={() => handleTestLink(twitterUrl.startsWith('http') ? twitterUrl : `https://x.com/${twitterUrl.replace('@', '')}`)}
                        className="text-[11px] font-bold text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={twitterUrl}
                    onChange={e => setTwitterUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black/30 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-zinc-400"
                    placeholder="https://x.com/your_handle or @your_handle"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Developer Links</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3 (STUDENT): CODING PREFERENCES
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'preferences' && isStudent && (
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Practice & IDE Preferences</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Customize your default coding environment for DSA Arena and Practice sessions</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Default Language */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Default Coding Language
                  </label>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">Pre-selects your starter code and compiler when launching any DSA duel or practice question.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['C++', 'Python 3', 'Java', 'JavaScript', 'TypeScript', 'Go'].map(lang => (
                      <button
                        type="button"
                        key={lang}
                        onClick={() => setPreferredLanguage(lang)}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          preferredLanguage === lang
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                            : 'bg-black/20 border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily Goal */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Daily LeetCode / DSA Practice Target
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { val: '1', label: '1 Problem / Day', desc: 'Relaxed' },
                      { val: '2', label: '2 Problems / Day', desc: 'Recommended' },
                      { val: '3', label: '3 Problems / Day', desc: 'Active' },
                      { val: '5', label: '5 Problems / Day', desc: 'Hardcore' },
                    ].map(item => (
                      <button
                        type="button"
                        key={item.val}
                        onClick={() => setDailyGoal(item.val)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          dailyGoal === item.val
                            ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300'
                            : 'bg-black/20 border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white'
                        }`}
                      >
                        <p className="text-xs font-bold">{item.label}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editor Toggles */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-[var(--border-color)]">
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">Audio Effects on Test Case Success</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Play celebratory chimes when you pass 100% test cases in the Arena</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundEffects}
                      onChange={e => setSoundEffects(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-[var(--border-color)]">
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">Auto-Format Code On Run</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Automatically indents and cleans syntax using Prettier / Clang formatter before compilation</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoFormat}
                      onChange={e => setAutoFormat(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Preferences</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 3 (ORG): BRAND IDENTITY
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'branding' && !isStudent && (
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Company Brand Identity</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Customize the logo, accent colors, and candidate invitation theme</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Logo URL */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Company Logo URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={e => setLogoUrl(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      placeholder="https://yourcompany.com/logo.png"
                    />
                  </div>
                  {logoUrl && (
                    <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-[var(--border-color)]">
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="w-10 h-10 rounded-lg object-contain bg-white/5 p-1"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">Logo Preview</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Shown on candidate interview headers</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    Brand Accent Color
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {ACCENT_COLORS.map(col => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setPrimaryColor(col.value)}
                        className="relative h-10 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                        style={{
                          background: col.value,
                          border: primaryColor === col.value ? '2px solid white' : '2px solid transparent',
                          transform: primaryColor === col.value ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: primaryColor === col.value ? `0 0 16px -2px ${col.value}` : 'none',
                        }}
                      >
                        {primaryColor === col.value && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-[var(--border-color)]">
                    <div className="w-7 h-7 rounded-lg shadow-sm" style={{ background: primaryColor }} />
                    <p className="text-xs font-mono font-bold text-[var(--text-primary)]">{primaryColor}</p>
                    <div className="ml-auto">
                      <div className="px-3 py-1 rounded-lg text-xs font-bold text-white shadow-sm" style={{ background: primaryColor }}>
                        Candidate Theme Active
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invite Email Signature */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Custom Email Invitation Signature
                  </label>
                  <textarea
                    rows={3}
                    value={emailSignature}
                    onChange={e => setEmailSignature(e.target.value)}
                    className="w-full p-4 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 resize-none font-sans"
                    placeholder="Best regards,\nThe Technical Hiring Team"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Brand Identity</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 4 (ORG): PROCTORING & ANTI-CHEAT
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'proctoring' && !isStudent && (
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Anti-Cheat & Proctoring Rules</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Strictness controls for tab switching, fullscreen enforcement, and plagiarism audit logging</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    Proctoring Strictness Level
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        id: 'STRICT',
                        title: 'Strict Mode (Recommended)',
                        desc: 'Immediately flags tab-switching, disables clipboard paste >15 chars, forces fullscreen mode.',
                        badge: 'Enterprise Standard',
                        color: '#10b981',
                      },
                      {
                        id: 'BALANCED',
                        title: 'Balanced Mode',
                        desc: 'Logs tab-switch events in audit trail without blocking test execution. Paste warning alert.',
                        badge: 'Standard',
                        color: '#3b82f6',
                      },
                      {
                        id: 'RELAXED',
                        title: 'Relaxed / Practice',
                        desc: 'Suitable for open-book take-home evaluations and learning practice sessions.',
                        badge: 'Open Book',
                        color: '#a855f7',
                      },
                    ].map(item => (
                      <div
                        key={item.id}
                        onClick={() => setProctoringStrictness(item.id as any)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          proctoringStrictness === item.id
                            ? 'bg-indigo-500/15 border-indigo-500 shadow-sm'
                            : 'bg-black/20 border-[var(--border-color)] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{item.title}</span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: `${item.color}20`, color: item.color }}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session Link Expiry */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Candidate Test Link Validity
                  </label>
                  <select
                    value={sessionExpiryHours}
                    onChange={e => setSessionExpiryHours(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="24">24 Hours (Fast-track recruitment)</option>
                    <option value="48">48 Hours (Standard)</option>
                    <option value="72">72 Hours (Weekend)</option>
                    <option value="168">7 Days (Flexible)</option>
                  </select>
                </div>

                {/* Feature Status Cards */}
                <div className="space-y-3 pt-2">
                  {[
                    { title: 'Multi-Tenant Data Isolation', desc: 'All candidate scores, code runs, and interview recordings are strictly isolated to your company ID.', status: 'Active' },
                    { title: 'Automated Plagiarism Scans', desc: 'Code similarity is analyzed against open repositories and known solutions.', status: 'Active' },
                    { title: 'Gemini Big-O Time & Space Complexity Benchmark', desc: 'Compares candidate solution O(N) complexity with optimal target algorithms.', status: 'Active' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-[var(--border-color)]">
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{f.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{f.desc}</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {f.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Anti-Cheat Rules</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB 5 (ORG): NOTIFICATIONS
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'notifications' && !isStudent && (
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Recruiter Notification Alerts</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Configure what email and in-app alerts you receive for candidate pipelines</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {[
                  {
                    title: 'Candidate finishes interview',
                    desc: 'Instant email alert when a candidate submits their code evaluation.',
                    checked: notifySubmission,
                    toggle: () => setNotifySubmission(!notifySubmission),
                  },
                  {
                    title: 'High-risk plagiarism or tab-switch detected',
                    desc: 'Real-time alert when anti-cheat detects multiple unauthorized exits or clipboard pastes.',
                    checked: notifyCheating,
                    toggle: () => setNotifyCheating(!notifyCheating),
                  },
                  {
                    title: 'Gemini AI evaluation and ATS scoring ready',
                    desc: 'Notification when the AI evaluator completes grading and Big-O benchmark comparison.',
                    checked: notifyAiScored,
                    toggle: () => setNotifyAiScored(!notifyAiScored),
                  },
                  {
                    title: 'Weekly hiring pipeline summary digest',
                    desc: 'Weekly report summarizing all candidate completions, pass rates, and top performers.',
                    checked: weeklyDigest,
                    toggle: () => setWeeklyDigest(!weeklyDigest),
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={item.toggle}
                    className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-[var(--border-color)] hover:border-white/10 transition-all cursor-pointer"
                  >
                    <div className="pr-4">
                      <p className="text-xs font-bold text-[var(--text-primary)]">{item.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={item.toggle}
                      className="w-5 h-5 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                ))}

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Notifications</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TAB: SECURITY & PASSWORD (BOTH STUDENT & ORG)
          ───────────────────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="p-6 md:p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Password & Account Security</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Update your account password and review active login credentials</p>
                </div>
              </div>

              {passwordSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs font-bold animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs font-bold animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-red-500"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    New Password (Min 6 Characters)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-red-500"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/20 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-red-500"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {passwordLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>{passwordLoading ? 'Updating...' : 'Update Password'}</span>
                </button>
              </form>

              {/* Session Overview */}
              <div className="pt-6 border-t border-[var(--border-color)] space-y-3">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Active Device Session</h4>
                <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-[var(--border-color)]">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-indigo-400" />
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">Current Web Session (Chrome / Windows)</p>
                      <p className="text-[11px] text-[var(--text-muted)]">Signed in via JWT Token • SSL TLS 1.3 Encrypted</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active Now
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
