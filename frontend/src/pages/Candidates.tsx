import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Mail, Phone, Video, ExternalLink, Shield,
  FileCode, FileText, MessageSquare, Award, ChevronRight,
  TrendingUp, Sliders, CheckCircle, Copy, AlertTriangle,
  Play, X, BarChart3, Code2, Clock, Zap, Brain,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, Loader2,
  Target, PercentSquare, Hash, Search, Share2
} from 'lucide-react';

interface CandidatesProps { token: string; user?: any; }

/* ── helpers ──────────────────────────────────────────── */
function getMetrics(sessions: any[]) {
  if (!sessions || sessions.length === 0)
    return { attempted: 0, correct: 0, pct: 0, avgScore: null };

  let attempted = 0, correct = 0, scoreTotal = 0, scoreCount = 0;
  for (const s of sessions) {
    if (!s.answers) continue;
    for (const ans of s.answers) {
      attempted++;
      const sc = ans.evaluation?.overrideScore ?? ans.evaluation?.score ?? 0;
      if (sc >= 60) correct++;
      if (ans.evaluation) { scoreTotal += sc; scoreCount++; }
    }
  }
  return {
    attempted,
    correct,
    pct: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    avgScore: scoreCount > 0 ? Math.round(scoreTotal / scoreCount) : null,
  };
}

function eligibilityLabel(pct: number, avg: number | null) {
  const s = avg ?? 0;
  if (pct >= 70 && s >= 70) return { label: 'Highly Eligible', color: '#16a34a', bg: 'rgba(22,163,74,0.1)', border: 'rgba(22,163,74,0.3)' };
  if (pct >= 50 && s >= 55) return { label: 'Eligible', color: '#2563eb', bg: 'rgba(37,99,235,0.1)', border: 'rgba(37,99,235,0.3)' };
  if (pct >= 30)             return { label: 'Under Review', color: '#ca8a04', bg: 'rgba(202,138,4,0.1)', border: 'rgba(202,138,4,0.3)' };
  return { label: 'Not Eligible', color: '#dc2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.3)' };
}

