import React, { useState, useEffect } from 'react';
import {
  Users, Video, Award, Clock, Bell, ArrowRight,
  ExternalLink, ChevronRight, RefreshCw, Activity,
  BarChart3, CheckCircle2, AlertCircle, Circle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, CartesianGrid
} from 'recharts';

interface DashboardProps {
  token: string;
  onTabChange: (tab: string) => void;
}

function SkeletonCard() {
  return <div className="card rounded-xl h-24 skeleton" />;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED: { label: 'Completed', color: '#059669', bg: 'rgba(5,150,105,0.15)' },
  STARTED:   { label: 'In Progress', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  PENDING:   { label: 'Pending', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  EXPIRED:   { label: 'Expired', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
};

export default function Dashboard({ token, onTabChange }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await fetch('/api/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load dashboard data');
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  if (loading) {
    return (
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="skeleton" style={{ height: 28, width: 220, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 32, width: 32, borderRadius: 10 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 16 }}>
          <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>
          <AlertCircle style={{ width: 22, height: 22, color: '#ef4444' }} />
        </div>
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>{error || 'Unable to load analytics'}</p>
        <button onClick={() => fetchData()} className="btn-primary btn-sm">Retry</button>
      </div>
    );
  }

  const { metrics, pipeline, scoreDistribution, recentSessions, notifications } = data;

  const kpiCards = [
    {
      label: 'Total Candidates',
      value: metrics.totalCandidates,
      icon: Users,
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.1)',
      border: 'rgba(124,58,237,0.2)',
      sub: 'Active talent pool',
    },
    {
      label: 'Interviews',
      value: metrics.totalSessions,
      icon: Video,
      color: '#2563eb',
      bg: 'rgba(37,99,235,0.1)',
      border: 'rgba(37,99,235,0.2)',
      sub: `${metrics.pendingSessions} pending`,
    },
    {
      label: 'Completion Rate',
      value: `${metrics.completionRate}%`,
      icon: Clock,
      color: '#059669',
      bg: 'rgba(5,150,105,0.1)',
      border: 'rgba(5,150,105,0.2)',
      sub: `${metrics.completedSessions} completed`,
    },
    {
      label: 'Avg AI Score',
      value: `${metrics.averageScore}/100`,
      icon: Award,
      color: '#d97706',
      bg: 'rgba(217,119,6,0.1)',
      border: 'rgba(217,119,6,0.2)',
      sub: 'All evaluations',
    },
  ];

  const BAR_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6366f1'];

  const areaData = scoreDistribution?.map((d: any, i: number) => ({
    ...d,
    fill: BAR_COLORS[i % BAR_COLORS.length],
  })) || [];

  // Build pipeline rows from real data
  const pipelineRows = pipeline ? [
    { stage: 'New', count: pipeline.NEW || 0, color: '#2563eb' },
    { stage: 'In Review', count: pipeline.IN_REVIEW || 0, color: '#d97706' },
    { stage: 'Shortlisted', count: pipeline.SHORTLISTED || 0, color: '#059669' },
    { stage: 'Rejected', count: pipeline.REJECTED || 0, color: '#dc2626' },
    { stage: 'Hired', count: pipeline.HIRED || 0, color: '#0891b2' },
  ] : [];

  const maxPipeline = Math.max(1, ...pipelineRows.map(p => p.count));

  return (
    <div style={{ padding: '24px 28px', maxHeight: '100vh', overflowY: 'auto', scrollbarWidth: 'thin' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            Dashboard
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Real-time candidate pipeline & AI assessment insights
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => onTabChange('candidates')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 10,
              background: 'var(--bg-hover)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Users style={{ width: 13, height: 13 }} /> Candidates
          </button>
          <button
            onClick={() => fetchData(true)}
            style={{
              width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-hover)', border: '1px solid var(--border)', cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
            title="Refresh"
          >
            <RefreshCw style={{ width: 14, height: 14 }} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={i}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '16px 18px',
                borderTop: `2.5px solid ${kpi.color}`,
                position: 'relative', overflow: 'hidden',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 9, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: kpi.bg, border: `1px solid ${kpi.border}`,
                  }}
                >
                  <Icon style={{ width: 15, height: 15, color: kpi.color }} />
                </div>
              </div>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>
                {kpi.label}
              </p>
              <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.1 }}>
                {kpi.value}
              </p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {kpi.sub}
              </p>
              {/* Background decoration */}
              <div style={{ position: 'absolute', bottom: -8, right: -8, opacity: 0.04, color: kpi.color }}>
                <Icon style={{ width: 56, height: 56 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts + Activity Feed Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 18 }}>

        {/* Score Distribution Chart */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>Score Distribution</h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>AI suitability across evaluations</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontSize: '0.68rem', fontWeight: 700 }}>
              <BarChart3 style={{ width: 12, height: 12 }} /> Analytics
            </div>
          </div>
          <div style={{ height: 190 }}>
            {metrics.completedSessions === 0 ? (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, borderRadius: 12, border: '1px dashed var(--border)', color: 'var(--text-muted)',
              }}>
                <Activity style={{ width: 28, height: 28, opacity: 0.4 }} />
                <p style={{ fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>
                  No evaluations completed yet.<br />Send invites to see data here.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="range" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 11,
                      color: 'var(--text-primary)',
                    }}
                    labelStyle={{ color: 'var(--text-muted)', fontWeight: 700 }}
                    itemStyle={{ color: 'var(--text-secondary)' }}
                    cursor={{ fill: 'var(--bg-hover)' }}
                  />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                    {areaData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Activity Feed + Pipeline */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>Activity Feed</h3>
            <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
              <Bell style={{ width: 13, height: 13, color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 130, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {notifications.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 6, color: 'var(--text-muted)', padding: '16px 0' }}>
                <CheckCircle2 style={{ width: 22, height: 22, opacity: 0.4 }} />
                <p style={{ fontSize: '0.72rem', margin: 0 }}>All caught up!</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((notif: any) => (
                <div
                  key={notif.id}
                  style={{
                    display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 10,
                    background: 'var(--bg-hover)', border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: '#7c3aed' }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.title}</p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
                      {notif.message.length > 80 ? notif.message.slice(0, 80) + '…' : notif.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pipeline Mini Stats */}
          {pipelineRows.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Pipeline Overview</p>
              {pipelineRows.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--text-muted)', width: 70 }}>{p.stage}</span>
                  <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--bg-hover)', margin: '0 8px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: p.color, width: `${Math.max(4, (p.count / maxPipeline) * 100)}%`, transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ fontWeight: 800, color: p.color, width: 24, textAlign: 'right' }}>{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Sessions Table ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>Recent Sessions</h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Latest candidate interview activity</p>
          </div>
          <button
            onClick={() => onTabChange('candidates')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8,
              background: 'none', border: '1px solid var(--border)', color: 'var(--brand)',
              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            All Candidates <ArrowRight style={{ width: 12, height: 12 }} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Interview</th>
                <th>Token</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Video style={{ width: 28, height: 28, opacity: 0.3 }} />
                      <p style={{ fontSize: '0.8rem', margin: 0 }}>No sessions yet. Invite a candidate to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentSessions.map((session: any) => {
                  const s = STATUS_MAP[session.status] || STATUS_MAP.PENDING;
                  return (
                    <tr key={session.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff',
                            fontSize: '0.7rem', fontWeight: 900,
                          }}>
                            {session.candidate.name.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem' }}>{session.candidate.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{session.interview.title}</td>
                      <td>
                        <code style={{
                          fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6,
                          background: 'rgba(124,58,237,0.08)', color: '#7c3aed',
                          border: '1px solid rgba(124,58,237,0.15)',
                        }}>
                          {session.token.slice(0, 10)}…
                        </code>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 800,
                          background: s.bg, color: s.color, border: `1px solid ${s.color}30`,
                          ...(session.status === 'COMPLETED' ? {
                            background: 'rgba(5,150,105,0.18)',
                            color: '#047857',
                            border: '1px solid rgba(5,150,105,0.4)',
                            fontWeight: 900,
                          } : {}),
                        }}>
                          <Circle style={{ width: 5, height: 5, fill: 'currentColor' }} />
                          {s.label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {new Date(session.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {session.status === 'COMPLETED' ? (
                          <button
                            onClick={() => onTabChange('candidates')}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)',
                              background: 'none', color: 'var(--brand)', fontSize: '0.72rem', fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Review <ChevronRight style={{ width: 12, height: 12 }} />
                          </button>
                        ) : (
                          <a
                            href={`/session/${session.token}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)',
                              background: 'none', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            Open <ExternalLink style={{ width: 11, height: 11 }} />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
