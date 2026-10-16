import React, { useState } from 'react';
import {
  Building, Palette, ShieldAlert, Save, CheckCircle2,
  FileText, Globe, Lock, Bell, Monitor, Zap
} from 'lucide-react';

interface SettingsProps {
  token: string;
  company: any;
  onCompanyUpdate: (updatedCompany: any) => void;
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

export default function Settings({ token, company, onCompanyUpdate }: SettingsProps) {
  const [name, setName] = useState(company?.name || '');
  const [primaryColor, setPrimaryColor] = useState(company?.primaryColor || '#7c3aed');
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'security' | 'notifications'>('branding');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      const response = await fetch('/api/companies/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, primaryColor, logoUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      localStorage.setItem('company', JSON.stringify(data.company));
      onCompanyUpdate(data.company);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'branding',      label: 'Branding',       icon: Palette },
    { id: 'security',      label: 'Security',        icon: Lock },
    { id: 'notifications', label: 'Notifications',   icon: Bell },
  ] as const;

  return (
    <div className="p-8 space-y-8 w-full overflow-y-auto" style={{ maxHeight: '100vh' }}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Workspace Settings</h2>
        <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
          Configure company branding, security, and notification preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar tabs */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left"
                  style={{
                    background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                    color: isActive ? '#a78bfa' : '#64748b',
                    border: isActive ? '1px solid rgba(124,58,237,0.2)' : '1px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.color = '#94a3b8';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#64748b';
                    }
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Info panel */}
          <div
            className="mt-6 p-4 rounded-2xl"
            style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />
              <span className="text-xs font-bold" style={{ color: '#a78bfa' }}>Enterprise Features</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: '#64748b' }}>
              Upgrade to Enterprise for custom domain, SSO, audit logging, and dedicated support.
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3">
          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="card rounded-2xl p-7">
              <div className="flex items-center gap-3 mb-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.25rem' }}>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
                >
                  <Palette className="w-4.5 h-4.5" style={{ color: '#a78bfa' }} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Brand Identity</h3>
                  <p className="text-[11px]" style={{ color: '#64748b' }}>Customize your company's look and feel</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company name */}
                <div>
                  <label htmlFor="comp-name" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
                    Company Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#475569' }} />
                    <input
                      id="comp-name"
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="input-field input-field-icon"
                      placeholder="Your Company Name"
                    />
                  </div>
                </div>

                {/* Logo URL */}
                <div>
                  <label htmlFor="logo-url" className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
                    Logo URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#475569' }} />
                    <input
                      id="logo-url"
                      type="url"
                      value={logoUrl}
                      onChange={e => setLogoUrl(e.target.value)}
                      className="input-field input-field-icon"
                      placeholder="https://yourcompany.com/logo.png"
                    />
                  </div>
                  {logoUrl && (
                    <div className="mt-3 flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="w-10 h-10 rounded-lg object-contain"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                      <p className="text-xs" style={{ color: '#64748b' }}>Logo preview</p>
                    </div>
                  )}
                </div>

                {/* Color picker */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#64748b' }}>
                    Brand Accent Color
                  </label>
                  <div className="grid grid-cols-8 gap-2.5">
                    {ACCENT_COLORS.map(col => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setPrimaryColor(col.value)}
                        title={col.name}
                        className="relative transition-all"
                        style={{
                          height: 40,
                          borderRadius: 10,
                          background: col.value,
                          border: primaryColor === col.value ? '2px solid white' : '2px solid transparent',
                          transform: primaryColor === col.value ? 'scale(1.12)' : 'scale(1)',
                          boxShadow: primaryColor === col.value ? `0 0 16px -4px ${col.value}` : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {primaryColor === col.value && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div
                    className="mt-3 flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="w-6 h-6 rounded-lg" style={{ background: primaryColor }} />
                    <p className="text-xs font-mono" style={{ color: '#94a3b8' }}>{primaryColor}</p>
                    <div className="ml-auto flex items-center gap-2">
                      <p className="text-xs" style={{ color: '#64748b' }}>Preview accent</p>
                      <div
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                        style={{ background: primaryColor }}
                      >
                        Active
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save */}
                <div
                  className="flex items-center gap-4 pt-5"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving…' : 'Save Changes'}
                  </button>
                  {success && (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4" style={{ color: '#34d399' }} />
                      <span className="text-sm font-semibold" style={{ color: '#34d399' }}>
                        Settings saved!
                      </span>
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card rounded-2xl p-7 space-y-6">
              <div className="flex items-center gap-3 mb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.25rem' }}>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <ShieldAlert className="w-4.5 h-4.5" style={{ color: '#f87171' }} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Security & Compliance</h3>
                  <p className="text-[11px]" style={{ color: '#64748b' }}>Platform security features and audit controls</p>
                </div>
              </div>

              {[
                {
                  title: 'Multi-Tenant Isolation',
                  desc: 'All candidate and interview data is strictly scoped to your company workspace. No cross-tenant data leakage.',
                  status: 'Active',
                  color: '#34d399',
                },
                {
                  title: 'Token Expiry Guards',
                  desc: 'Session links expire after use or configured timeout. Prevents repeat evaluation access.',
                  status: 'Active',
                  color: '#34d399',
                },
                {
                  title: 'Plagiarism Audit Logging',
                  desc: 'Tab-switch events, copy-paste blocks, and window focus losses are stored in compliance audit trail.',
                  status: 'Active',
                  color: '#34d399',
                },
                {
                  title: 'SOC 2 Compliance',
                  desc: 'Enterprise tier includes full SOC 2 Type II audit reporting and data residency controls.',
                  status: 'Enterprise',
                  color: '#a78bfa',
                },
                {
                  title: 'SSO / SAML Integration',
                  desc: 'Okta, Google Workspace, and Azure AD single sign-on support.',
                  status: 'Enterprise',
                  color: '#a78bfa',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <span
                        className="badge"
                        style={{
                          background: item.status === 'Active' ? 'rgba(6,78,59,0.4)' : 'rgba(76,29,149,0.4)',
                          color: item.color,
                          border: `1px solid ${item.color}30`,
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: '#64748b' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card rounded-2xl p-7 space-y-5">
              <div className="flex items-center gap-3 mb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.25rem' }}>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}
                >
                  <Bell className="w-4.5 h-4.5" style={{ color: '#38bdf8' }} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Notification Preferences</h3>
                  <p className="text-[11px]" style={{ color: '#64748b' }}>Control what alerts and emails you receive</p>
                </div>
              </div>

              {[
                { label: 'Candidate submits interview', desc: 'Receive an email when a candidate completes their session', enabled: true },
                { label: 'New candidate registered', desc: 'Notify when a new candidate self-registers to your workspace', enabled: true },
                { label: 'Session link expired', desc: 'Alert when a session invite expires without being used', enabled: false },
                { label: 'AI evaluation ready', desc: 'Notify when Gemini AI finishes scoring a submitted response', enabled: true },
                { label: 'Weekly pipeline summary', desc: 'Weekly digest of candidate activity and interview metrics', enabled: false },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{item.desc}</p>
                  </div>
                  <div
                    className="relative cursor-pointer shrink-0"
                    style={{ width: 40, height: 22 }}
                    title="Toggle (demo only)"
                  >
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ background: item.enabled ? '#7c3aed' : 'rgba(255,255,255,0.1)' }}
                    />
                    <div
                      className="absolute top-1 rounded-full bg-white transition-all"
                      style={{
                        width: 14,
                        height: 14,
                        left: item.enabled ? 22 : 4,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-center mt-2" style={{ color: '#334155' }}>
                Notification preferences are demo-only in this build.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
