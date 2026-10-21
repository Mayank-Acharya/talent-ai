import React, { useState, useEffect, useRef, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import {
  Brain, CheckCircle, ShieldAlert, Play, Square, AlertTriangle,
  ArrowRight, Sparkles, Terminal, ChevronRight, Clock, Zap, Check, X,
  FileCode, Layers, RefreshCw, ArrowLeft, CheckCircle2, ChevronLeft
} from 'lucide-react';

const DIFF_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  EASY: { color: '#16a34a', bg: 'rgba(22,163,74,0.1)', border: 'rgba(22,163,74,0.3)' },
  MEDIUM: { color: '#ca8a04', bg: 'rgba(202,138,4,0.1)', border: 'rgba(202,138,4,0.3)' },
  HARD: { color: '#dc2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.3)' },
};

const LANG_MAP: Record<string, string[]> = {
  cpp: ['cpp', 'c++'],
  python: ['python3', 'python'],
  java: ['java'],
  javascript: ['javascript', 'js'],
  typescript: ['typescript', 'ts'],
  csharp: ['csharp', 'c#'],
  c: ['c'],
  go: ['golang', 'go'],
  rust: ['rust'],
};

const FALLBACK_SNIPPETS: Record<string, string> = {
  cpp: `// C++17 Solution Starter\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n\n    // Write your solution here\n\n    return 0;\n}`,
  java: `// Java Solution Starter\nimport java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}`,
  python: `# Python 3 Solution Starter\nclass Solution:\n    def solution(self):\n        # Write your solution here\n        pass`,
  javascript: `/**\n * JavaScript Solution Starter\n * @return {any}\n */\nvar solution = function() {\n    // Write your solution here\n};`,
  typescript: `// TypeScript Solution Starter\nfunction solution(): any {\n    // Write your solution here\n};`,
  csharp: `// C# Solution Starter\npublic class Solution {\n    public void SolutionMethod() {\n        // Write your solution here\n    }\n}`,
  c: `// C Solution Starter\n#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
  go: `// Go Solution Starter\npackage main\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n}`,
  rust: `// Rust Solution Starter\nfn main() {\n    // Write your solution here\n}`,
};

function isSolvedSnippet(code: string): boolean {
  if (!code) return false;
  return /cin\s*>>|cout\s*<<|vector<|while\s*\([^)]*\)\s*\{|for\s*\([^)]*\)\s*\{|return\s+(matches|maxSoFar|count|ans|sol|tiles_|len \* wid|s\.front|\w+\s*==|\w+\s*>=|\w+\s*\+|\w+\s*%)/i.test(code);
}

function getCleanSnippet(lang: string, snippets: any[], customFallback?: string) {
  const targetSlugs = LANG_MAP[lang.toLowerCase()] || [lang.toLowerCase()];
  if (Array.isArray(snippets) && snippets.length > 0) {
    const match = snippets.find(s =>
      targetSlugs.includes((s.langSlug || s.lang || '').toLowerCase())
    );
    if (match && match.code && !isSolvedSnippet(match.code)) return match.code;
  }
  
  if (customFallback && !isSolvedSnippet(customFallback)) {
    return customFallback;
  }

  return FALLBACK_SNIPPETS[lang.toLowerCase()] || `// Write your solution here\nfunction solution() {\n    \n}`;
}

function cleanTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/^\[(leetcode|codeforces|cp)\]\s*/i, '')
    .replace(/^#\S+\s*·\s*/, '')
    .replace(/\s*[\(\[]?\s*(leetcode|codeforces|cp)\s*#?\s*\d+[a-z]?\d*[\)\]]?/gi, '')
    .replace(/^#\d+\s*·?\s*/, '')
    .trim();
}

function titleToSlug(title: string): string {
  if (!title) return '';
  const cleaned = cleanTitle(title);
  return cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

interface SessionProps {
  token?: string;
}

export default function Session({ token: propToken }: SessionProps) {
  const token = propToken || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || window.location.hash.split('/').pop() || '' : '');

  // Data
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Flow State
  const [flow, setFlow] = useState<'ONBOARDING' | 'SANDBOX' | 'COMPLETED'>('ONBOARDING');

  // Media permissions
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const proctorVideoRef = useRef<HTMLVideoElement>(null);

  // Automated Continuous Proctoring Video Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUploaded, setVideoUploaded] = useState(false);

  // Navigation & Multi-question Answers State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [savedAnswers, setSavedAnswers] = useState<Record<number, { codeContent: string; answerText: string; codeLanguage: string }>>({});

  const [answerText, setAnswerText] = useState('');
  const [codeContent, setCodeContent] = useState('');
  const [fetchedDetail, setFetchedDetail] = useState<any>(null);

  // Code Space & Editor
  const [codeLanguage, setCodeLanguage] = useState('cpp');
  const editorRef = useRef<any>(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(120);
  const timerRef = useRef<any>(null);

  // Plagiarism
  const [tabSwitches, setTabSwitches] = useState(0);
  const [copyPasteCount, setCopyPasteCount] = useState(0);

  // Submit states
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const themeVars = {
    bg: '#ffffff', bgSecondary: '#f8fafc', bgPanel: '#f1f5f9',
    border: '#e2e8f0', text: '#0f172a', textMuted: '#64748b',
    textSecondary: '#475569', editorBg: '#f8fafc', editorTheme: 'vs', brand: '#2563eb'
  };

  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  // 1. Validate Token
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/sessions/validate/${token}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setSession(data.session);
      } catch (err: any) {
        setError(err.message || 'Verification failed');
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [token]);

  // 2. Tab focus tracking
  useEffect(() => {
    if (flow !== 'SANDBOX') return;
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        setTabSwitches(prev => prev + 1);
        try {
          await fetch(`/api/sessions/plagiarism/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'TAB_SWITCH', details: 'Candidate navigated away from browser tab' }),
          });
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [flow, token]);

  // 2b. Copy-paste plagiarism detection
  useEffect(() => {
    if (flow !== 'SANDBOX') return;
    const handlePaste = async (e: ClipboardEvent) => {
      const pastedText = e.clipboardData?.getData('text') || '';
      setCopyPasteCount(prev => prev + 1);
      try {
        await fetch(`/api/sessions/plagiarism/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'COPY_PASTE',
            details: `Candidate pasted ${pastedText.length} characters: "${pastedText.slice(0, 100)}${pastedText.length > 100 ? '...' : ''}"`,
          }),
        });
      } catch {}
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [flow, token]);

  // 3. Media & Proctoring Setup
  const requestMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
      setCameraActive(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert('Camera and microphone permissions are required.');
    }
  };

  const stopMedia = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
      setCameraActive(false);
    }
  };

  // Automated Continuous Proctoring Recording (Record video every time without asking)
  const startContinuousRecording = (stream?: MediaStream) => {
    const activeStream = stream || mediaStream;
    if (!activeStream) return;
    try {
      recordedChunksRef.current = [];
      let options: MediaRecorderOptions = {};
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          options = { mimeType: 'video/webm;codecs=vp9' };
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          options = { mimeType: 'video/webm' };
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          options = { mimeType: 'video/mp4' };
        }
      }
      const recorder = new MediaRecorder(activeStream, options);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      recorder.start(3000); // gather continuous chunks every 3 seconds
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.warn('Failed to start MediaRecorder:', err);
    }
  };

  const uploadContinuousVideo = async () => {
    if (recordedChunksRef.current.length === 0) return;
    try {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const fd = new FormData();
      fd.append('video', blob, `session_${token}.webm`);
      await fetch(`/api/sessions/upload-video/${token}`, {
        method: 'POST',
        body: fd,
      });
      setVideoUploaded(true);
    } catch (err) {
      console.error('Failed to upload proctoring video:', err);
    }
  };

  // Attach webcam feed to proctoring thumbnail once sandbox loads
  useEffect(() => {
    if (flow === 'SANDBOX' && proctorVideoRef.current && mediaStream) {
      proctorVideoRef.current.srcObject = mediaStream;
    }
  }, [flow, mediaStream]);

  // Start Interview - Automated video recording begins immediately
  const handleStartInterview = async () => {
    try {
      const res = await fetch(`/api/sessions/start/${token}`, { method: 'POST' });
      if (!res.ok) throw new Error('Start failed');
      setFlow('SANDBOX');
      loadQuestion(0);
      startContinuousRecording(mediaStream || undefined);
    } catch {
      alert('Failed to initialize session');
    }
  };

  const loadQuestion = async (idx: number) => {
    if (!session) return;
    const questions = session.interview.questions;
    if (idx < 0 || idx >= questions.length) return;

    setCurrentIdx(idx);
    const q = questions[idx];
    setTimeLeft(q.timeLimitSeconds);
    setFetchedDetail(null);

    // Check if we have saved answers for this index
    const saved = savedAnswers[idx];
    if (saved) {
      setCodeContent(saved.codeContent);
      setAnswerText(saved.answerText);
      setCodeLanguage(saved.codeLanguage || 'cpp');
    } else {
      setAnswerText('');
      // Dynamic fetch for LeetCode detail if available
      const cleanedTitle = cleanTitle(q.title || '');
      const slug = q.leetcodeSlug || (q.leetcodeId ? String(q.leetcodeId) : null) || titleToSlug(cleanedTitle || q.title);
      let snippets: any[] = [];
      if (slug) {
        try {
          const res = await fetch(`/api/leetcode/problem/${slug}`);
          if (res.ok) {
            const detail = await res.json();
            setFetchedDetail(detail);
            if (detail.codeSnippets) snippets = detail.codeSnippets;
          }
        } catch (e) {
          console.error('Failed to fetch problem detail:', e);
        }
      }

      // Set clean starter code snippet
      const cleanSnippet = getCleanSnippet(codeLanguage, snippets, q.codeSnippet);
      setCodeContent(cleanSnippet);
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Switch Question Handler (Save current question state before switching)
  const handleSwitchQuestion = (targetIdx: number) => {
    if (!session || targetIdx < 0 || targetIdx >= session.interview.questions.length) return;
    if (targetIdx === currentIdx) return;

    // Save current index state
    setSavedAnswers(prev => ({
      ...prev,
      [currentIdx]: {
        codeContent,
        answerText,
        codeLanguage,
      }
    }));

    loadQuestion(targetIdx);
  };

  // Language Change Handler
  const handleLanguageChange = (newLang: string) => {
    setCodeLanguage(newLang);
    const snippets = fetchedDetail?.codeSnippets || [];
    const currentQ = session?.interview?.questions?.[currentIdx];
    const cleanSnippet = getCleanSnippet(newLang, snippets, currentQ?.codeSnippet);
    setCodeContent(cleanSnippet);
  };

  // Save current question answer and proceed or finish
  const handleSaveCurrentAnswer = async (autoNext = false) => {
    setSubmittingAnswer(true);
    setSaveSuccessNotice(false);
    const q = session.interview.questions[currentIdx];

    // Save locally
    setSavedAnswers(prev => ({
      ...prev,
      [currentIdx]: {
        codeContent,
        answerText,
        codeLanguage,
      }
    }));

    const formData = new FormData();
    formData.append('questionId', q.id);
    formData.append('answerText', answerText);
    formData.append('codeContent', codeContent);
    formData.append('codeLanguage', codeLanguage);
    if (recordedChunksRef.current.length > 0) {
      const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      formData.append('video', videoBlob, `session_${token}_q_${q.id}.webm`);
    }

    try {
      await fetch(`/api/sessions/submit-answer/${token}`, { method: 'POST', body: formData });
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 2500);
      // Continuous proctoring video sync
      uploadContinuousVideo().catch(() => {});
      if (autoNext && currentIdx + 1 < session.interview.questions.length) {
        loadQuestion(currentIdx + 1);
      }
    } catch {
      alert('Failed to save response');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Final submit at the end
  const handleFinalSubmitInterview = async () => {
    if (!confirm('Are you sure you want to finish and submit your interview? All your answered solutions and proctoring video will be evaluated.')) return;
    
    setSubmittingAnswer(true);
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.requestData(); } catch {}
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      setIsRecording(false);

      // Save current question first
      await handleSaveCurrentAnswer(false);

      // Final video upload to company
      await uploadContinuousVideo();

      // Complete session
      await fetch(`/api/sessions/complete/${token}`, { method: 'POST' });
      stopMedia();
      setFlow('COMPLETED');
    } catch {
      alert('Failed to submit interview session');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  /* Derive Question & Test Cases */
  const currentQuestion = session?.interview?.questions?.[currentIdx];

  // Prefer raw HTML from LeetCode for word-for-word display
  const problemHtml = useMemo(() => {
    const html = fetchedDetail?.htmlContent || '';
    if (!html) return '';
    return html
      .replace(/LeetCode\s*#?\s*\d+/gi, '')
      .replace(/\(LeetCode\)/gi, '')
      .trim();
  }, [fetchedDetail]);

  // Fallback plain text when no HTML available
  const rawProblemText = (!problemHtml && (fetchedDetail?.text || currentQuestion?.text)) || '';
  const problemText = useMemo(() => {
    if (!rawProblemText) return '';
    return rawProblemText
      .replace(/\s*[\(\[]?\s*(leetcode|codeforces|cp)\s*#?\s*\d+[a-z]?\d*[\)\]]?/gi, '')
      .replace(/^Problem Statement:\s*.*?\n\n/gi, '')
      .trim();
  }, [rawProblemText]);

  const problemDiagram = fetchedDetail?.diagram || currentQuestion?.diagram || '';
  const problemOfficialUrl = fetchedDetail?.officialUrl || currentQuestion?.officialUrl || '';

  const qExamples: any[] = useMemo(() => {
    const raw = fetchedDetail?.examples || currentQuestion?.examples;
    if (!raw) return [];
    let parsed: any[] = [];
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      parsed = [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((ex: any) => ex && (ex.input || ex.output));
  }, [currentQuestion, fetchedDetail]);

  const qConstraints: string[] = useMemo(() => {
    const raw = fetchedDetail?.constraints || currentQuestion?.constraints;
    if (!raw) return [];
    let parsed: any[] = [];
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      parsed = Array.isArray(raw) ? raw : [String(raw)];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean);
  }, [currentQuestion, fetchedDetail]);

  const optimalTime = fetchedDetail?.optimalTime || currentQuestion?.optimalTime;
  const optimalSpace = fetchedDetail?.optimalSpace || currentQuestion?.optimalSpace;

  const diffStyle = DIFF_STYLE[currentQuestion?.difficulty] || DIFF_STYLE.MEDIUM;
  const timePercent = currentQuestion ? (timeLeft / currentQuestion.timeLimitSeconds) * 100 : 100;
  const timerColor = timePercent > 50 ? '#22c55e' : timePercent > 25 ? '#f59e0b' : '#ef4444';

  if (loading) {
    return (
      <div style={{ background: themeVars.bg, color: themeVars.text }}
        className="min-h-screen flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Brain className="w-12 h-12 text-brand-500 animate-bounce" />
          <p style={{ color: themeVars.textMuted }} className="text-sm">Verifying secure invite credentials...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={{ background: themeVars.bg, color: themeVars.text }}
        className="min-h-screen flex items-center justify-center p-6 font-sans">
        <div style={{ background: themeVars.bgSecondary, border: `1px solid ${themeVars.border}` }}
          className="max-w-md w-full p-8 rounded-2xl text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 style={{ color: themeVars.text }} className="text-xl font-bold">Interview Verification Failed</h3>
          <p style={{ color: themeVars.textMuted }} className="text-xs leading-relaxed">{error || 'This interview link is invalid.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: themeVars.bg, color: themeVars.text, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <header style={{ borderBottom: `1px solid ${themeVars.border}`, background: themeVars.bgSecondary, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain style={{ width: 18, height: 18, color: '#fff' }} />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '0.85rem', color: themeVars.text, margin: 0 }}>TalentAI Assessment</p>
            <p style={{ fontSize: '0.72rem', color: themeVars.textMuted, margin: 0 }}>{session.interview.title}</p>
          </div>
        </div>

        {flow === 'SANDBOX' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Question Selector Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: themeVars.bgPanel, padding: '3px 6px', borderRadius: 10, border: `1px solid ${themeVars.border}` }}>
              {session.interview.questions.map((q: any, i: number) => {
                const isSaved = !!savedAnswers[i]?.codeContent || !!savedAnswers[i]?.answerText;
                const isActive = i === currentIdx;
                return (
                  <button
                    key={i}
                    onClick={() => handleSwitchQuestion(i)}
                    style={{
                      padding: '4px 10px', borderRadius: 7, border: 'none',
                      background: isActive ? '#2563eb' : 'transparent',
                      color: isActive ? '#fff' : isSaved ? '#10b981' : themeVars.textMuted,
                      fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s'
                    }}
                  >
                    {isSaved && !isActive && <CheckCircle2 size={11} color="#10b981" />} Q{i + 1}
                  </button>
                );
              })}
            </div>

            {/* Live Continuous Proctoring Indicator */}
            {cameraActive && isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 10px', borderRadius: 8, fontSize: '0.74rem', fontWeight: 800 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.2s infinite' }} />
                REC • Live Proctoring
              </div>
            )}

            {tabSwitches > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700 }}>
                <AlertTriangle style={{ width: 13, height: 13 }} /> Tab Switches: {tabSwitches}
              </div>
            )}
            {copyPasteCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700 }}>
                <ShieldAlert style={{ width: 13, height: 13 }} /> Pastes: {copyPasteCount}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: themeVars.bgPanel, border: `1px solid ${themeVars.border}`, padding: '6px 14px', borderRadius: 10 }}>
              <Clock style={{ width: 15, height: 15, color: timerColor }} />
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: timerColor }}>
                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <button
              onClick={handleFinalSubmitInterview}
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 9, padding: '7px 14px', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
            >
              Submit Interview ✓
            </button>
          </div>
        )}
      </header>

      {/* ── ONBOARDING / PERMISSIONS ── */}
      {flow === 'ONBOARDING' && (
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ background: themeVars.bgSecondary, border: `1px solid ${themeVars.border}`, borderRadius: 20, maxWidth: 540, width: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Welcome Candidate</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: themeVars.text, margin: '4px 0 0' }}>System Check &amp; Verification</h2>
              <p style={{ color: themeVars.textMuted, fontSize: '0.85rem', marginTop: 6 }}>
                Before beginning <strong>{session.interview.title}</strong>, please complete camera setup.
              </p>
            </div>

            <div style={{ background: themeVars.bgPanel, border: `1px solid ${themeVars.border}`, borderRadius: 14, overflow: 'hidden', height: 220, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }} />
              {!cameraActive && (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem', color: themeVars.text }}>Camera Check Required</p>
                  <p style={{ fontSize: '0.75rem', color: themeVars.textMuted, marginTop: 4, marginBottom: 16 }}>We require camera monitoring to prevent plagiarism.</p>
                  <button onClick={requestMedia} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                    Enable Camera &amp; Mic
                  </button>
                </div>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${themeVars.border}`, paddingTop: 16 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: themeVars.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Guidelines</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '🚫', text: 'Do not switch browser tabs — all focus shifts are logged.' },
                  { icon: '⏱️', text: 'Each question has a countdown timer. Submission is automatic.' },
                  { icon: '💻', text: 'Coding questions feature a smart editor with auto-tabbing.' },
                  { icon: '📹', text: 'Automated continuous video and audio recording is active throughout the assessment.' },
                ].map((r, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, fontSize: '0.8rem', color: themeVars.textSecondary }}>
                    <span>{r.icon}</span>
                    <span>{r.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleStartInterview}
              disabled={!cameraActive}
              style={{ background: !cameraActive ? themeVars.border : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 0', fontWeight: 800, fontSize: '1rem', cursor: cameraActive ? 'pointer' : 'not-allowed', opacity: cameraActive ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
            >
              Start Assessment <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </main>
      )}

      {/* ── SANDBOX ── */}
      {flow === 'SANDBOX' && currentQuestion && (
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* LEFT: Complete Problem Description Pane */}
          <div style={{ width: '45%', borderRight: `1px solid ${themeVars.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Question Header & Navigation Toolbar */}
            <div style={{ padding: '12px 18px', borderBottom: `1px solid ${themeVars.border}`, background: themeVars.bgSecondary, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', background: 'rgba(37,99,235,0.1)', padding: '2px 7px', borderRadius: 5 }}>
                    Q{currentIdx + 1} of {session.interview.questions.length}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: themeVars.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {currentQuestion.type}
                  </span>
                </div>

                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: diffStyle.color, background: diffStyle.bg, border: `1px solid ${diffStyle.border}` }}>
                  {currentQuestion.difficulty}
                </span>
              </div>

              <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: themeVars.text, lineHeight: 1.4, margin: '4px 0 0' }}>
                {cleanTitle(fetchedDetail?.title) || (currentQuestion.title && !currentQuestion.title.includes('Algorithmic Challenge') ? cleanTitle(currentQuestion.title) : '') || cleanTitle(currentQuestion.title) || 'Coding Challenge'}
              </h3>
            </div>

            {/* Scrollable Problem Body with Full LeetCode Statement */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Full Problem Description — renders LeetCode HTML if available, else plain text fallback */}
              {problemHtml ? (
                <div
                  className="lc-problem-body"
                  style={{
                    fontSize: '0.88rem',
                    color: themeVars.textSecondary,
                    lineHeight: 1.75,
                  }}
                  dangerouslySetInnerHTML={{ __html: problemHtml }}
                />
              ) : (
                <div
                  style={{
                    fontSize: '0.88rem',
                    color: themeVars.textSecondary,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-line',
                  }}
                  dangerouslySetInnerHTML={{ __html: problemText }}
                />
              )}

              {/* Visual Diagram (if present) */}
              {problemDiagram && (
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: themeVars.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Visual Diagram
                  </p>
                  <pre style={{ background: themeVars.bgPanel, border: `1px solid ${themeVars.border}`, borderRadius: 10, padding: 12, fontFamily: 'monospace', fontSize: '0.78rem', color: '#2563eb', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                    {problemDiagram}
                  </pre>
                </div>
              )}

              {/* Structured Examples — only shown when no rich HTML from LeetCode (HTML already includes them) */}
              {!problemHtml && qExamples.length > 0 && (
                <div>
                  {qExamples.map((ex: any, i: number) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: themeVars.text, marginBottom: 6 }}>Example {i + 1}:</p>
                      <div style={{ background: themeVars.bgPanel, border: `1px solid ${themeVars.border}`, borderRadius: 10, padding: '12px 14px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        <div style={{ marginBottom: 4 }}>
                          <span style={{ color: themeVars.textMuted, fontSize: '0.72rem', fontWeight: 700 }}>Input: </span>
                          <span style={{ color: '#22c55e' }}>{ex.input}</span>
                        </div>
                        <div style={{ marginBottom: ex.explanation ? 4 : 0 }}>
                          <span style={{ color: themeVars.textMuted, fontSize: '0.72rem', fontWeight: 700 }}>Output: </span>
                          <span style={{ color: '#2563eb' }}>{ex.output}</span>
                        </div>
                        {ex.explanation && (
                          <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${themeVars.border}` }}>
                            <span style={{ color: themeVars.textMuted, fontSize: '0.72rem', fontWeight: 700 }}>Explanation: </span>
                            <span style={{ color: themeVars.textSecondary, fontSize: '0.78rem' }}>{ex.explanation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Constraints */}
              {qConstraints.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: themeVars.text, marginBottom: 8 }}>Constraints:</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {qConstraints.map((c: string, i: number) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.8rem', color: themeVars.textSecondary }}>
                        <ChevronRight style={{ width: 14, height: 14, color: '#2563eb', flexShrink: 0, marginTop: 2 }} />
                        <code style={{ background: themeVars.bgPanel, padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.78rem' }}>{c}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}



              {/* Official problem link */}
              {problemOfficialUrl && (
                <div>
                  <a
                    href={problemOfficialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}
                  >
                    🔗 View Official Problem Page ↗
                  </a>
                </div>
              )}

              {/* Written answer */}
              {currentQuestion.type !== 'CODING' && currentQuestion.type !== 'DSA' && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: themeVars.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Written Answer</label>
                  <textarea
                    rows={5}
                    placeholder="Describe your approach, architecture, or reasoning..."
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                    style={{ width: '100%', background: themeVars.bgPanel, border: `1px solid ${themeVars.border}`, borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: themeVars.text, resize: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', lineHeight: 1.6 }}
                  />
                </div>
              )}
            </div>

            {/* Back Button & Save/Next Actions Footer */}
            <div style={{ padding: '12px 18px', borderTop: `1px solid ${themeVars.border}`, background: themeVars.bgSecondary, flexShrink: 0, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => handleSwitchQuestion(currentIdx - 1)}
                disabled={currentIdx === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 10,
                  border: `1px solid ${themeVars.border}`, background: themeVars.bgPanel, color: currentIdx === 0 ? themeVars.textMuted : themeVars.text,
                  fontWeight: 700, fontSize: '0.8rem', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', opacity: currentIdx === 0 ? 0.5 : 1
                }}
              >
                <ChevronLeft size={15} /> Previous Question
              </button>

              <button
                onClick={() => handleSaveCurrentAnswer(true)}
                disabled={submittingAnswer}
                style={{
                  flex: 1, background: submittingAnswer ? themeVars.border : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                  color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontWeight: 800, fontSize: '0.82rem',
                  cursor: submittingAnswer ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}
              >
                {submittingAnswer ? 'Saving...' : currentIdx + 1 < session.interview.questions.length ? 'Save & Next Question →' : 'Save Answer ✓'}
              </button>
            </div>
          </div>

          {/* RIGHT: LeetCode Code Space (Editor & Testcases Panel) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: themeVars.bg }}>

            {/* Editor Header / Toolbar */}
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${themeVars.border}`, background: themeVars.bgSecondary, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Terminal style={{ width: 15, height: 15, color: '#2563eb' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: themeVars.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Code Space</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={handleFormatCode}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: themeVars.bgPanel, border: `1px solid ${themeVars.border}`, borderRadius: 7, color: themeVars.text, fontSize: '0.75rem', fontWeight: 700, padding: '5px 10px', cursor: 'pointer' }}
                  title="Auto-format code"
                >
                  <Sparkles size={12} color="#2563eb" /> Format
                </button>

                {/* Language Dropdown with LeetCode Solution templates */}
                <select
                  value={codeLanguage}
                  onChange={e => handleLanguageChange(e.target.value)}
                  style={{ background: themeVars.bgPanel, border: `1px solid ${themeVars.border}`, borderRadius: 7, color: themeVars.text, fontSize: '0.75rem', fontWeight: 700, padding: '5px 10px', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="python">Python3</option>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="csharp">C#</option>
                  <option value="c">C</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                </select>

                {/* Save Solution Button */}
                <button
                  onClick={() => handleSaveCurrentAnswer(false)}
                  disabled={submittingAnswer || !codeContent.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: saveSuccessNotice ? '#16a34a' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: '0.8rem', fontWeight: 800, cursor: submittingAnswer ? 'not-allowed' : 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                  {saveSuccessNotice ? <CheckCircle2 size={13} /> : <FileCode size={13} />}
                  {saveSuccessNotice ? 'Solution Saved ✓' : submittingAnswer ? 'Saving...' : 'Save Solution'}
                </button>
              </div>
            </div>

            {/* Monaco Code Editor (Full Remaining Height) */}
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <Editor
                height="100%"
                language={codeLanguage === 'cpp' ? 'cpp' : codeLanguage === 'csharp' ? 'csharp' : codeLanguage === 'python' ? 'python' : codeLanguage}
                value={codeContent}
                onChange={val => setCodeContent(val || '')}
                theme={themeVars.editorTheme}
                onMount={(editor) => { editorRef.current = editor; }}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  tabSize: 4,
                  insertSpaces: true,
                  detectIndentation: true,
                  formatOnType: true,
                  formatOnPaste: true,
                  autoClosingBrackets: 'always',
                  autoClosingQuotes: 'always',
                  autoIndent: 'full',
                  snippetSuggestions: 'top',
                  padding: { top: 12, bottom: 12 },
                  fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                  fontLigatures: true,
                  bracketPairColorization: { enabled: true },
                }}
              />
            </div>
          </div>
        </main>
      )}

      {/* ── Floating Live Proctoring Webcam Thumbnail (Recorded Throughout Session) ── */}
      {flow === 'SANDBOX' && cameraActive && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          width: 168,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          border: '2px solid rgba(239,68,68,0.7)',
          background: '#000',
        }}>
          <video
            ref={proctorVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: 105, objectFit: 'cover', display: 'block' }}
          />
          <div style={{
            position: 'absolute',
            top: 6,
            left: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            padding: '2px 7px',
            borderRadius: 6,
            color: '#fff',
            fontSize: '0.62rem',
            fontWeight: 800,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.2s infinite' }} />
            REC • Live
          </div>
        </div>
      )}

      {/* ── COMPLETED ── */}
      {flow === 'COMPLETED' && (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', gap: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle style={{ width: 36, height: 36, color: '#22c55e' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: themeVars.text }}>Interview Complete!</h2>
            <p style={{ color: themeVars.textMuted, fontSize: '0.9rem', marginTop: 10, maxWidth: 400 }}>
              Thank you for participating. Your answers and recordings have been securely submitted to the recruitment team.
            </p>
          </div>
          <div style={{ background: themeVars.bgSecondary, border: `1px solid ${themeVars.border}`, borderRadius: 14, padding: '16px 24px', maxWidth: 400, fontSize: '0.85rem', color: themeVars.textMuted, lineHeight: 1.7 }}>
            🤖 AI assessment pipelines are now scoring your solutions. The recruiter will contact you via email with results.
          </div>
        </main>
      )}

      {/* ── Footer ── */}
      <footer style={{ padding: '10px 20px', borderTop: `1px solid ${themeVars.border}`, background: themeVars.bgSecondary, textAlign: 'center', fontSize: '0.7rem', color: themeVars.textMuted, flexShrink: 0 }}>
        Secured by TalentAI plagiarism tracking · All activity is monitored and recorded.
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
