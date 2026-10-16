import React, { useState } from 'react';
import {
  LayoutDashboard, Video, HelpCircle, Users, FileText,
  CreditCard, Settings, LogOut, Brain, ChevronLeft, ChevronRight,
  Sparkles, Sun, Moon, Swords, Calendar, Crown,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: any;
  company: any;
  onLogout: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

const defaultMenuItems = [
  { id: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'interviews',    label: 'Interviews',     icon: Video },
  { id: 'candidates',    label: 'Candidates',     icon: Users },
  { id: 'resume-parser', label: 'Resume Parser',  icon: FileText },
  { id: 'billing',       label: 'Billing',        icon: CreditCard },
  { id: 'settings',      label: 'Settings',       icon: Settings },
];

export default function Sidebar({
  activeTab, onTabChange, user, company, onLogout, isDark, onToggleDark
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = user?.role === 'STUDENT'
    ? [
        { id: 'questions',     label: 'Practice Bank', icon: HelpCircle },
        { id: 'tracker',       label: 'Solved & Calendar Tracker', icon: Calendar },
        { id: 'arena',         label: '1v1 Arena & Leaderboard', icon: Swords },
        { id: 'interviews',    label: 'Templates & Links', icon: Video },
        { id: 'candidates',    label: 'Performance & Reviews', icon: Users },
        { id: 'resume-parser', label: 'Resume Parser',  icon: FileText },
        { id: 'billing',       label: 'Plans & Student Pass', icon: CreditCard },
      ]
    : defaultMenuItems;

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const W = collapsed ? 72 : 240;

  return (
    <aside
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        alignSelf: 'flex-start',
        width: W,
        minWidth: W,
        maxWidth: W,
        height: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        transition: 'width 0.25s ease, min-width 0.25s ease',
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* ── TOP: Brand + Nav ─────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none' }}>
        <style>{`.sidebar-scroll::-webkit-scrollbar{display:none}`}</style>
        <div className="sidebar-scroll">
          {/* Brand row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 12,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: '20px 16px',
              borderBottom: '1px solid var(--border)',
              minHeight: 72,
            }}
          >
            <div
              style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'var(--brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px var(--brand-glow)',
              }}
            >
              <Brain style={{ width: 19, height: 19, color: '#fff' }} />
            </div>

            {!collapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <h1 style={{
                  fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.02em',
                  color: 'var(--text-primary)', lineHeight: 1, margin: 0,
                }}>
                  Talent<span style={{ color: 'var(--brand)' }}>AI</span>
                </h1>
                {company?.name && (
                  <p style={{
                    fontSize: '0.65rem', fontWeight: 700, marginTop: 3,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {company.name}
                  </p>
                )}
              </div>
            )}

            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                style={{
                  flexShrink: 0, padding: 6, borderRadius: 8, border: 'none',
                  background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                title="Collapse sidebar"
              >
                <ChevronLeft style={{ width: 16, height: 16 }} />
              </button>
            )}
          </div>

          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              style={{
                width: '100%', padding: '8px 0', border: 'none', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          )}

          {/* Navigation */}
          <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  data-tip={collapsed ? item.label : undefined}
                  className={`tooltip nav-item-active-wrap relative ${isActive ? 'nav-item-active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? 0 : 10,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '11px 0' : '10px 13px',
                    width: '100%',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: isActive
                      ? (isDark ? 'rgba(37,99,235,0.25)' : '#eff6ff')
                      : 'transparent',
                    border: isActive
                      ? (isDark ? '1px solid rgba(59,130,246,0.35)' : '1px solid #bfdbfe')
                      : '1px solid transparent',
                    color: isActive
                      ? (isDark ? '#93c5fd' : '#1d4ed8')
                      : (isDark ? '#e2e8f0' : '#0f172a'),
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '0.85rem',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
                      e.currentTarget.style.color = isDark ? '#ffffff' : '#000000';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = isDark ? '#e2e8f0' : '#0f172a';
                    }
                  }}
                >
                  {isActive && (
                    <span style={{
                      position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                      width: 3.5, height: '65%', background: '#2563eb', borderRadius: '0 4px 4px 0',
                    }} />
                  )}
                  <Icon
                    style={{
                      width: 18, height: 18, flexShrink: 0,
                      color: isActive
                        ? (isDark ? '#60a5fa' : '#1d4ed8')
                        : (isDark ? '#cbd5e1' : '#334155'),
                    }}
                  />
                  {!collapsed && (
                    <span style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: isActive
                        ? (isDark ? '#93c5fd' : '#1d4ed8')
                        : (isDark ? '#e2e8f0' : '#0f172a'),
                      fontWeight: isActive ? 800 : 600,
                    }}>
                      {item.label}
                    </span>
                  )}
                  {isActive && !collapsed && (
                    <span style={{
                      marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%',
                      background: isDark ? '#60a5fa' : '#1d4ed8', flexShrink: 0,
                    }} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── BOTTOM: Theme toggle + User + Logout ──────── */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 10px', flexShrink: 0 }}>
        {/* Theme toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '8px 0' : '8px 12px',
            marginBottom: 6,
          }}
        >
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isDark
                ? <Moon style={{ width: 13, height: 13, color: 'var(--text-muted)' }} />
                : <Sun style={{ width: 13, height: 13, color: '#ca8a04' }} />
              }
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {isDark ? 'Dark' : 'Light'} mode
              </span>
            </div>
          )}
          <button
            onClick={onToggleDark}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`theme-toggle ${isDark ? 'active' : ''}`}
            style={{ flexShrink: 0 }}
          />
        </div>

        {/* AI badge */}
        {!collapsed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 10, marginBottom: 6,
            background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)',
          }}>
            <Sparkles style={{ width: 13, height: 13, color: 'var(--brand)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--brand)' }}>AI-Powered Platform</span>
          </div>
        )}

        {/* User row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 9,
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '8px 0' : '9px 12px',
          borderRadius: 10,
          marginBottom: 4,
          background: 'var(--bg-hover)',
          border: '1px solid var(--border)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'var(--brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.72rem', fontWeight: 900, color: '#fff',
          }}>
            {initials}
          </div>
          {!collapsed && (() => {
            const isMaster = user?.isMaster === true || user?.role === 'SUPER_ADMIN' || user?.email === 'admin@talentai.com';
            const isDemo = !isMaster && (user?.isDemoGuest === true || user?.email === 'demo.guest@talentai.com');
            return (
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  fontSize: '0.78rem', fontWeight: 700, margin: 0,
                  color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.name || 'User'}
                </p>
                <p style={{
                  fontSize: '0.65rem', margin: 0,
                  color: isMaster ? '#a855f7' : isDemo ? '#f59e0b' : 'var(--text-muted)',
                  fontWeight: (isMaster || isDemo) ? 800 : 500
                }}>
                  {isMaster ? '👑 Master Owner VIP' : isDemo ? '⚡ Demo Pass' : user?.role === 'COMPANY_ADMIN' ? 'Admin' : user?.role || 'Student'}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          data-tip={collapsed ? 'Log Out' : undefined}
          className="tooltip"
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 9,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '9px 0' : '9px 13px',
            width: '100%', borderRadius: 10,
            border: 'none', background: 'transparent',
            cursor: 'pointer', color: 'var(--text-muted)',
            fontSize: '0.84rem', fontWeight: 500, transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(220,38,38,0.08)';
            e.currentTarget.style.color = '#dc2626';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <LogOut style={{ width: 16, height: 16, flexShrink: 0 }} />
          {!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  );
}
