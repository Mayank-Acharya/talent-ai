import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, Clock, Sparkles, Search, BookOpen, X,
  AlertCircle, ChevronDown, ChevronUp, LayoutGrid, Loader2,
  HelpCircle, FileText, Zap, CheckCircle2, ListTodo, Mail, Send, Copy, Check,
  Phone, Smartphone, MessageSquare, Share2
} from 'lucide-react';

interface InterviewsProps { token?: string; }

const DIFF_COLOR: Record<string, string> = { EASY: '#10b981', MEDIUM: '#f59e0b', HARD: '#ef4444' };
const TYPE_COLOR: Record<string, string> = {
  CODING: '#3b82f6', DSA: '#8b5cf6', HR: '#f59e0b',
  APTITUDE: '#10b981', SYSTEM_DESIGN: '#ec4899', BEHAVIORAL: '#f59e0b',
};

function Badge({ children, color = '#3b82f6' }: any) {
  return (
    <span style={{
      fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 6,
      color, background: `${color}18`, letterSpacing: '0.03em',
      textTransform: 'uppercase' as any, whiteSpace: 'nowrap' as any,
    }}>{children}</span>
  );
}

function Label({ children }: any) {
  return <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' as any, letterSpacing: '0.06em', color: 'var(--text-secondary)', margin: '0 0 5px' }}>{children}</p>;
}

function FieldInput({ value, onChange, placeholder, type = 'text', rows, style: ex }: any) {
  const base = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as any, transition: 'border-color 0.15s', ...ex };
  if (rows) return <textarea rows={rows} placeholder={placeholder} value={value} onChange={(e: any) => onChange(e.target.value)} style={{ ...base, resize: 'vertical' as any, lineHeight: 1.6 }} onFocus={(e: any) => e.target.style.borderColor = '#2563eb'} onBlur={(e: any) => e.target.style.borderColor = 'var(--border)'} />;
  return <input type={type} placeholder={placeholder} value={value} onChange={(e: any) => onChange(e.target.value)} style={base} onFocus={(e: any) => e.target.style.borderColor = '#2563eb'} onBlur={(e: any) => e.target.style.borderColor = 'var(--border)'} />;
}

function FieldSelect({ value, onChange, children, style: ex }: any) {
  return <select value={value} onChange={(e: any) => onChange(e.target.value)} style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none', cursor: 'pointer', ...ex }}>{children}</select>;
}