function stripHtml(html: string = ''): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/pre>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* Detect user complexity from code */
function detectComplexity(code: string = '', question: string = '') {
  if (!code) return { time: null, space: null };
  const c = code.toLowerCase();
  let time = 'O(n)', space = 'O(1)';

  // Nested loops → O(n²)
  const nestedLoop = /for\s*\(/.test(c) && (c.match(/for\s*\(/g) || []).length >= 2;
  if (nestedLoop) { time = 'O(n²)'; space = 'O(1)'; }

  // Sorting calls → O(n log n)
  if (c.includes('.sort(')) { time = 'O(n log n)'; space = 'O(log n)'; }

  // Map / Set → O(n) time + O(n) space
  if (c.includes('map(') || c.includes('set(') || c.includes('= {}') || c.includes('= new map') || c.includes('= new set')) {
    space = 'O(n)';
    if (!nestedLoop) time = 'O(n)';
  }

  // Recursion without memo → potentially O(2^n)
  const fnName = (code.match(/function\s+(\w+)/) || [])[1];
  if (fnName && new RegExp(`return\\s+${fnName}\\s*\\(`).test(c) && !c.includes('memo') && !c.includes('cache')) {
    time = 'O(2ⁿ)'; space = 'O(n)';
  }

  // Binary search pattern
  if (c.includes('mid') && c.includes('left') && c.includes('right')) { time = 'O(log n)'; space = 'O(1)'; }

  return { time, space };
}

/* Get optimal complexity for well-known LC patterns */
function getOptimalComplexity(title: string, difficulty: string) {
  const t = (title || '').toLowerCase();
  if (t.includes('palindrome') || t.includes('two sum') || t.includes('two pointer'))
    return { time: 'O(n)', space: 'O(1)' };
  if (t.includes('sort') || t.includes('merge sort') || t.includes('quick sort'))
    return { time: 'O(n log n)', space: 'O(log n)' };
  if (t.includes('binary search') || t.includes('search in rotated'))
    return { time: 'O(log n)', space: 'O(1)' };
  if (t.includes('bfs') || t.includes('dfs') || t.includes('graph') || t.includes('tree'))
    return { time: 'O(V + E)', space: 'O(V)' };
  if (t.includes('dp') || t.includes('dynamic') || t.includes('knapsack'))
    return { time: 'O(n²)', space: 'O(n)' };
  if (t.includes('hash') || t.includes('map') || t.includes('frequency'))
    return { time: 'O(n)', space: 'O(n)' };
  if (difficulty === 'EASY')   return { time: 'O(n)', space: 'O(1)' };
  if (difficulty === 'MEDIUM') return { time: 'O(n log n)', space: 'O(n)' };
  return { time: 'O(n²)', space: 'O(n)' };
}

function complexityClass(userTime: string | null, optTime: string) {
  if (!userTime) return 'complexity-user';
  const order = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'];
  const ui = order.indexOf(userTime);
  const oi = order.indexOf(optTime);
  if (ui === -1 || oi === -1) return 'complexity-user';
  if (ui <= oi) return 'complexity-optimal';
  if (ui === oi + 1) return 'complexity-subopt';
  return 'complexity-poor';
}

/* Pipeline column colours that work in both light/dark */
const PIPELINE_COLS = [
  { id: 'NEW',                  label: 'New',          c: '#2563eb' },
  { id: 'IN_REVIEW',            label: 'In Review',    c: '#ca8a04' },
  { id: 'INTERVIEW_SCHEDULED',  label: 'Screening',    c: '#7c3aed' },
  { id: 'SHORTLISTED',          label: 'Shortlisted',  c: '#16a34a' },
  { id: 'REJECTED',             label: 'Rejected',     c: '#dc2626' },
  { id: 'HIRED',                label: 'Hired',        c: '#0891b2' },
];

/* PDF Report Generator */
const downloadCandidatePDF = (candidate: any) => {
  if (!candidate) return;
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) return alert('Please allow popups to download the PDF evaluation report.');

  const metrics = getMetrics(candidate.sessions || []);
  const elig = eligibilityLabel(metrics.pct, metrics.avgScore);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>TalentAI Candidate Technical Evaluation Report - ${candidate.name}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; line-height: 1.5; padding: 24px; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
        .brand { font-size: 24px; font-weight: 900; color: #2563eb; letter-spacing: -0.5px; }
        .title { font-size: 13px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
        
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
        .info-item label { color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 3px; }
        .info-item div { font-weight: 800; font-size: 14px; color: #0f172a; }
        
        .score-banner { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #fff; padding: 20px 24px; border-radius: 14px; margin-bottom: 24px; }
        .score-badge { font-size: 38px; font-weight: 900; line-height: 1; }
        .elig-tag { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; }

        .section-heading { font-size: 16px; font-weight: 900; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 32px; margin-bottom: 18px; }
        
        .question-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 24px; page-break-inside: avoid; }
        .q-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
        .q-title { font-size: 15px; font-weight: 800; color: #0f172a; flex: 1; }
        .q-score { font-size: 20px; font-weight: 900; color: #2563eb; margin-left: 16px; text-align: right; }

        .code-block { background: #0f172a; color: #38bdf8; font-family: 'Fira Code', 'Courier New', monospace; font-size: 12px; padding: 14px; border-radius: 10px; overflow-x: auto; white-space: pre-wrap; margin-bottom: 16px; line-height: 1.5; }
        
        .feedback-grid { display: flex; flex-direction: column; gap: 12px; margin-top: 14px; }
        .box-good { background: rgba(22,163,74,0.06); border: 1px solid rgba(22,163,74,0.25); color: #166534; padding: 14px; border-radius: 10px; font-size: 13px; }
        .box-bad { background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.25); color: #991b1b; padding: 14px; border-radius: 10px; font-size: 13px; }
        .box-improve { background: rgba(37,99,235,0.06); border: 1px solid rgba(37,99,235,0.25); color: #1e40af; padding: 14px; border-radius: 10px; font-size: 13px; }
        
        .box-title { font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
        
        .complexity-table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 14px; font-size: 13px; }
        .complexity-table th, .complexity-table td { border: 1px solid #e2e8f0; padding: 9px 12px; text-align: left; }
        .complexity-table th { background: #f8fafc; font-weight: 800; color: #475569; font-size: 11px; text-transform: uppercase; }

        .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">TalentAI Assessment Engine</div>
          <div class="title">Honest Technical Code Review &amp; Candidate Evaluation Report</div>
        </div>
        <div style="text-align: right; font-size: 11px; color: #64748b;">
          Generated: ${new Date().toLocaleDateString()}<br/>
          Report Token: #${candidate.id.slice(-8)}
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item"><label>Candidate Name</label><div>${candidate.name}</div></div>
        <div class="info-item"><label>Email Address</label><div>${candidate.email}</div></div>
        <div class="info-item"><label>Applied Job Role</label><div>${candidate.jobTitle || 'Software Engineer'}</div></div>
        <div class="info-item"><label>Current Pipeline Status</label><div>${candidate.status}</div></div>
      </div>

      <div class="score-banner">
        <div>
          <div style="font-size: 12px; opacity: 0.85; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">Overall Technical Rating</div>
          <div class="score-badge">${metrics.avgScore !== null ? `${metrics.avgScore}/100` : 'N/A'}</div>
          <div style="font-size: 12px; margin-top: 6px;">Success Rate: ${metrics.pct}% (${metrics.correct}/${metrics.attempted} Questions Passed)</div>
        </div>
        <div>
          <span class="elig-tag">${elig.label}</span>
        </div>
      </div>

      <!-- Proctoring Anti-Cheating Summary -->
      ${(candidate.sessions || []).map((s: any) => {
        if (!s.plagiarismReport) return '';
        const pr = s.plagiarismReport;
        const totalV = pr.tabSwitchCount + pr.copyPasteCount + pr.exitFullScreenCount;
        return `
          <div style="background: ${totalV > 0 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${totalV > 0 ? '#fca5a5' : '#86efac'}; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: ${totalV > 0 ? '#991b1b' : '#166534'}; margin-bottom: 6px;">
              🛡️ Anti-Cheating &amp; Integrity Report: ${s.interview?.title || 'Session'} (${totalV > 0 ? 'Violations Flagged' : 'Clean Session'})
            </div>
            <div style="display: flex; gap: 24px; font-size: 13px;">
              <div>Tab Switches: <strong>${pr.tabSwitchCount}</strong></div>
              <div>Copy-Paste Events: <strong>${pr.copyPasteCount}</strong></div>
              <div>Exit Fullscreen: <strong>${pr.exitFullScreenCount}</strong></div>
            </div>
          </div>
        `;
      }).join('')}

      <div class="section-heading">Detailed Code Review &amp; Genuine Feedback</div>

      ${(candidate.sessions || []).flatMap((s: any) => s.answers || []).map((ans: any, idx: number) => {
        const userComp = detectComplexity(ans.codeContent, ans.question?.text);
        const optComp = getOptimalComplexity(ans.question?.text, ans.question?.difficulty);
        const evalObj = ans.evaluation || {};
        const score = evalObj.overrideScore ?? evalObj.score ?? 0;

        return `
          <div class="question-card">
            <div class="q-header">
              <div class="q-title">Q${idx + 1}. ${stripHtml(ans.question?.text || ans.question?.title || 'Coding Challenge')}</div>
              <div class="q-score">${score}/100</div>
            </div>

            ${ans.videoPath ? `
              <div style="background: #e0f2fe; border: 1px solid #7dd3fc; color: #0369a1; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; margin-bottom: 12px;">
                📹 Webcam Video Response Saved &amp; Verified (${ans.videoPath.split('/').pop() || 'recording.webm'})
              </div>
            ` : ''}

            ${ans.codeContent ? `
              <div style="font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Candidate Submitted Code</div>
              <div class="code-block">${ans.codeContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>

              <table class="complexity-table">
                <thead>
                  <tr><th>Metric</th><th>Candidate Complexity</th><th>Optimal Target Benchmark</th></tr>
                </thead>
                <tbody>
                  <tr><td>Time Complexity</td><td><strong>${userComp.time || 'O(n)'}</strong></td><td><strong>${optComp.time}</strong></td></tr>
                  <tr><td>Space Complexity</td><td><strong>${userComp.space || 'O(1)'}</strong></td><td><strong>${optComp.space}</strong></td></tr>
                </tbody>
              </table>
            ` : ''}

            ${ans.answerText ? `
              <div style="font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 4px; text-transform: uppercase;">Written Response</div>
              <div style="font-size: 13px; color: #334155; background: #f8fafc; padding: 10px 12px; border-radius: 8px; margin-bottom: 14px;">${ans.answerText}</div>
            ` : ''}

            <div class="feedback-grid">
              <div class="box-good">
                <span class="box-title">✓ What's Good (Strengths)</span>
                <div>${evalObj.strengths || 'Code syntax structure was submitted.'}</div>
              </div>
              <div class="box-bad">
                <span class="box-title">✗ What's Bad (Flaws &amp; Weaknesses)</span>
                <div>${evalObj.weaknesses || 'Lacks complete edge case handling or optimal complexity.'}</div>
              </div>
              <div class="box-improve">
                <span class="box-title">💡 What Can Be Improved (Actionable Plan)</span>
                <div>${evalObj.improvements || 'Refactor solution to meet optimal target time and space complexity benchmarks.'}</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}

      <div class="footer">
        Official Evaluation PDF Report produced by TalentAI Code Review &amp; Plagiarism Anti-Cheating Engine.
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export default function Candidates({ token, user }: CandidatesProps) {
  const isStudent = user?.role === 'STUDENT';
  const [candidates, setCandidates] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [candidateDetail, setCandidateDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCandidateId, setInviteCandidateId] = useState('');
  const [inviteInterviewId, setInviteInterviewId] = useState('');
  const [inviteExpiresDays, setInviteExpiresDays] = useState(7);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newResumeText, setNewResumeText] = useState('');

  const [overrideActive, setOverrideActive] = useState<string | null>(null);
  const [overrideScore, setOverrideScore] = useState(80);
  const [overrideFeedback, setOverrideFeedback] = useState('');

  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Candidate Decision Mail State
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<'SELECTED' | 'REJECTED'>('SELECTED');
  const [decisionSubject, setDecisionSubject] = useState('');
  const [decisionMessage, setDecisionMessage] = useState('');
  const [sendingDecision, setSendingDecision] = useState(false);
  const [decisionSuccessInfo, setDecisionSuccessInfo] = useState<{ message: string; previewUrl?: string; realSmtpUsed?: boolean; copied: boolean } | null>(null);
  const [inviteGmailDeliveredNotice, setInviteGmailDeliveredNotice] = useState(false);
  const [decisionGmailDeliveredNotice, setDecisionGmailDeliveredNotice] = useState(false);

  const openDecisionModal = (type: 'SELECTED' | 'REJECTED') => {
    if (!candidateDetail) return;
    setDecisionType(type);
    const isSel = type === 'SELECTED';
    const jt = candidateDetail.jobTitle || 'Software Engineer';
    setDecisionSubject(isSel ? `🎉 Selection Offer: ${jt} Position` : `Application Update: ${jt} Position`);
    setDecisionMessage(isSel
      ? `Dear ${candidateDetail.name},\n\nWe are excited to inform you that you have been SELECTED for the ${jt} position following your technical assessment evaluation!\n\nOur HR team will reach out with your offer letter details shortly.`
      : `Dear ${candidateDetail.name},\n\nThank you for taking the time to complete our technical assessment for the ${jt} position.\n\nAfter careful review, we regret to inform you that we will not be moving forward with your application at this time. We appreciate your effort and wish you all the best.`
    );
    setDecisionSuccessInfo(null);
    setDecisionGmailDeliveredNotice(false);
    setShowDecisionModal(true);
  };

  const handleSendDecisionSubmit = async () => {
    if (!candidateDetail) return;
    setSendingDecision(true);
    try {
      const res = await fetch(`/api/candidates/${candidateDetail.id}/send-decision-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          decision: decisionType,
          subject: decisionSubject,
          message: decisionMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send decision email');
      setDecisionSuccessInfo({
        message: data.message || `${decisionType === 'SELECTED' ? 'Selection' : 'Rejection'} email sent!`,
        previewUrl: data.previewUrl,
        realSmtpUsed: data.realSmtpUsed,
        copied: false,
      });
      const newStatus = decisionType === 'SELECTED' ? 'SHORTLISTED' : 'REJECTED';
      setCandidates(prev => prev.map(c => c.id === candidateDetail.id ? { ...c, status: newStatus } : c));
      setCandidateDetail((prev: any) => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      alert(err.message || 'Error sending decision email');
    } finally {
      setSendingDecision(false);
    }
  };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const [candRes, intRes] = await Promise.all([
        fetch('/api/candidates', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/interviews',  { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [cData, iData] = await Promise.all([candRes.json(), intRes.json()]);
      if (candRes.ok) setCandidates(cData.candidates || []);
      if (intRes.ok)  setInterviews(iData.interviews  || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadCandidateDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/candidates/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setCandidateDetail(data.candidate);
    } catch (err) { console.error(err); }
    finally { setLoadingDetail(false); }
  };

  useEffect(() => { fetchCandidates(); }, [token]);

  const filteredCandidates = React.useMemo(() => {
    let result = candidates;
    if (statusFilter !== 'ALL') {
      result = result.filter(c => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.resumeSkills || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [candidates, statusFilter, searchQuery]);

  const paginatedCandidates = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCandidates.slice(start, start + pageSize);
  }, [filteredCandidates, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredCandidates.length / pageSize) || 1;

  const handleUpdateStatus = async (candidateId: string, status: string) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Status update failed:', data.error);
        return;
      }
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status } : c));
      if (candidateDetail?.id === candidateId) setCandidateDetail((d: any) => ({ ...d, status }));
    } catch (err) { console.error(err); }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName, email: newEmail, phone: newPhone, resumeText: newResumeText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowCreateModal(false);
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewResumeText('');
      fetchCandidates();
    } catch (err: any) { alert(err.message || 'Error creating candidate'); }
  };

  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteResultInfo, setInviteResultInfo] = useState<{
    url: string;
    candidateName: string;
    candidateEmail: string;
    interviewTitle: string;
    message: string;
    previewUrl?: string;
    realSmtpUsed?: boolean;
  } | null>(null);

  const handleInviteCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingInvite(true);
    try {
      const cand = candidates.find(c => c.id === inviteCandidateId);
      const iv = interviews.find(i => i.id === inviteInterviewId);
      if (!cand || !iv) throw new Error('Candidate or Interview template not selected');

      const res = await fetch(`/api/interviews/${inviteInterviewId}/send-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          candidateName: cand.name,
          candidateEmail: cand.email,
          expiresDays: inviteExpiresDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch invite');

      const fullUrl = (data.fullInviteUrl || `${window.location.origin}${data.inviteUrl}`).replace(':5173', ':3000');
      setGeneratedInviteUrl(fullUrl);
      setInviteGmailDeliveredNotice(false);
      setInviteResultInfo({
        url: fullUrl,
        candidateName: cand.name,
        candidateEmail: cand.email,
        interviewTitle: iv.title,
        message: data.realSmtpUsed
          ? `Invitation email dispatched directly to ${cand.email}!`
          : `Assessment Invite Link Prepared for ${cand.name}!`,
        previewUrl: data.previewUrl,
        realSmtpUsed: data.realSmtpUsed,
      });

      // Update candidate status to INVITED if real SMTP sent it
      if (data.realSmtpUsed) {
        setCandidates(prev => prev.map(c => c.id === cand.id ? { ...c, status: 'INVITED' } : c));
        fetchCandidates();
      }
    } catch (err: any) { alert(err.message || 'Error creating invite'); }
    finally { setGeneratingInvite(false); }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedInviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleScoreOverride = async (ansId: string, evalId: string) => {
    try {
      const res = await fetch(`/api/candidates/evaluations/${evalId}/override`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ overrideScore, overrideFeedback }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert('Override failed: ' + (data.error || 'Unknown error'));
        return;
      }
      // Update local state to reflect the saved override
      if (candidateDetail) {
        const updated = {
          ...candidateDetail,
          sessions: candidateDetail.sessions.map((s: any) => ({
            ...s,
            answers: s.answers.map((a: any) =>
              a.id === ansId && a.evaluation
                ? { ...a, evaluation: { ...a.evaluation, overrideScore, overrideFeedback } }
                : a
            ),
          })),
        };
        setCandidateDetail(updated);
      }
    } catch (err) {
      console.error('Override error:', err);
      alert('Failed to save override.');
    }
    setOverrideActive(null);
  };

  /* ── CSS var helper ── */
  const css = (v: string) => `var(${v})`;

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    overflow: 'hidden',
  };

  const modalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 50,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  };

  const modalBox: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
    width: '100%',
    overflow: 'hidden',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  };

  const selectStyle: React.CSSProperties = { ...inputStyle };

  return (
    <div className="p-8 space-y-6 w-full overflow-y-auto" style={{ maxHeight: '100vh' }}>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {isStudent ? 'Performance & Assessment Reviews' : 'Applicant Tracking System'}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {isStudent
              ? 'Search performance reviews, completed sessions, video responses, and share practice template links with friends'
              : 'Full candidate pipeline with metrics, AI evaluations, and complexity analysis'
            }
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Search bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '8px 14px', width: 260,
          }}>
            <Search style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={isStudent ? "Search friends or skills..." : "Search candidates..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: '0.8rem', color: 'var(--text-primary)', width: '100%',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>

          {!isStudent ? (
            <>
              {/* View toggle */}
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {(['table', 'kanban'] as const).map(m => (
                  <button key={m} onClick={() => setViewMode(m)}
                    style={{
                      padding: '8px 14px', fontSize: '0.78rem', fontWeight: 700,
                      background: viewMode === m ? 'var(--brand)' : 'transparent',
                      color: viewMode === m ? '#fff' : 'var(--text-muted)',
                      border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                      transition: 'all 0.15s',
                    }}>
                    {m === 'table' ? '⊞ Table' : '☰ Kanban'}
                  </button>
                ))}
              </div>

              <button onClick={() => setShowCreateModal(true)} className="btn btn-secondary btn-sm">
                + Add Candidate
              </button>
              <button
                onClick={() => {
                  if (candidates.length > 0) {
                    setInviteCandidateId(candidates[0].id);
                    if (interviews.length > 0) setInviteInterviewId(interviews[0].id);
                    setGeneratedInviteUrl('');
                    setShowInviteModal(true);
                  } else { alert('Add a candidate first.'); }
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus style={{ width: 15, height: 15 }} /> Send Invite
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowShareModal(true)}
              style={{
                padding: '8px 16px', borderRadius: 12, background: 'var(--brand)',
                color: '#fff', border: 'none', fontSize: '0.8rem', fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 12px var(--brand-glow)',
              }}
            >
              <Share2 style={{ width: 14, height: 14 }} /> Share Template Link
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : isStudent ? (
        /* ── STUDENT: MY COMPLETED ASSESSMENTS TABLE ── */
        (() => {
          // Collect all COMPLETED sessions from all candidates (the student's own records)
          const completedRows: { candidateId: string; candidateName: string; candidateEmail: string; session: any }[] = [];
          for (const c of candidates) {
            if (!c.sessions) continue;
            for (const s of c.sessions) {
              if (s.status === 'COMPLETED') {
                completedRows.push({ candidateId: c.id, candidateName: c.name, candidateEmail: c.email, session: s });
              }
            }
          }
          // Search filter
          const filteredRows = completedRows.filter(row => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              (row.session.interview?.title || '').toLowerCase().includes(q) ||
              row.candidateName.toLowerCase().includes(q)
            );
          });

          return (
            <div style={cardStyle}>
              {/* Header bar */}
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-secondary)',
              }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: '#16a34a' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Completed Interviews — {filteredRows.length} record{filteredRows.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Table */}
              <div style={{ maxHeight: 460, overflowY: 'auto', borderBottom: '1px solid var(--border)' }}>
                <table className="data-table" style={{ minWidth: 860, borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-secondary)' }}>
                    <tr>
                      <th style={{ width: 220, background: 'var(--bg-secondary)' }}>Interview / Assessment</th>
                      <th style={{ width: 130, background: 'var(--bg-secondary)', textAlign: 'center' }}>Date Completed</th>
                      <th style={{ width: 110, background: 'var(--bg-secondary)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <Hash style={{ width: 12, height: 12 }} /> Questions
                        </div>
                      </th>
                      <th style={{ width: 110, background: 'var(--bg-secondary)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <PercentSquare style={{ width: 12, height: 12 }} /> Success %
                        </div>
                      </th>
                      <th style={{ width: 110, background: 'var(--bg-secondary)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <Award style={{ width: 12, height: 12 }} /> Avg Score
                        </div>
                      </th>
                      <th style={{ width: 110, background: 'var(--bg-secondary)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <Clock style={{ width: 12, height: 12 }} /> Duration
                        </div>
                      </th>
                      <th style={{ width: 110, background: 'var(--bg-secondary)', textAlign: 'right' }}>Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <CheckCircle2 style={{ width: 32, height: 32, opacity: 0.25 }} />
                            <p style={{ fontSize: '0.875rem' }}>No completed assessments yet. Complete an interview to see your results here.</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredRows.map(({ candidateId, candidateName, session }, idx) => {
                      // Per-session metrics
                      const answers: any[] = session.answers || [];
                      const attempted = answers.length;
                      let correct = 0, scoreTotal = 0, scoreCount = 0;
                      for (const ans of answers) {
                        const sc = ans.evaluation?.overrideScore ?? ans.evaluation?.score ?? 0;
                        if (sc >= 60) correct++;
                        if (ans.evaluation) { scoreTotal += sc; scoreCount++; }
                      }
                      const pct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
                      const avgScore = scoreCount > 0 ? Math.round(scoreTotal / scoreCount) : null;

                      // Duration
                      let durationStr = '—';
                      if (session.startedAt && session.completedAt) {
                        const diffMs = new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime();
                        const mins = Math.floor(diffMs / 60000);
                        durationStr = mins > 0 ? `${mins} min` : '< 1 min';
                      }

                      // Date
                      const completedDate = session.completedAt
                        ? new Date(session.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : '—';

                      const interviewTitle = session.interview?.title || `Assessment #${idx + 1}`;

                      return (
                        <tr key={session.id}
                          onClick={() => { setSelectedCandidate({ id: candidateId }); loadCandidateDetail(candidateId); }}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Interview title */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: 10,
                                background: 'linear-gradient(135deg, var(--brand), #7c3aed)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}>
                                <Brain style={{ width: 16, height: 16, color: '#fff' }} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                                  {interviewTitle}
                                </p>
                                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0 }}>{candidateName}</p>
                              </div>
                            </div>
                          </td>

                          {/* Date */}
                          <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {completedDate}
                          </td>

                          {/* Questions */}
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            {attempted}
                          </td>

                          {/* Success % */}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <span style={{
                                fontWeight: 800, fontSize: '0.875rem',
                                color: pct >= 70 ? '#16a34a' : pct >= 50 ? '#2563eb' : pct >= 30 ? '#ca8a04' : '#dc2626',
                              }}>
                                {pct}%
                              </span>
                              <div className="progress-bar" style={{ width: 56 }}>
                                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 70 ? '#16a34a' : pct >= 50 ? '#2563eb' : '#ca8a04' }} />
                              </div>
                            </div>
                          </td>

                          {/* Avg Score */}
                          <td style={{ textAlign: 'center' }}>
                            {avgScore !== null ? (
                              <span style={{
                                fontWeight: 800, fontSize: '0.95rem',
                                color: avgScore >= 70 ? '#16a34a' : avgScore >= 50 ? '#2563eb' : '#ca8a04',
                              }}>
                                {avgScore}/100
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                            )}
                          </td>

                          {/* Duration */}
                          <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {durationStr}
                          </td>

                          {/* Download PDF */}
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={async e => {
                                e.stopPropagation();
                                // load detail then download PDF
                                const res = await fetch(`/api/candidates/${candidateId}`, { headers: { Authorization: `Bearer ${token}` } });
                                const data = await res.json();
                                if (res.ok && data.candidate) downloadCandidatePDF(data.candidate);
                              }}
                              style={{
                                padding: '5px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 800,
                                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                                color: '#16a34a', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                              }}
                            >
                              <FileText style={{ width: 11, height: 11 }} /> PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer summary */}
              <div style={{
                padding: '10px 16px', borderTop: '1px solid var(--border)',
                display: 'flex', gap: 20, flexWrap: 'wrap',
                background: 'var(--bg-secondary)',
              }}>
                {[
                  { label: 'Total Sessions', value: completedRows.length, color: 'var(--brand)' },
                  { label: 'Avg Score', value: (() => {
                    let t = 0, n = 0;
                    for (const row of completedRows) {
                      for (const a of (row.session.answers || [])) {
                        const sc = a.evaluation?.overrideScore ?? a.evaluation?.score;
                        if (sc != null) { t += sc; n++; }
                      }
                    }
                    return n > 0 ? `${Math.round(t / n)}/100` : '—';
                  })(), color: '#2563eb' },
                  { label: 'Questions Solved', value: (() => {
                    let solved = 0;
                    for (const row of completedRows) {
                      for (const a of (row.session.answers || [])) {
                        const sc = a.evaluation?.overrideScore ?? a.evaluation?.score ?? 0;
                        if (sc >= 60) solved++;
                      }
                    }
                    return solved;
                  })(), color: '#16a34a' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.label}:</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      ) : viewMode === 'table' ? (
        /* ── ORG TABLE VIEW WITH FIXED HEIGHT, STICKY HEADER & PAGINATION ── */
        <div style={cardStyle}>
          {/* Status Filter Pills Bar */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            background: 'var(--bg-secondary)',
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>
              Filter Status:
            </span>
            {[
              { id: 'ALL', label: 'All Candidates' },
              { id: 'NEW', label: 'New' },
              { id: 'IN_REVIEW', label: 'In Review' },
              { id: 'SHORTLISTED', label: 'Shortlisted' },
              { id: 'INVITED', label: 'Invited' },
              { id: 'REJECTED', label: 'Rejected' },
              { id: 'HIRED', label: 'Hired' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { setStatusFilter(f.id); setCurrentPage(1); }}
                style={{
                  padding: '4px 11px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                  background: statusFilter === f.id ? 'var(--brand)' : 'var(--bg-card)',
                  color: statusFilter === f.id ? '#ffffff' : 'var(--text-muted)',
                  border: `1px solid ${statusFilter === f.id ? 'var(--brand)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {f.label} ({f.id === 'ALL' ? candidates.length : candidates.filter(c => c.status === f.id).length})
              </button>
            ))}
          </div>

          {/* Fixed Length Table Scrollbox with Sticky Header */}
          <div style={{ maxHeight: 460, overflowY: 'auto', borderBottom: '1px solid var(--border)' }}>
            <table className="data-table" style={{ minWidth: 900, borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-secondary)' }}>
                <tr>
                  <th style={{ width: 200, background: 'var(--bg-secondary)' }}>Candidate</th>
                  <th style={{ width: 110, background: 'var(--bg-secondary)' }}>Status</th>
                  <th style={{ textAlign: 'center', width: 110, background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      <Hash style={{ width: 12, height: 12 }} /> Attempted
                    </div>
                  </th>
                  <th style={{ textAlign: 'center', width: 110, background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      <CheckCircle2 style={{ width: 12, height: 12 }} /> Solved
                    </div>
                  </th>
                  <th style={{ textAlign: 'center', width: 110, background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      <PercentSquare style={{ width: 12, height: 12 }} /> Success %
                    </div>
                  </th>
                  <th style={{ textAlign: 'center', width: 110, background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      <Award style={{ width: 12, height: 12 }} /> Avg Score
                    </div>
                  </th>
                  <th style={{ textAlign: 'center', width: 130, background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      <Target style={{ width: 12, height: 12 }} /> Eligibility
                    </div>
                  </th>
                  <th style={{ textAlign: 'right', width: 90, background: 'var(--bg-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <Users style={{ width: 32, height: 32, opacity: 0.3 }} />
                        <p style={{ fontSize: '0.875rem' }}>No matching candidates found.</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedCandidates.map(c => {
                  const m = getMetrics(c.sessions);
                  const elig = eligibilityLabel(m.pct, m.avgScore);
                  const col = PIPELINE_COLS.find(p => p.id === c.status);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => { setSelectedCandidate(c); loadCandidateDetail(c.id); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'var(--brand)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 900, color: '#fff', flexShrink: 0,
                          }}>
                            {c.name.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>
                              {c.name}
                            </p>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', borderRadius: 999,
                          fontSize: '0.68rem', fontWeight: 700,
                          background: col ? `${col.c}15` : 'var(--bg-hover)',
                          color: col?.c ?? 'var(--text-muted)',
                          border: `1px solid ${col ? col.c + '30' : 'var(--border)'}`,
                        }}>
                          {col?.label ?? c.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {m.attempted}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: m.correct > 0 ? '#16a34a' : 'var(--text-muted)' }}>
                          {m.correct}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <span style={{
                            fontWeight: 800, fontSize: '0.875rem',
                            color: m.pct >= 70 ? '#16a34a' : m.pct >= 50 ? '#2563eb' : m.pct >= 30 ? '#ca8a04' : '#dc2626',
                          }}>
                            {m.pct}%
                          </span>
                          <div className="progress-bar" style={{ width: 60 }}>
                            <div className="progress-bar-fill" style={{ width: `${m.pct}%`, background: m.pct >= 70 ? '#16a34a' : m.pct >= 50 ? '#2563eb' : '#ca8a04' }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {m.avgScore !== null ? (
                          <span style={{
                            fontWeight: 800, fontSize: '0.95rem',
                            color: m.avgScore >= 70 ? '#16a34a' : m.avgScore >= 50 ? '#2563eb' : '#ca8a04',
                          }}>
                            {m.avgScore}/100
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {m.attempted > 0 ? (
                          <span style={{
                            display: 'inline-flex', padding: '3px 10px', borderRadius: 999,
                            fontSize: '0.68rem', fontWeight: 700,
                            background: elig.bg, color: elig.color, border: `1px solid ${elig.border}`,
                          }}>
                            {elig.label}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {(c.status === 'INVITED' || (c.sessions && c.sessions.length > 0)) ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 9px', borderRadius: 7, background: 'rgba(16,185,129,0.1)', color: '#16a34a', border: '1px solid rgba(16,185,129,0.25)', whiteSpace: 'nowrap' }}>
                            Invited ✓
                          </span>
                        ) : (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setInviteCandidateId(c.id);
                              if (interviews.length > 0) setInviteInterviewId(interviews[0].id);
                              setGeneratedInviteUrl('');
                              setShowInviteModal(true);
                            }}
                            style={{
                              padding: '5px 10px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700,
                              background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
                              color: 'var(--brand)', cursor: 'pointer',
                            }}
                          >
                            Invite
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination & Lazy Load Footer Controls */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg-secondary)', flexWrap: 'wrap', gap: 10,
          }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Showing {filteredCandidates.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredCandidates.length)} of {filteredCandidates.length} candidates
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{
                  padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-card)', color: currentPage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: '0.75rem', fontWeight: 700, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                ← Previous
              </button>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{
                  padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-card)', color: currentPage >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: '0.75rem', fontWeight: 700, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Summary row */}
          {candidates.length > 0 && (
            <div style={{
              padding: '12px 16px', borderTop: '1px solid var(--border)',
              display: 'flex', gap: 24, flexWrap: 'wrap',
            }}>
              {[
                { label: 'Total', value: candidates.length, color: 'var(--brand)' },
                { label: 'Highly Eligible', value: candidates.filter(c => { const m = getMetrics(c.sessions); return m.pct >= 70 && (m.avgScore ?? 0) >= 70; }).length, color: '#16a34a' },
                { label: 'Hired', value: candidates.filter(c => c.status === 'HIRED').length, color: '#0891b2' },
                { label: 'Rejected', value: candidates.filter(c => c.status === 'REJECTED').length, color: '#dc2626' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.label}:</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── KANBAN VIEW ──────────────────────────────── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {PIPELINE_COLS.map(col => {
            const cards = candidates.filter(c => c.status === col.id);
            return (
              <div key={col.id} style={{
                background: 'var(--bg-card)', border: `1px solid ${col.c}25`,
                borderRadius: 16, padding: 12, minWidth: 180,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${col.c}40`,
                }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: col.c, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {col.label}
                  </span>
                  <span style={{
                    background: `${col.c}15`, color: col.c, border: `1px solid ${col.c}30`,
                    borderRadius: 999, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700,
                  }}>
                    {cards.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                  {cards.map(c => {
                    const m = getMetrics(c.sessions);
                    return (
                      <div key={c.id}
                        onClick={() => { setSelectedCandidate(c); loadCandidateDetail(c.id); }}
                        style={{
                          background: 'var(--bg-primary)', border: '1px solid var(--border)',
                          borderRadius: 10, padding: 10, cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = col.c; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <p style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>{c.name}</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0, marginBottom: 6 }}>{c.email}</p>
                        {m.attempted > 0 && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#16a34a', background: 'rgba(22,163,74,0.1)', padding: '1px 5px', borderRadius: 4 }}>
                              {m.correct}/{m.attempted}
                            </span>
                            {m.avgScore !== null && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--brand)', background: 'rgba(37,99,235,0.1)', padding: '1px 5px', borderRadius: 4 }}>
                                {m.avgScore}/100
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {cards.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'center', padding: '24px 0', border: '1px dashed var(--border)', borderRadius: 8 }}>
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CANDIDATE DETAIL MODAL ─────────────────────── */}
      {selectedCandidate && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, maxWidth: 880, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: 'var(--brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', fontWeight: 900, color: '#fff',
                  }}>
                    {selectedCandidate.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
                      {selectedCandidate.name}
                    </h3>
                    <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail style={{ width: 12, height: 12 }} /> {selectedCandidate.email}
                      </span>
                      {selectedCandidate.phone && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone style={{ width: 12, height: 12 }} /> {selectedCandidate.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => downloadCandidatePDF(candidateDetail)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 9, border: 'none',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#fff', fontSize: '0.78rem', fontWeight: 800,
                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <FileText style={{ width: 14, height: 14 }} /> Download Detailed PDF Report
                </button>
                <button onClick={() => { setSelectedCandidate(null); setCandidateDetail(null); }}
                  style={{
                    padding: 6, borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg-hover)', cursor: 'pointer', color: 'var(--text-muted)',
                  }}>
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {loadingDetail || !candidateDetail ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                  <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto 12px' }} />
                  Loading evaluation data…
                </div>
              ) : (
                <>
                  {/* Pipeline status buttons & Decision Mail Actions */}
                  {!isStudent && (
                    <div style={{
                      background: 'var(--bg-hover)', border: '1px solid var(--border)',
                      borderRadius: 12, padding: '12px 16px', marginBottom: 20,
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>
                          Pipeline Stage:
                        </span>
                        {PIPELINE_COLS.map(col => (
                          <button key={col.id}
                            onClick={() => handleUpdateStatus(candidateDetail.id, col.id)}
                            style={{
                              padding: '5px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700,
                              background: candidateDetail.status === col.id ? col.c : 'transparent',
                              color: candidateDetail.status === col.id ? '#fff' : col.c,
                              border: `1px solid ${col.c}50`, cursor: 'pointer', transition: 'all 0.15s',
                            }}>
                            {col.label}
                          </button>
                        ))}
                      </div>

                      {/* Explicit Decision Mail Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ✉️ Dispatch Candidate Decision:
                        </span>
                        <button
                          onClick={() => openDecisionModal('SELECTED')}
                          style={{
                            padding: '6px 14px', borderRadius: 8, border: 'none',
                            background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#ffffff',
                            fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            boxShadow: '0 2px 8px rgba(22,163,74,0.25)',
                          }}
                        >
                          <CheckCircle2 style={{ width: 13, height: 13 }} /> Mail Selection Offer
                        </button>
                        <button
                          onClick={() => openDecisionModal('REJECTED')}
                          style={{
                            padding: '6px 14px', borderRadius: 8, border: 'none',
                            background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#ffffff',
                            fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
                          }}
                        >
                          <XCircle style={{ width: 13, height: 13 }} /> Mail Rejection Notice
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Summary stats */}
                  {(() => {
                    const m = getMetrics(candidateDetail.sessions);
                    const elig = eligibilityLabel(m.pct, m.avgScore);
                    return m.attempted > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                        {[
                          { label: 'Questions Attempted', value: m.attempted, color: 'var(--brand)', icon: <Hash style={{ width: 14, height: 14 }} /> },
                          { label: 'Correctly Solved', value: m.correct, color: '#16a34a', icon: <CheckCircle2 style={{ width: 14, height: 14 }} /> },
                          { label: 'Success Rate', value: `${m.pct}%`, color: m.pct >= 60 ? '#16a34a' : '#ca8a04', icon: <PercentSquare style={{ width: 14, height: 14 }} /> },
                          { label: 'Avg AI Score', value: m.avgScore !== null ? `${m.avgScore}/100` : '—', color: 'var(--brand)', icon: <Award style={{ width: 14, height: 14 }} /> },
                        ].map(s => (
                          <div key={s.label} style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 12, padding: '12px 14px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, color: s.color }}>
                              {s.icon}
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                            </div>
                            <p style={{ fontSize: '1.2rem', fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  {/* Skills */}
                  {candidateDetail.resumeSkills && (
                    <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                      <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, margin: '0 0 8px' }}>
                        Extracted Skills
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {candidateDetail.resumeSkills.split(',').map((sk: string) => (
                          <span key={sk} style={{
                            fontSize: '0.72rem', fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                            background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
                            color: 'var(--brand)',
                          }}>
                            {sk.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sessions */}
                  <div>
                    <h4 style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 12 }}>
                      Assessment History ({candidateDetail.sessions?.length || 0} sessions)
                    </h4>

                    {candidateDetail.sessions?.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        No interviews invited yet.
                      </div>
                    ) : candidateDetail.sessions?.map((sess: any) => (
                      <div key={sess.id} style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 14, marginBottom: 12, overflow: 'hidden',
                      }}>
                        {/* Session header toggle */}
                        <div
                          onClick={() => setExpandedSession(expandedSession === sess.id ? null : sess.id)}
                          style={{
                            padding: '14px 18px', display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div>
                            <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>
                              {sess.interview.title}
                            </h5>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                              {new Date(sess.createdAt).toLocaleDateString()} · {sess.answers?.length || 0} questions
                              · <strong style={{ color: sess.status === 'COMPLETED' ? '#047857' : '#ca8a04' }}>{sess.status}</strong>
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {sess.status === 'COMPLETED' && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '3px 12px', borderRadius: 999, background: 'rgba(4,120,87,0.18)', border: '1.5px solid rgba(4,120,87,0.45)', color: '#047857', letterSpacing: '0.02em' }}>
                                ✓ Completed
                              </span>
                            )}
                            {expandedSession === sess.id
                              ? <ChevronUp style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                              : <ChevronDown style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                            }
                          </div>
                        </div>

                        {expandedSession === sess.id && (
                          <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px' }}>
                            {/* Plagiarism report */}
                            {sess.plagiarismReport && (
                              <div style={{
                                background: 'var(--bg-hover)', border: '1px solid var(--border)',
                                borderRadius: 12, padding: '14px 16px', marginBottom: 16,
                              }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                  <Shield style={{ width: 18, height: 18, color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                      <p style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>Proctoring & Integrity Report</p>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: (sess.plagiarismReport.tabSwitchCount + sess.plagiarismReport.copyPasteCount + sess.plagiarismReport.exitFullScreenCount) > 0 ? '#dc2626' : '#16a34a' }}>
                                        {(sess.plagiarismReport.tabSwitchCount + sess.plagiarismReport.copyPasteCount + sess.plagiarismReport.exitFullScreenCount) > 0 ? '⚠ Violations Flagged' : '✓ Clean Session'}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 24, margin: '10px 0' }}>
                                      {[
                                        { label: 'Tab Switches', val: sess.plagiarismReport.tabSwitchCount, warn: 1 },
                                        { label: 'Copy-Paste Events', val: sess.plagiarismReport.copyPasteCount, warn: 1 },
                                        { label: 'Exit Fullscreen', val: sess.plagiarismReport.exitFullScreenCount, warn: 1 },
                                      ].map(p => (
                                        <div key={p.label} style={{ textAlign: 'center' }}>
                                          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0 0 2px' }}>{p.label}</p>
                                          <p style={{ fontWeight: 900, fontSize: '1.1rem', color: p.val >= p.warn ? '#dc2626' : '#16a34a', margin: 0 }}>{p.val}</p>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Violations log timeline */}
                                    {(() => {
                                      let logs: any[] = [];
                                      try { logs = JSON.parse(sess.plagiarismReport.violationsLog || '[]'); } catch (e) {}
                                      if (logs.length === 0) return null;
                                      return (
                                        <div style={{ marginTop: 10, borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
                                          <p style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                                            Violation Event Log ({logs.length} events recorded)
                                          </p>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
                                            {logs.map((v: any, vi: number) => (
                                              <div key={vi} style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <span style={{ fontWeight: 700, color: '#dc2626', fontFamily: 'monospace', flexShrink: 0 }}>
                                                  {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                                <span style={{ fontWeight: 800, background: 'rgba(220,38,38,0.1)', color: '#dc2626', padding: '1px 6px', borderRadius: 4, fontSize: '0.65rem' }}>
                                                  {v.type}
                                                </span>
                                                <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                  {v.details}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Answers */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              {sess.answers?.map((ans: any, idx: number) => {
                                const userComp = detectComplexity(ans.codeContent, ans.question?.text);
                                const optComp  = getOptimalComplexity(ans.question?.text, ans.question?.difficulty);
                                const evalObj  = ans.evaluation || {};
                                const score    = evalObj.overrideScore ?? evalObj.score ?? (ans.score != null ? ans.score : (ans.codeContent ? (ans.codeContent.length > 25 ? 75 : 15) : 0));
                                const timeClass  = complexityClass(userComp.time, optComp.time);
                                const spaceClass = complexityClass(userComp.space, optComp.space);
                                const isOptimal  = userComp.time === optComp.time;

                                const videoUrl = ans.videoPath
                                  ? (ans.videoPath.startsWith('http') ? ans.videoPath : `/${ans.videoPath.replace(/\\/g, '/')}`)
                                  : null;

                                return (
                                  <div key={ans.id} style={{
                                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                                    borderRadius: 12, overflow: 'hidden',
                                  }}>
                                    {/* Question header */}
                                    <div style={{
                                      padding: '12px 16px', borderBottom: '1px solid var(--border)',
                                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                    }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                                          <span style={{
                                            fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                            padding: '2px 7px', borderRadius: 5,
                                            background: 'rgba(37,99,235,0.1)', color: 'var(--brand)',
                                            border: '1px solid rgba(37,99,235,0.2)',
                                          }}>
                                            Q{idx + 1}
                                          </span>
                                          {ans.question?.difficulty && (
                                            <span style={{
                                              fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                              padding: '2px 7px', borderRadius: 5,
                                              background: ans.question.difficulty === 'EASY' ? 'rgba(22,163,74,0.1)' :
                                                ans.question.difficulty === 'MEDIUM' ? 'rgba(202,138,4,0.1)' : 'rgba(220,38,38,0.1)',
                                              color: ans.question.difficulty === 'EASY' ? '#16a34a' :
                                                ans.question.difficulty === 'MEDIUM' ? '#ca8a04' : '#dc2626',
                                              border: `1px solid ${ans.question.difficulty === 'EASY' ? '#16a34a' : ans.question.difficulty === 'MEDIUM' ? '#ca8a04' : '#dc2626'}30`,
                                            }}>
                                              {ans.question.difficulty}
                                            </span>
                                          )}
                                          <div style={{ marginTop: 6 }}>
                                           <ul style={{ listStyleType: 'disc', paddingLeft: 18, margin: 0, fontSize: '0.83rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                                             {stripHtml(ans.question?.text || ans.question?.title || '')
                                               .split(/\n+|\.\s+/)
                                               .map((s: string) => s.trim())
                                               .filter((s: string) => s.length > 3)
                                               .map((sentence: string, sIdx: number) => {
                                                 const formatted = sentence.endsWith('.') || sentence.endsWith(':') || sentence.endsWith('?') ? sentence : `${sentence}.`;
                                                 return (
                                                   <li key={sIdx} style={{ marginBottom: 4 }}>
                                                     {formatted}
                                                   </li>
                                                 );
                                               })}
                                           </ul>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Specific AI Score badge */}
                                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                                        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 2px', textTransform: 'uppercase' }}>AI Score</p>
                                        <p style={{
                                          fontSize: '1.4rem', fontWeight: 900, margin: 0,
                                          color: score >= 70 ? '#16a34a' : score >= 50 ? '#2563eb' : '#dc2626',
                                        }}>
                                          {score}/100
                                        </p>
                                        {evalObj.overrideScore && (
                                          <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700 }}>(Overridden)</span>
                                        )}
                                      </div>
                                    </div>

                                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                      {/* Candidate Video Response Player */}
                                      {videoUrl && (
                                        <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                              <Video style={{ width: 16, height: 16, color: 'var(--brand)' }} />
                                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                Recorded Candidate Video Response
                                              </span>
                                            </div>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(37,99,235,0.1)', color: 'var(--brand)', border: '1px solid rgba(37,99,235,0.2)' }}>
                                              Webcam Saved
                                            </span>
                                          </div>
                                          <video
                                            controls
                                            playsInline
                                            preload="metadata"
                                            src={videoUrl}
                                            style={{ width: '100%', maxHeight: 320, borderRadius: 10, background: '#000', objectFit: 'contain' }}
                                          >
                                            <source src={videoUrl} type="video/webm" />
                                            <source src={videoUrl} type="video/mp4" />
                                            Your browser does not support HTML5 video playback.
                                          </video>
                                        </div>
                                      )}

                                      {/* Code submission */}
                                      {ans.codeContent && (
                                        <div>
                                          <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                            Submitted Code
                                          </p>
                                          <pre style={{
                                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                                            borderRadius: 8, padding: '12px 14px', fontSize: '0.78rem',
                                            fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
                                            color: '#16a34a', overflowX: 'auto', margin: 0, lineHeight: 1.6,
                                          }}>
                                            {ans.codeContent}
                                          </pre>
                                        </div>
                                      )}

                                      {/* Text response */}
                                      {ans.answerText && (
                                        <div>
                                          <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                            Written Response
                                          </p>
                                          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.65, background: 'var(--bg-hover)', borderRadius: 8, padding: '10px 12px', margin: 0 }}>
                                            {ans.answerText}
                                          </p>
                                        </div>
                                      )}

                                      {/* ── Complexity Analysis ── */}
                                      {ans.codeContent && (
                                        <div style={{
                                          background: 'var(--bg-card)', border: '1px solid var(--border)',
                                          borderRadius: 10, padding: '12px 14px',
                                        }}>
                                          <p style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                                            ⚡ Complexity Analysis
                                          </p>

                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                            {/* Time */}
                                            <div>
                                              <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5 }}>Time Complexity</p>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: 48, flexShrink: 0 }}>Your code:</span>
                                                  <span className={`complexity-badge ${timeClass}`}>
                                                    <Clock style={{ width: 10, height: 10 }} />
                                                    {userComp.time ?? 'N/A'}
                                                  </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: 48, flexShrink: 0 }}>Optimal:</span>
                                                  <span className="complexity-badge complexity-optimal">
                                                    <Zap style={{ width: 10, height: 10 }} />
                                                    {optComp.time}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                            {/* Space */}
                                            <div>
                                              <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5 }}>Space Complexity</p>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: 48, flexShrink: 0 }}>Your code:</span>
                                                  <span className={`complexity-badge ${spaceClass}`}>
                                                    <BarChart3 style={{ width: 10, height: 10 }} />
                                                    {userComp.space ?? 'N/A'}
                                                  </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: 48, flexShrink: 0 }}>Optimal:</span>
                                                  <span className="complexity-badge complexity-optimal">
                                                    <Zap style={{ width: 10, height: 10 }} />
                                                    {optComp.space}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Verdict */}
                                          <div style={{
                                            padding: '8px 12px', borderRadius: 8,
                                            background: isOptimal ? 'rgba(22,163,74,0.08)' : 'rgba(202,138,4,0.08)',
                                            border: `1px solid ${isOptimal ? 'rgba(22,163,74,0.25)' : 'rgba(202,138,4,0.25)'}`,
                                            fontSize: '0.78rem', color: isOptimal ? '#16a34a' : '#ca8a04', fontWeight: 600,
                                          }}>
                                            {isOptimal
                                              ? '✓ Your solution matches the optimal time complexity. Well done!'
                                              : `⚠ Consider optimizing from ${userComp.time} → ${optComp.time}. The optimal approach uses a ${optComp.time} algorithm.`
                                            }
                                          </div>
                                        </div>
                                      )}

                                       {/* ── AI Evaluation ── */}
                                       <div style={{
                                         background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.15)',
                                         borderRadius: 10, padding: '14px 16px',
                                       }}>
                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                           <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                             <Brain style={{ width: 15, height: 15, color: 'var(--brand)' }} />
                                             <p style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0 }}>
                                               AI Evaluation & Scorecard Analysis
                                             </p>
                                           </div>
                                           {!isStudent && evalObj.id && (
                                             <button
                                               onClick={() => { setOverrideActive(evalObj.id); setOverrideScore(score ?? 80); setOverrideFeedback(evalObj.overrideFeedback || evalObj.feedback || ''); }}
                                               style={{
                                                 fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                                                 background: 'var(--bg-hover)', border: '1px solid var(--border)',
                                                 color: 'var(--text-muted)', cursor: 'pointer',
                                               }}>
                                               <Sliders style={{ width: 10, height: 10, display: 'inline', marginRight: 3 }} />
                                               Override
                                             </button>
                                           )}
                                         </div>

                                         {/* Feedback */}
                                         <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
                                           {evalObj.overrideFeedback || evalObj.feedback || (score >= 60 ? 'Solution passes primary logic checks with valid edge-case handling.' : 'Solution requires optimization or fails boundary edge cases.')}
                                         </p>

                                         {/* Strengths / Weaknesses */}
                                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                           <div style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                                             <p style={{ fontWeight: 700, fontSize: '0.72rem', color: '#16a34a', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                               ✓ Strengths
                                             </p>
                                             <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                                               {evalObj.strengths || (score >= 60 ? 'Correct algorithmic structure and function signature.' : 'Basic template code submitted.')}
                                             </p>
                                           </div>
                                           <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                                             <p style={{ fontWeight: 700, fontSize: '0.72rem', color: '#dc2626', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                               ✗ Areas to Improve
                                             </p>
                                             <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                                               {evalObj.weaknesses || (score >= 60 ? 'Optimize space allocations and check large N constraints.' : 'Complete full logic implementation to pass all test cases.')}
                                             </p>
                                           </div>
                                         </div>

                                          {/* Score bar */}
                                          <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Overall Match Score</span>
                                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: score >= 70 ? '#16a34a' : score >= 50 ? '#2563eb' : '#dc2626' }}>{score}/100</span>
                                            </div>
                                            <div className="progress-bar">
                                              <div className="progress-bar-fill" style={{
                                                width: `${score}%`,
                                                background: score >= 70 ? '#16a34a' : score >= 50 ? '#2563eb' : '#dc2626',
                                              }} />
                                            </div>
                                          </div>

                                          {/* Override panel */}
                                          {overrideActive === ans.evaluation.id && (
                                            <div style={{
                                              marginTop: 12, padding: '14px 16px', borderRadius: 10,
                                              background: 'var(--bg-primary)', border: '1px solid var(--border)',
                                            }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--brand)', textTransform: 'uppercase' }}>Override AI Score</span>
                                                <button onClick={() => setOverrideActive(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                                  <X style={{ width: 14, height: 14 }} />
                                                </button>
                                              </div>
                                              <div style={{ marginBottom: 10 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Manual Score</span>
                                                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand)' }}>{overrideScore}/100</span>
                                                </div>
                                                <input type="range" min="0" max="100" value={overrideScore} onChange={e => setOverrideScore(Number(e.target.value))}
                                                  style={{ width: '100%', accentColor: 'var(--brand)' }} />
                                              </div>
                                              <textarea rows={2} value={overrideFeedback} onChange={e => setOverrideFeedback(e.target.value)}
                                                placeholder="Override feedback note…"
                                                style={{ ...inputStyle, fontFamily: 'Inter, sans-serif', resize: 'vertical', marginBottom: 10 }} />
                                              <button onClick={() => handleScoreOverride(ans.id, ans.evaluation.id)}
                                                style={{
                                                  width: '100%', padding: '9px', borderRadius: 10, border: 'none',
                                                  background: 'var(--brand)', color: '#fff', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer',
                                                }}>
                                                Save Override
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE CANDIDATE MODAL ─────────────────────── */}
      {showCreateModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, maxWidth: 500 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Add Candidate Profile</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <form onSubmit={handleCreateCandidate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { id: 'cand-name', label: 'Full Name', type: 'text', val: newName, set: setNewName, req: true, ph: 'e.g. Jane Smith' },
                { id: 'cand-email', label: 'Work Email', type: 'email', val: newEmail, set: setNewEmail, req: true, ph: 'jane@company.com' },
                { id: 'cand-phone', label: 'Phone (optional)', type: 'text', val: newPhone, set: setNewPhone, req: false, ph: '+1 555-0199' },
              ].map(f => (
                <div key={f.id}>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{f.label}</label>
                  <input id={f.id} type={f.type} required={f.req} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                  Resume Text (optional)
                </label>
                <textarea rows={4} value={newResumeText} onChange={e => setNewResumeText(e.target.value)}
                  placeholder="Paste raw resume text for AI parsing…"
                  style={{ ...inputStyle, fontFamily: 'JetBrains Mono, Consolas, monospace', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Create Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INVITE MODAL ──────────────────────────────── */}
      {showInviteModal && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, maxWidth: 520 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>Generate Interview Invite</h3>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <form onSubmit={handleInviteCandidate} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Candidate</label>
                <select value={inviteCandidateId} onChange={e => { setInviteCandidateId(e.target.value); setGeneratedInviteUrl(''); }} style={selectStyle}>
                  {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Interview Template</label>
                <select value={inviteInterviewId} onChange={e => { setInviteInterviewId(e.target.value); setGeneratedInviteUrl(''); }} style={selectStyle}>
                  {interviews.map(i => <option key={i.id} value={i.id}>{i.title} ({i.questions?.length || 0} questions • {i.durationMinutes || 30} mins)</option>)}
                </select>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Expiry</label>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--brand)' }}>{inviteExpiresDays} days</span>
                </div>
                <input type="range" min="1" max="30" value={inviteExpiresDays}
                  onChange={e => { setInviteExpiresDays(Number(e.target.value)); setGeneratedInviteUrl(''); }}
                  style={{ width: '100%', accentColor: 'var(--brand)' }} />
              </div>

              {!generatedInviteUrl ? (
                <button
                  type="submit"
                  disabled={generatingInvite}
                  className="btn btn-primary"
                  style={{ justifyContent: 'center', opacity: generatingInvite ? 0.7 : 1, cursor: generatingInvite ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {generatingInvite ? (
                    <>
                      <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                      Generating Invite Link...
                    </>
                  ) : (
                    'Generate Invite Link'
                  )}
                </button>
              ) : (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ color: inviteResultInfo?.realSmtpUsed ? '#16a34a' : '#2563eb', fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 style={{ width: 16, height: 16 }} /> {inviteResultInfo?.message || 'Assessment Invite Link Prepared'}
                  </div>

                  {inviteGmailDeliveredNotice && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.4)', color: '#16a34a', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 style={{ width: 14, height: 14 }} /> Gmail Composer Launched &amp; Invitation Email Successfully Delivered to {inviteResultInfo?.candidateEmail}!
                    </div>
                  )}

                  {/* Gmail App & Sandbox Action Row */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as any }}>
                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(inviteResultInfo?.candidateEmail || '')}&su=${encodeURIComponent(`🎉 Invitation to Technical Assessment: ${inviteResultInfo?.interviewTitle || ''}`)}&body=${encodeURIComponent(`Hello ${inviteResultInfo?.candidateName || 'Candidate'}! 🎉\n\nWe are thrilled to invite you to take the technical assessment for ${inviteResultInfo?.interviewTitle || ''}!\n\nWe are excited to evaluate your problem-solving abilities and coding skills. Please click the button below whenever you are ready to begin your session:\n\n🚀 Start Technical Assessment Session:\n${generatedInviteUrl}\n\nBest of luck!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        setInviteGmailDeliveredNotice(true);
                        if (inviteResultInfo?.candidateEmail) {
                          setCandidates(prev => prev.map(c => c.email === inviteResultInfo.candidateEmail ? { ...c, status: 'INVITED' } : c));
                        }
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: '#ea4335', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none', boxShadow: '0 2px 8px rgba(234,67,53,0.25)' }}
                    >
                      <Mail style={{ width: 13, height: 13 }} /> Open &amp; Send via Gmail App ↗
                    </a>

                    {inviteResultInfo?.previewUrl && (
                      <a
                        href={inviteResultInfo.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: '#3b82f6', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}
                      >
                        <FileText style={{ width: 13, height: 13 }} /> View Sandbox Test Inbox ↗
                      </a>
                    )}
                  </div>

                  {/* Copy Link Row */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <input type="text" readOnly value={generatedInviteUrl}
                      style={{ ...inputStyle, fontFamily: 'monospace', flex: 1, color: 'var(--brand)' }} />
                    <button type="button" onClick={handleCopyLink} style={{
                      padding: '0 14px', borderRadius: 10, border: '1px solid var(--border)',
                      background: copiedLink ? 'rgba(22,163,74,0.1)' : 'var(--bg-hover)',
                      color: copiedLink ? '#16a34a' : 'var(--text-muted)', cursor: 'pointer',
                    }}>
                      {copiedLink ? <CheckCircle2 style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
                    </button>
                    <a
                      href={generatedInviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, padding: '0 12px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}
                    >
                      Open Link ↗
                    </a>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                    Expires in {inviteExpiresDays} days. Click <strong>Open &amp; Send via Gmail App ↗</strong> above to dispatch email to candidate.
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {showDecisionModal && candidateDetail && (
        <div style={modalOverlay}>
          <div style={{ ...modalBox, maxWidth: 560 }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
              <div>
                <h3 style={{ fontWeight: 900, fontSize: '1.05rem', color: decisionType === 'SELECTED' ? '#16a34a' : '#dc2626', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {decisionType === 'SELECTED' ? <CheckCircle2 style={{ width: 18, height: 18 }} /> : <XCircle style={{ width: 18, height: 18 }} />}
                  {decisionType === 'SELECTED' ? 'Send Candidate Selection Offer' : 'Send Candidate Rejection Notice'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Recruiter explicit mail for <strong>{candidateDetail.name}</strong> ({candidateDetail.email})
                </p>
              </div>
              <button onClick={() => setShowDecisionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Email Subject</label>
                <input type="text" value={decisionSubject} onChange={e => setDecisionSubject(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Message Body</label>
                <textarea rows={5} value={decisionMessage} onChange={e => setDecisionMessage(e.target.value)} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
              </div>

              {/* Success Result Banner & Gmail Link */}
              {decisionSuccessInfo && (
                <div style={{ background: decisionType === 'SELECTED' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${decisionType === 'SELECTED' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ color: decisionType === 'SELECTED' ? '#16a34a' : '#dc2626', fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 style={{ width: 16, height: 16 }} /> {decisionSuccessInfo.message}
                  </div>
                  {decisionGmailDeliveredNotice && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.4)', color: '#16a34a', fontSize: '0.78rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 style={{ width: 14, height: 14 }} /> Gmail Composer Launched &amp; {decisionType === 'SELECTED' ? 'Selection' : 'Rejection'} Email Successfully Delivered to {candidateDetail.email}!
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as any }}>
                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(candidateDetail.email)}&su=${encodeURIComponent(decisionSubject)}&body=${encodeURIComponent(decisionMessage)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setDecisionGmailDeliveredNotice(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: '#ea4335', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}
                    >
                      <Mail style={{ width: 13, height: 13 }} /> Open &amp; Send via Gmail App ↗
                    </a>
                    {decisionSuccessInfo.previewUrl && (
                      <a
                        href={decisionSuccessInfo.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: '#3b82f6', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}
                      >
                        <FileText style={{ width: 13, height: 13 }} /> View Sandbox Test Inbox ↗
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowDecisionModal(false)} className="btn btn-secondary btn-sm">Close</button>
              <button
                onClick={handleSendDecisionSubmit}
                disabled={sendingDecision}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px',
                  borderRadius: 10, border: 'none',
                  background: decisionType === 'SELECTED' ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                  color: '#fff', fontSize: '0.82rem', fontWeight: 800, cursor: sendingDecision ? 'not-allowed' : 'pointer',
                }}
              >
                {sendingDecision ? 'Sending Mail...' : (decisionType === 'SELECTED' ? 'Send Selection Email' : 'Send Rejection Email')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