export default function Interviews({ token }: InterviewsProps) {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Create / Edit Template Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [questions, setQuestions] = useState<any[]>([]);
  const [expandedQ, setExpandedQ] = useState<Record<string, boolean>>({});
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);

  // Question Bank
  const [showBank, setShowBank] = useState(false);
  const [bankTab, setBankTab] = useState<'LEETCODE' | 'BEHAVIORAL'>('LEETCODE');
  const [lcProblems, setLcProblems] = useState<any[]>([]);
  const [lcLoading, setLcLoading] = useState(false);
  const [lcError, setLcError] = useState('');
  const [lcSearch, setLcSearch] = useState('');
  const [lcDiff, setLcDiff] = useState<'ALL' | 'Easy' | 'Medium' | 'Hard'>('ALL');
  const [lcTotal, setLcTotal] = useState(0);
  const [behavProblems, setBehavProblems] = useState<any[]>([]);
  const [bhLoading, setBhLoading] = useState(false);
  const [autoSelectDiff, setAutoSelectDiff] = useState<'MIXED' | 'EASY' | 'MEDIUM' | 'HARD'>('MIXED');
  const [autoSelecting, setAutoSelecting] = useState(false);

  // Send Candidate Invitation Modal (Email, Phone/SMS, WhatsApp)
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedInterviewForInvite, setSelectedInterviewForInvite] = useState<any>(null);
  const [inviteChannel, setInviteChannel] = useState<'both' | 'email' | 'phone'>('both');
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSuccessInfo, setInviteSuccessInfo] = useState<{
    url: string;
    message: string;
    previewUrl?: string;
    realSmtpUsed?: boolean;
    smsResult?: {
      sent: boolean;
      message: string;
      whatsappUrl?: string;
      smsUrl?: string;
      formattedText?: string;
      realTwilioUsed?: boolean;
    } | null;
    copied: boolean;
    copiedSms: boolean;
  } | null>(null);
  const [inviteModalError, setInviteModalError] = useState('');
  const [gmailDeliveredNotice, setGmailDeliveredNotice] = useState(false);
  const [whatsappLaunchedNotice, setWhatsappLaunchedNotice] = useState(false);

  const hdr = useCallback(() => token ? { Authorization: `Bearer ${token}` } : {} as any, [token]);

  const fetchInterviews = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/interviews', { headers: hdr() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to load');
      setInterviews(d.interviews || []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [hdr]);

  const fetchLC = useCallback(async () => {
    setLcLoading(true); setLcError('');
    try {
      const p = new URLSearchParams({ page: '1', limit: '4000', difficulty: lcDiff, search: lcSearch, source: 'LEETCODE' });
      const res = await fetch(`/api/leetcode/problems?${p}`, { headers: hdr() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      setLcProblems(d.problems || []); setLcTotal(d.total || 0);
    } catch (e: any) { setLcError(e.message); } finally { setLcLoading(false); }
  }, [lcDiff, lcSearch, hdr]);

  const fetchBehavioral = useCallback(async () => {
    setBhLoading(true);
    try {
      const res = await fetch('/api/leetcode/behavioral', { headers: hdr() });
      const d = await res.json();
      if (res.ok) setBehavProblems(d.problems || []);
    } catch { } finally { setBhLoading(false); }
  }, [hdr]);

  useEffect(() => { fetchInterviews(); }, [fetchInterviews]);
  useEffect(() => { fetchLC(); fetchBehavioral(); }, [fetchLC, fetchBehavioral]);

  // Open Invitation Modal
  const openInviteModal = (iv: any) => {
    setSelectedInterviewForInvite(iv);
    setInviteChannel('both');
    setCandName('');
    setCandEmail('');
    setCandPhone('');
    setEmailSubject(`🎉 Invitation to Technical Assessment: ${iv.title}`);
    setEmailMessage(`Hello! 🎉\n\nWe are thrilled to invite you to take the technical assessment for ${iv.title}!\n\nWe are excited to evaluate your problem-solving abilities and coding skills. Please click the link below whenever you are ready to begin your session.\n\nBest of luck, and we can't wait to review your submission!`);
    setInviteSuccessInfo(null);
    setInviteModalError('');
    setGmailDeliveredNotice(false);
    setWhatsappLaunchedNotice(false);
    setInviteModalOpen(true);
  };

  const closeInviteModal = () => {
    setInviteModalOpen(false);
    setSelectedInterviewForInvite(null);
    setCandName('');
    setCandEmail('');
    setCandPhone('');
    setInviteSuccessInfo(null);
    setInviteModalError('');
    setGmailDeliveredNotice(false);
    setWhatsappLaunchedNotice(false);
  };

  // Submit Candidate Invitation via Mail / Phone / WhatsApp
  const handleSendInviteSubmit = async () => {
    setInviteModalError('');
    if (!candName.trim()) {
      setInviteModalError('Candidate Name is required.');
      return;
    }

    const hasEmail = Boolean(candEmail.trim());
    const hasPhone = Boolean(candPhone.trim());

    if (inviteChannel === 'email' && (!hasEmail || !candEmail.includes('@'))) {
      setInviteModalError('Please provide a valid Candidate Email address.');
      return;
    }
    if (inviteChannel === 'phone' && (!hasPhone || candPhone.trim().length < 6)) {
      setInviteModalError('Please provide a valid Candidate Phone Number (e.g. +1 555-0199 or +91 9876543210).');
      return;
    }
    if (inviteChannel === 'both' && !hasEmail && !hasPhone) {
      setInviteModalError('Please provide either an Email address or Phone number to deliver the invitation.');
      return;
    }
    if (hasEmail && !candEmail.includes('@')) {
      setInviteModalError('Please provide a valid email format.');
      return;
    }

    setSendingInvite(true);
    try {
      const res = await fetch(`/api/interviews/${selectedInterviewForInvite.id}/send-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({
          candidateName: candName.trim(),
          candidateEmail: candEmail.trim().toLowerCase(),
          candidatePhone: candPhone.trim(),
          subject: emailSubject,
          message: emailMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invitation');

      const fullUrl = (data.fullInviteUrl || `${window.location.origin}${data.inviteUrl}`).replace(':5173', ':3000');
      setInviteSuccessInfo({
        url: fullUrl,
        message: data.message || `Assessment Invitation prepared successfully!`,
        previewUrl: data.previewUrl,
        realSmtpUsed: data.realSmtpUsed,
        smsResult: data.smsResult,
        copied: false,
        copiedSms: false,
      });
    } catch (err: any) {
      setInviteModalError(err.message || 'Error sending invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const addManual = () => {
    const id = `m_${Date.now()}`;
    setQuestions(prev => [...prev, { _tempId: id, title: '', text: '', type: 'HR', difficulty: 'MEDIUM', timeLimitSeconds: 300, codeSnippet: '', expectedGuide: '', isLeetcode: false }]);
    setExpandedQ(prev => ({ ...prev, [id]: true }));
  };

  const addLC = async (p: any) => {
    const pid = parseInt(p.questionFrontendId || p.id || '0');
    if (questions.some(q => q.leetcodeId === pid)) return;
    let text = p.text || `[LeetCode #${p.questionFrontendId}] ${p.title}`;
    if (p.titleSlug) {
      try {
        const res = await fetch(`/api/leetcode/problem/${p.titleSlug}`, { headers: hdr() });
        if (res.ok) { const d = await res.json(); if (d.text) text = d.text; }
      } catch { }
    }
    const id = `lc_${Date.now()}`;
    setQuestions(prev => [...prev, {
      _tempId: id, title: p.title, text, type: p.type || 'CODING',
      difficulty: (p.difficulty || 'MEDIUM').toUpperCase(),
      timeLimitSeconds: p.timeLimitSeconds || (p.difficulty === 'Hard' ? 2400 : p.difficulty === 'Easy' ? 900 : 1500),
      codeSnippet: p.codeSnippet || `// ${p.title}\n\nfunction solution() {\n}`,
      expectedGuide: p.expectedGuide || `Evaluate logic for ${p.title}`,
      examples: p.examples || null, constraints: p.constraints || null,
      optimalTime: p.optimalTime || null, optimalSpace: p.optimalSpace || null,
      leetcodeId: pid || null, leetcodeSlug: p.titleSlug || null, isLeetcode: true,
    }]);
    setExpandedQ(prev => ({ ...prev, [id]: false }));
  };

  const addBehavioral = (p: any) => {
    if (questions.some(q => q.title === p.title)) return;
    const id = `bh_${Date.now()}`;
    setQuestions(prev => [...prev, { _tempId: id, title: p.title, text: p.text || p.title, type: p.type || 'HR', difficulty: 'MEDIUM', timeLimitSeconds: p.timeLimitSeconds || 600, codeSnippet: '', expectedGuide: p.expectedGuide || '', isLeetcode: false }]);
    setExpandedQ(prev => ({ ...prev, [id]: false }));
  };

  const autoSelect = async () => {
    setAutoSelecting(true); setLcError('');
    try {
      const res = await fetch('/api/leetcode/auto-select', { method: 'POST', headers: { 'Content-Type': 'application/json', ...hdr() }, body: JSON.stringify({ durationMinutes, difficulty: autoSelectDiff }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Auto-select failed');
      setQuestions(prev => [...prev, ...(d.questions || []).map((q: any, i: number) => ({ ...q, _tempId: `a_${Date.now()}_${i}`, isLeetcode: true }))]);
      setShowBank(false);
    } catch (e: any) { setLcError(e.message); } finally { setAutoSelecting(false); }
  };

  const removeQ = (idx: number) => setQuestions(prev => prev.filter((_, i) => i !== idx));
  const updateQ = (idx: number, f: string, v: any) => setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [f]: v } : q));
  const toggleQ = (id: string) => setExpandedQ(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSave = async () => {
    setModalError('');
    if (!title.trim()) { setModalError('Template title is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch(editingId ? `/api/interviews/${editingId}` : '/api/interviews', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({
          title: title.trim(), description: description.trim(), durationMinutes, isTemplate: true,
          questions: questions.map(q => ({
            title: q.title || q.text?.slice(0, 60) || 'Question', text: q.text || q.title || '',
            type: q.type || 'HR', difficulty: q.difficulty || 'MEDIUM',
            timeLimitSeconds: Number(q.timeLimitSeconds) || 300,
            codeSnippet: q.codeSnippet || '', expectedGuide: q.expectedGuide || '',
            examples: q.examples || null, constraints: q.constraints || null,
            optimalTime: q.optimalTime || null, optimalSpace: q.optimalSpace || null,
            optimalApproach: q.optimalApproach || null,
            leetcodeId: q.leetcodeId || null, leetcodeSlug: q.leetcodeSlug || null,
          })),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Save failed');
      closeModal(); fetchInterviews();
    } catch (e: any) { setModalError(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this interview template?')) return;
    try {
      const res = await fetch(`/api/interviews/${id}`, { method: 'DELETE', headers: hdr() });
      if (!res.ok) throw new Error('Delete failed');
      fetchInterviews();
    } catch (e: any) { setError(e.message); }
  };

  const openEdit = (iv: any) => {
    setEditingId(iv.id); setTitle(iv.title || ''); setDescription(iv.description || '');
    setDurationMinutes(iv.durationMinutes || 30);
    setQuestions((iv.questions || []).map((q: any) => ({ ...q, _tempId: q.id })));
    setModalError(''); setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false); setEditingId(null); setTitle(''); setDescription('');
    setDurationMinutes(30); setQuestions([]); setShowBank(false);
    setModalError(''); setLcError(''); setExpandedQ({});
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? interviews.filter(iv => iv.title?.toLowerCase().includes(q) || (iv.description || '').toLowerCase().includes(q)) : interviews;
  }, [interviews, search]);

  const stats = useMemo(() => {
    const t = interviews.length;
    const total = interviews.reduce((a, iv) => a + (iv.questions?.length || 0), 0);
    return { t, total, avg: t ? (total / t).toFixed(1) : '0' };
  }, [interviews]);

  const s = (style: any) => style;

  return (
    <div style={s({ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: "'Inter', system-ui, sans-serif" })}>
      <div style={s({ maxWidth: 1280, margin: '0 auto', padding: '28px 24px 60px' })}>

        {/* HEADER */}
        <div style={s({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' })}>
          <div>
            <div style={s({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 100, background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 })}>
              <Sparkles size={11} /> Interview Studio
            </div>
            <h1 style={s({ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' })}>Interview Templates</h1>
            <p style={s({ color: 'var(--text-secondary)', fontSize: '0.83rem', margin: '4px 0 0' })}>Build reusable screening kits with 3000+ LeetCode problems &amp; invite candidates via email.</p>
          </div>
          <button onClick={() => { closeModal(); setShowModal(true); }}
            style={s({ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', whiteSpace: 'nowrap' })}>
            <Plus size={16} /> New Template
          </button>
        </div>

        {/* STATS */}
        <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 })}>
          {[
            { label: 'Templates', value: stats.t, icon: <LayoutGrid size={16} color="#2563eb" />, accent: '#2563eb' },
            { label: 'Total Questions', value: stats.total, icon: <ListTodo size={16} color="#10b981" />, accent: '#10b981' },
            { label: 'Avg / Template', value: stats.avg, icon: <HelpCircle size={16} color="#f59e0b" />, accent: '#f59e0b' },
          ].map((st, i) => (
            <div key={i} style={s({ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 })}>
              <div style={s({ width: 36, height: 36, borderRadius: 10, background: `${st.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>{st.icon}</div>
              <div>
                <p style={s({ fontSize: '1.35rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)', lineHeight: 1 })}>{st.value}</p>
                <p style={s({ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '3px 0 0', fontWeight: 600 })}>{st.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* SEARCH */}
        <div style={s({ position: 'relative', marginBottom: 20, maxWidth: 420 })}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-secondary)' }} />
          <input type="text" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)}
            style={s({ width: '100%', padding: '9px 14px 9px 36px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' })} />
        </div>

        {/* ERROR */}
        {error && <div style={s({ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.82rem', marginBottom: 16, fontWeight: 600 })}><AlertCircle size={14} /> {error}</div>}

        {/* CONTENT */}
        {loading ? (
          <div style={s({ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 12, color: 'var(--text-secondary)' })}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>Loading templates...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s({ background: 'var(--bg-card)', border: '2px dashed var(--border)', borderRadius: 18, padding: '60px 20px', textAlign: 'center' })}>
            <LayoutGrid size={40} style={{ opacity: 0.4, color: 'var(--text-secondary)', display: 'block', margin: '0 auto 12px' }} />
            <h3 style={s({ fontWeight: 800, fontSize: '1.05rem', margin: '0 0 6px', color: 'var(--text-primary)' })}>{search ? 'No matching templates' : 'No templates yet'}</h3>
            <p style={s({ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0 0 18px' })}>{search ? 'Try a different keyword.' : 'Create your first reusable interview template.'}</p>
            {!search && <button onClick={() => { closeModal(); setShowModal(true); }} style={s({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' })}><Plus size={15} /> Create Template</button>}
          </div>
        ) : (
          <div style={s({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 })}>
            {filtered.map(iv => {
              const qc = iv.questions?.length || 0;
              const cc = (iv.questions || []).filter((q: any) => q.type === 'CODING' || q.type === 'DSA').length;
              const bc = (iv.questions || []).filter((q: any) => q.type === 'HR' || q.type === 'BEHAVIORAL').length;
              return (
                <div key={iv.id}
                  style={s({ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 11, transition: 'box-shadow 0.2s,transform 0.15s', cursor: 'default' })}
                  onMouseEnter={e => { (e.currentTarget as any).style.boxShadow = '0 6px 24px rgba(37,99,235,0.1)'; (e.currentTarget as any).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as any).style.boxShadow = 'none'; (e.currentTarget as any).style.transform = 'none'; }}>
                  <div style={s({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 })}>
                    <h3 style={s({ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.35, flex: 1 })}>{iv.title}</h3>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => openEdit(iv)} title="Edit" style={s({ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' })}><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(iv.id)} title="Delete" style={s({ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' })}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {iv.description && <p style={s({ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 })}>{iv.description}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap' as any, gap: 5 }}>
                    <Badge color="#2563eb">{iv.durationMinutes}m</Badge>
                    <Badge color="#10b981">{qc} Q{qc !== 1 ? 's' : ''}</Badge>
                    {cc > 0 && <Badge color="#8b5cf6">{cc} Coding</Badge>}
                    {bc > 0 && <Badge color="#f59e0b">{bc} Behavioral</Badge>}
                  </div>
                  {qc > 0 && (
                    <div style={s({ borderTop: '1px solid var(--border)', paddingTop: 9, display: 'flex', flexDirection: 'column', gap: 4 })}>
                      {(iv.questions || []).slice(0, 3).map((q: any, qi: number) => (
                        <div key={qi} style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: `${TYPE_COLOR[q.type] || '#94a3b8'}18`, color: TYPE_COLOR[q.type] || '#94a3b8', flexShrink: 0 }}>{q.type || 'Q'}</span>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as any }}>{q.title || q.text?.slice(0, 50) || 'Untitled'}</span>
                        </div>
                      ))}
                      {qc > 3 && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>+{qc - 3} more</span>}
                    </div>
                  )}

                  {/* Send Candidate Invitation Mail Action */}
                  <div style={s({ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 })}>
                    <button
                      onClick={() => openInviteModal(iv)}
                      style={s({
                        width: '100%', padding: '9px 12px', borderRadius: 10,
                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none',
                        color: '#ffffff', fontSize: '0.8rem', fontWeight: 800,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        boxShadow: '0 4px 12px rgba(37,99,235,0.25)', transition: 'all 0.15s'
                      })}
                    >
                      <Mail size={14} /> Send Candidate Invite
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEND CANDIDATE INVITATION EMAIL & PHONE / WHATSAPP MODAL */}
      {inviteModalOpen && selectedInterviewForInvite && (
        <div style={s({ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 })}
          onClick={e => { if (e.target === e.currentTarget) closeInviteModal(); }}>
          <div style={s({ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 580, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.28)' })}>
            <div style={s({ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', flexShrink: 0 })}>
              <div>
                <h3 style={s({ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 7 })}>
                  <Mail size={16} color="#2563eb" />
                  <Phone size={15} color="#10b981" />
                  Send Candidate Invitation
                </h3>
                <p style={s({ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0' })}>
                  Dispatch assessment invite for <strong>{selectedInterviewForInvite.title}</strong> via Email, SMS, or WhatsApp.
                </p>
              </div>
              <button onClick={closeInviteModal} style={s({ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex' })}><X size={18} /></button>
            </div>

            {inviteModalError && (
              <div style={s({ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 })}>
                <AlertCircle size={14} /> {inviteModalError}
              </div>
            )}

            <div style={s({ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 })}>
              {/* Channel Selector */}
              <div>
                <Label>Delivery Channels</Label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setInviteChannel('both')}
                    style={{
                      padding: '8px 10px', borderRadius: 9, fontSize: '0.74rem', fontWeight: 800,
                      background: inviteChannel === 'both' ? 'rgba(37,99,235,0.12)' : 'var(--bg-secondary)',
                      color: inviteChannel === 'both' ? '#2563eb' : 'var(--text-secondary)',
                      border: inviteChannel === 'both' ? '1.5px solid #2563eb' : '1px solid var(--border)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.15s'
                    }}
                  >
                    <span>📧 + 📱 Multi-Channel</span>
                    <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>(Email &amp; Phone)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteChannel('phone')}
                    style={{
                      padding: '8px 10px', borderRadius: 9, fontSize: '0.74rem', fontWeight: 800,
                      background: inviteChannel === 'phone' ? 'rgba(16,185,129,0.12)' : 'var(--bg-secondary)',
                      color: inviteChannel === 'phone' ? '#10b981' : 'var(--text-secondary)',
                      border: inviteChannel === 'phone' ? '1.5px solid #10b981' : '1px solid var(--border)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.15s'
                    }}
                  >
                    <span>📱 Phone / WhatsApp</span>
                    <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>(No Email Needed)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteChannel('email')}
                    style={{
                      padding: '8px 10px', borderRadius: 9, fontSize: '0.74rem', fontWeight: 800,
                      background: inviteChannel === 'email' ? 'rgba(99,102,241,0.12)' : 'var(--bg-secondary)',
                      color: inviteChannel === 'email' ? '#6366f1' : 'var(--text-secondary)',
                      border: inviteChannel === 'email' ? '1.5px solid #6366f1' : '1px solid var(--border)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.15s'
                    }}
                  >
                    <span>📧 Email Only</span>
                    <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>(Standard Mail)</span>
                  </button>
                </div>
              </div>

              <div>
                <Label>Candidate Full Name *</Label>
                <FieldInput value={candName} onChange={setCandName} placeholder="e.g. Alex Mercer" />
              </div>

              {(inviteChannel === 'both' || inviteChannel === 'email') && (
                <div>
                  <Label>Candidate Email Address {inviteChannel === 'email' ? '*' : '(Optional if phone provided)'}</Label>
                  <FieldInput type="email" value={candEmail} onChange={setCandEmail} placeholder="e.g. alex.mercer@gmail.com" />
                </div>
              )}

              {(inviteChannel === 'both' || inviteChannel === 'phone') && (
                <div>
                  <Label>Candidate Phone Number {inviteChannel === 'phone' ? '*' : '(For SMS & WhatsApp)'}</Label>
                  <FieldInput value={candPhone} onChange={setCandPhone} placeholder="e.g. +1 555-0199 or +91 9876543210" />
                  <p style={{ fontSize: '0.72rem', color: '#10b981', margin: '4px 0 0', fontWeight: 600 }}>
                    💡 Candidates without Gmail or PC email receive direct 1-click WhatsApp &amp; SMS assessment links.
                  </p>
                </div>
              )}

              <div>
                <Label>Assessment Subject</Label>
                <FieldInput value={emailSubject} onChange={setEmailSubject} placeholder="Invitation Subject..." />
              </div>

              <div>
                <Label>Custom Message / Instructions</Label>
                <FieldInput rows={3} value={emailMessage} onChange={setEmailMessage} placeholder="Custom assessment note or instructions..." />
              </div>

              {inviteSuccessInfo && (
                <div style={s({ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 })}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 800, fontSize: '0.82rem' }}>
                    <CheckCircle2 size={16} /> {inviteSuccessInfo.message}
                  </div>

                  {gmailDeliveredNotice && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#16a34a', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} /> Gmail Composer Launched with prefilled assessment link!
                    </div>
                  )}

                  {whatsappLaunchedNotice && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#16a34a', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} /> WhatsApp Chat Opened with personalized assessment invite!
                    </div>
                  )}

                  {/* Multi-Channel Quick Launch Buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as any, marginTop: 2 }}>
                    {/* WhatsApp button if phone available */}
                    {(candPhone || inviteSuccessInfo.smsResult?.whatsappUrl) && (
                      <a
                        href={inviteSuccessInfo.smsResult?.whatsappUrl || `https://wa.me/${candPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hello ${candName}! Here is your assessment link for ${selectedInterviewForInvite.title}: ${inviteSuccessInfo.url}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setWhatsappLaunchedNotice(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, background: '#25D366', color: '#ffffff', fontSize: '0.76rem', fontWeight: 800, textDecoration: 'none', boxShadow: '0 2px 8px rgba(37,211,102,0.3)' }}
                      >
                        <MessageSquare size={13} /> Send via WhatsApp ↗
                      </a>
                    )}

                    {/* SMS button if phone available */}
                    {(candPhone || inviteSuccessInfo.smsResult?.smsUrl) && (
                      <a
                        href={inviteSuccessInfo.smsResult?.smsUrl || `sms:${candPhone.replace(/[^\d+]/g, '')}?body=${encodeURIComponent(`Assessment invite: ${inviteSuccessInfo.url}`)}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, background: '#6366f1', color: '#ffffff', fontSize: '0.76rem', fontWeight: 800, textDecoration: 'none' }}
                      >
                        <Smartphone size={13} /> Open SMS / Text App ↗
                      </a>
                    )}

                    {/* Gmail Web Dispatch button if email available */}
                    {candEmail && (
                      <a
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(candEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage + '\n\n🚀 Start Technical Assessment Session:\n' + inviteSuccessInfo.url)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setGmailDeliveredNotice(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: '#ea4335', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none', boxShadow: '0 2px 8px rgba(234,67,53,0.25)' }}
                      >
                        <Mail size={13} /> Send via Gmail App ↗
                      </a>
                    )}

                    {/* Copy SMS / WhatsApp Message */}
                    <button
                      type="button"
                      onClick={() => {
                        const text = inviteSuccessInfo.smsResult?.formattedText || `Hello ${candName}! Here is your assessment link for ${selectedInterviewForInvite.title}: ${inviteSuccessInfo.url}`;
                        navigator.clipboard.writeText(text);
                        setInviteSuccessInfo(prev => prev ? { ...prev, copiedSms: true } : null);
                        setTimeout(() => setInviteSuccessInfo(prev => prev ? { ...prev, copiedSms: false } : null), 2500);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {inviteSuccessInfo.copiedSms ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      {inviteSuccessInfo.copiedSms ? 'Message Copied!' : 'Copy Mobile Message'}
                    </button>

                    {inviteSuccessInfo.previewUrl && (
                      <a
                        href={inviteSuccessInfo.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: '#3b82f6', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}
                      >
                        <FileText size={13} /> View Sandbox Test Inbox ↗
                      </a>
                    )}
                  </div>

                  {/* Direct Link Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', marginTop: 4 }}>
                    <input type="text" readOnly value={inviteSuccessInfo.url} style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.78rem', fontFamily: 'monospace', outline: 'none' }} />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteSuccessInfo.url);
                        setInviteSuccessInfo(prev => prev ? { ...prev, copied: true } : null);
                        setTimeout(() => setInviteSuccessInfo(prev => prev ? { ...prev, copied: false } : null), 2500);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {inviteSuccessInfo.copied ? <Check size={12} /> : <Copy size={12} />} {inviteSuccessInfo.copied ? 'Copied' : 'Copy'}
                    </button>
                    <a
                      href={inviteSuccessInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }}
                    >
                      Open Link ↗
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div style={s({ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 })}>
              <button onClick={closeInviteModal} style={s({ padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' })}>Close</button>
              <button
                onClick={handleSendInviteSubmit}
                disabled={sendingInvite}
                style={s({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 10, border: 'none', background: sendingInvite ? 'var(--border)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontSize: '0.82rem', fontWeight: 800, cursor: sendingInvite ? 'not-allowed' : 'pointer' })}
              >
                {sendingInvite ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                {sendingInvite ? 'Generating Invite Link...' : 'Generate & Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TEMPLATE MODAL */}
      {showModal && (
        <div style={s({ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' })}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={s({ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' })}>

            <div style={s({ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', flexShrink: 0 })}>
              <div>
                <h3 style={s({ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 })}>{editingId ? 'Edit Template' : 'New Interview Template'}</h3>
                <p style={s({ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0' })}>Configure title, duration and add questions.</p>
              </div>
              <button onClick={closeModal} style={s({ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex' })}><X size={18} /></button>
            </div>

            {modalError && <div style={s({ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 })}><AlertCircle size={14} /> {modalError}</div>}

            <div style={s({ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 })}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div><Label>Template Title *</Label><FieldInput value={title} onChange={setTitle} placeholder="e.g. Senior Engineer Interview" /></div>
                <div><Label>Duration</Label><FieldSelect value={durationMinutes} onChange={(v: string) => setDurationMinutes(Number(v))}>{[15,30,45,60,90,120].map(m => <option key={m} value={m}>{m} mins</option>)}</FieldSelect></div>
              </div>
              <div><Label>Description (optional)</Label><FieldInput value={description} onChange={setDescription} placeholder="Role context for recruiters..." /></div>

              <div style={s({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 })}>
                <h4 style={s({ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 })}>Questions <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>({questions.length})</span></h4>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addManual} style={s({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' })}><Plus size={13} /> Custom Q</button>
                  <button onClick={() => setShowBank(v => !v)} style={s({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, border: 'none', background: showBank ? '#1e40af' : '#2563eb', color: '#fff', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' })}><BookOpen size={13} /> {showBank ? 'Close Bank' : 'Question Bank'}</button>
                </div>
              </div>

              {showBank && (
                <div style={s({ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 })}>
                  <div style={{ display: 'flex', gap: 4, background: 'var(--bg-primary)', padding: 4, borderRadius: 10 }}>
                    {(['LEETCODE', 'BEHAVIORAL'] as const).map(tab => (
                      <button key={tab} onClick={() => setBankTab(tab)} style={s({ flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: bankTab === tab ? '#2563eb' : 'transparent', color: bankTab === tab ? '#fff' : 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' })}>
                        {tab === 'LEETCODE' ? 'Algorithms (LeetCode)' : 'Behavioral / Design'}
                      </button>
                    ))}
                  </div>

                  {bankTab === 'LEETCODE' && (
                    <>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as any, alignItems: 'center' }}>
                        <FieldSelect value={lcDiff} onChange={(v: any) => setLcDiff(v)} style={{ fontSize: '0.76rem', padding: '6px 10px' }}>
                          <option value="ALL">All Levels</option><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option>
                        </FieldSelect>
                        <div style={{ display: 'flex', flex: 1, minWidth: 160, position: 'relative' }}>
                          <Search style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: 'var(--text-secondary)' }} />
                          <input type="text" placeholder="Search problems..." value={lcSearch} onChange={e => setLcSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchLC()}
                            style={s({ width: '100%', paddingLeft: 26, paddingRight: 10, paddingTop: 6, paddingBottom: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.76rem', outline: 'none' })} />
                        </div>
                        <button onClick={() => fetchLC()} style={s({ padding: '6px 12px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' })}>Search</button>
                        <div style={{ height: 20, width: 1, background: 'var(--border)' }} />
                        <FieldSelect value={autoSelectDiff} onChange={(v: any) => setAutoSelectDiff(v)} style={{ fontSize: '0.76rem', padding: '6px 10px' }}>
                          <option value="MIXED">Auto: Mixed</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                        </FieldSelect>
                        <button onClick={autoSelect} disabled={autoSelecting} style={s({ padding: '6px 12px', borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', fontSize: '0.76rem', fontWeight: 800, cursor: autoSelecting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 })}>
                          <Zap size={11} /> {autoSelecting ? 'Picking...' : 'Auto-Pick'}
                        </button>
                      </div>
                      {lcError && <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: 0, fontWeight: 600 }}>{lcError}</p>}
                      <div style={s({ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto', paddingRight: 4 })}>
                        {lcLoading ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '20px 0' }}>Loading {lcDiff === 'ALL' ? '3000+' : lcDiff} problems...</p>
                          : lcProblems.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '20px 0' }}>No problems found</p>
                          : lcProblems.map(p => {
                            const added = questions.some(q => q.leetcodeId === parseInt(p.questionFrontendId || p.id));
                            const dc = DIFF_COLOR[(p.difficulty || '').toUpperCase()] || '#94a3b8';
                            return (
                              <div key={p.questionFrontendId || p.id} style={s({ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)' })}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', minWidth: 36, flexShrink: 0 }}>#{p.questionFrontendId || p.id}</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as any }}>{p.title}</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: dc, flexShrink: 0 }}>{p.difficulty}</span>
                                <button onClick={() => addLC(p)} disabled={added} style={s({ padding: '3px 10px', borderRadius: 6, border: 'none', background: added ? 'var(--border)' : '#2563eb', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: added ? 'default' : 'pointer', flexShrink: 0 })}>{added ? 'Added' : '+ Add'}</button>
                              </div>
                            );
                          })}
                      </div>
                      {lcTotal > 0 && !lcLoading && <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>{lcTotal.toLocaleString()} problems loaded</p>}
                    </>
                  )}

                  {bankTab === 'BEHAVIORAL' && (
                    <div style={s({ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto', paddingRight: 4 })}>
                      {bhLoading ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '20px 0' }}>Loading...</p>
                        : behavProblems.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '20px 0' }}>No behavioral questions found</p>
                        : behavProblems.map((p, i) => {
                          const added = questions.some(q => q.title === p.title);
                          const tc = TYPE_COLOR[p.type] || '#f59e0b';
                          return (
                            <div key={i} style={s({ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)' })}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 5, background: `${tc}15`, color: tc, flexShrink: 0 }}>{p.type || 'BEHAVIORAL'}</span>
                              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as any }}>{p.title}</span>
                              <button onClick={() => addBehavioral(p)} disabled={added} style={s({ padding: '3px 10px', borderRadius: 6, border: 'none', background: added ? 'var(--border)' : '#2563eb', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: added ? 'default' : 'pointer', flexShrink: 0 })}>{added ? 'Added' : '+ Add'}</button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {questions.length === 0 ? (
                  <div style={s({ textAlign: 'center', padding: '28px 20px', border: '1.5px dashed var(--border)', borderRadius: 12, color: 'var(--text-secondary)' })}>
                    <FileText size={28} style={{ opacity: 0.4, display: 'block', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '0.82rem', margin: 0 }}>No questions yet. Click <strong>Custom Q</strong> or <strong>Question Bank</strong> above.</p>
                  </div>
                ) : questions.map((q, idx) => {
                  const idKey = q._tempId || String(idx);
                  const isExp = !!expandedQ[idKey];
                  const dc = DIFF_COLOR[q.difficulty] || '#94a3b8';
                  const tc = TYPE_COLOR[q.type] || '#94a3b8';
                  return (
                    <div key={idKey} style={s({ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' })}>
                      <div style={s({ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px' })}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#2563eb', background: 'rgba(37,99,235,0.1)', padding: '2px 7px', borderRadius: 5, flexShrink: 0 }}>Q{idx + 1}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: tc, background: `${tc}15`, padding: '2px 7px', borderRadius: 5, flexShrink: 0 }}>{q.type || 'HR'}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: dc, flexShrink: 0 }}>{q.difficulty}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as any }}>{q.title || q.text?.slice(0, 60) || 'Untitled question'}</span>
                        <button onClick={() => toggleQ(idKey)} style={s({ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 })}>
                          {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {isExp ? 'Less' : 'Edit'}
                        </button>
                        <button onClick={() => removeQ(idx)} style={s({ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 })}><Trash2 size={14} /></button>
                      </div>

                      {isExp && (
                        <div style={s({ borderTop: '1px solid var(--border)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-card)' })}>
                          <div><Label>Title</Label><FieldInput value={q.title || ''} onChange={(v: string) => updateQ(idx, 'title', v)} placeholder="Question title..." /></div>
                          <div><Label>Problem Statement</Label><FieldInput rows={5} value={q.text || ''} onChange={(v: string) => updateQ(idx, 'text', v)} placeholder="Full problem description..." style={{ fontFamily: 'monospace', fontSize: '0.82rem' }} /></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={s({ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 })}>
              <button onClick={closeModal} style={s({ padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' })}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={s({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 10, border: 'none', background: saving ? 'var(--border)' : '#2563eb', color: '#fff', fontSize: '0.82rem', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' })}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : editingId ? 'Save Changes' : 'Create Template'}
              </button>
            </div>

          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}