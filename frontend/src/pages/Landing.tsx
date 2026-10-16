import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Brain, Video, FileText, ArrowRight, CheckCircle2,
  ChevronRight, Users, BarChart3, Zap, Star, Clock, Award,
  Code2, MessageSquare, TrendingUp, Play, Sparkles, GraduationCap,
  Building2, Check, X, Swords, Phone, Mail, Share2, Eye,
  Sliders, Cpu, Lock, CheckCheck, RefreshCw, Layers, Search,
  ExternalLink, Copy, HelpCircle, AlertTriangle, Crown
} from 'lucide-react';

interface LandingProps {
  onNavigate: (page: string) => void;
}

/* ── Animated counter helper ────────────────────────────── */
function Counter({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const duration = 1000;
        const step = Math.max(16, duration / Math.max(to, 1));
        const timer = setInterval(() => {
          start += Math.ceil(to / 30);
          if (start >= to) { setCount(to); clearInterval(timer); }
          else setCount(start);
        }, step);
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

export default function Landing({ onNavigate }: LandingProps) {
  const [scrolled, setScrolled] = useState(false);
  
  // Interactive Demo State
  const [interactiveTab, setInteractiveTab] = useState<'dora' | 'proctoring' | 'dsa' | 'ats' | 'video'>('dora');
  const [codeTestRunning, setCodeTestRunning] = useState(false);
  const [codeTestsPassed, setCodeTestsPassed] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Billing Cycle Switcher for Pricing
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // ROI Calculator States
  const [monthlyHires, setMonthlyHires] = useState(5);
  const [hoursPerInterview, setHoursPerInterview] = useState(4);
  const [recruiterRate, setRecruiterRate] = useState(45);

  // ROI Calculations
  const currentCost = monthlyHires * 4 * hoursPerInterview * recruiterRate;
  const aiCost = Math.round((monthlyHires * 4 * 0.15 * recruiterRate) + (billingCycle === 'monthly' ? 100 : 83));
  const monthlySavings = Math.max(0, currentCost - aiCost);
  const annualSavings = monthlySavings * 12;
  const hoursSaved = Math.max(0, Math.round((monthlyHires * 4 * hoursPerInterview) * 0.8));

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRunCodeDemo = () => {
    setCodeTestRunning(true);
    setCodeTestsPassed(false);
    setTimeout(() => {
      setCodeTestRunning(false);
      setCodeTestsPassed(true);
    }, 1100);
  };

  const services = [
    {
      icon: Brain,
      title: 'Dora AI Socratic Live Mentor',
      desc: 'Real-time Monaco screen & code inspector guiding step-by-step intuition without spoiling solutions. Powered by Qwen 2.5 Coder, DeepSeek R1 & Gemini.',
      color: '#a855f7',
      bg: 'rgba(168,85,247,0.08)',
      border: 'rgba(168,85,247,0.2)',
      badge: 'Live Screen AI',
    },
    {
      icon: Code2,
      title: '4,000+ LeetCode DSA & Monthly Calendar Tracker',
      desc: 'Monaco editor with C++, Python, JS & Java runtimes, AST Big-O evaluation, and monthly practice activity heatmap tracker.',
      color: '#2563eb',
      bg: 'rgba(37,99,235,0.08)',
      border: 'rgba(37,99,235,0.2)',
      badge: 'Activity Heatmap',
    },
    {
      icon: Crown,
      title: 'Codeforces CP Sheet (800–3000 Rating Tiers)',
      desc: 'Curated 50 problems per rating tier from Newbie (800) to LGM (3000) with 10,000 character revision notes per problem.',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.08)',
      border: 'rgba(239,68,68,0.2)',
      badge: '800-3000 CP Catalog',
    },
    {
      icon: Video,
      title: 'Proctoring & Video Recording Playback',
      desc: 'Webcam video recording playback per question with continuous biometric presence tracking for hiring teams.',
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.08)',
      border: 'rgba(124,58,237,0.2)',
      badge: 'AI Proctoring',
    },
    {
      icon: FileText,
      title: 'Honest ATS Resume Parser & PDF Reports',
      desc: 'Multi-pass resume parsing, uninflated ATS match scoring across skills & experience, and downloadable PDF reports.',
      color: '#059669',
      bg: 'rgba(5,150,105,0.08)',
      border: 'rgba(5,150,105,0.2)',
      badge: 'Uninflated ATS',
    },
    {
      icon: Shield,
      title: 'Anti-Cheating Plagiarism Shield',
      desc: 'Active tab-switch monitoring, copy-paste interception, exit full-screen logging, and violation timelines.',
      color: '#dc2626',
      bg: 'rgba(220,38,38,0.08)',
      border: 'rgba(220,38,38,0.2)',
      badge: 'Integrity Shield',
    },
  ];

  const stats = [
    { value: 10, suffix: '×', label: 'Faster Technical Evaluation', icon: Zap },
    { value: 85, suffix: '%', label: 'Interviewer Time Saved', icon: Clock },
    { value: 4000, suffix: '+', label: 'Curated Coding Challenges', icon: Code2 },
    { value: 99.4, suffix: '%', label: 'Anti-Cheating Integrity Score', icon: Shield },
  ];

  const faqs = [
    {
      q: 'How does the Student Pass ($20/mo) differ from the Organisation Plan ($100/mo)?',
      a: 'The Student Pass ($20/mo) gives individual students unlimited practice bank access, custom interview template creation, shareable session links for self-practice or peer testing, and AI resume parsing. The Organisation Plan ($100/mo) includes full ATS applicant pipeline management, candidate video response playback, proctoring anti-cheating violation logs, recruiter manual score overrides, and bulk resume parsing for hiring teams.'
    },
    {
      q: 'How does the Anti-Cheating Plagiarism Shield work?',
      a: 'During an interview session, our engine tracks browser visibility to log tab switches, intercepts copy-paste events with character length metrics, and monitors full-screen exits. All events are timestamped and compiled into a detailed proctoring report.'
    },
    {
      q: 'Can students generate shareable interview links for themselves?',
      a: 'Yes! Students can create custom interview templates and generate secure shareable session links (/session/:token) to practice under timed conditions or share with peers.'
    },
    {
      q: 'Is candidate webcam video recorded and saved for playback?',
      a: 'Yes, when candidates record video responses, the webcam stream is captured per question and stored securely. Reviewers can watch the candidate video playback directly inside the evaluation dashboard.'
    },
    {
      q: 'How accurate is the AI Resume Parser and ATS score?',
      a: 'Unlike tools that artificially inflate scores, our ATS parser uses weighted scoring across Skills (35%), Experience (25%), Education (15%), Keywords (15%), and Formatting (10%) to deliver genuine, honest ratings.'
    },
  ];

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        minHeight: '100vh',
      }}
    >
      {/* ── Sticky Top Navigation ───────────────────────── */}
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: scrolled ? 'var(--header-bg)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: 'var(--brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px var(--brand-glow)',
            }}>
              <Brain style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <span style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              Talent<span style={{ color: 'var(--brand)' }}>AI</span>
            </span>
          </div>

          {/* Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: '0.875rem', fontWeight: 700 }} className="hidden md:flex">
            <a href="#services" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>Services</a>
            <a href="#demo" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>Interactive Demo</a>
            <a href="#roi" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>ROI Savings</a>
            <a href="#matrix" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>Plans Compared</a>
            <a href="#pricing" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>Pricing</a>
          </div>

          {/* Auth Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => onNavigate('login')}
              style={{
                padding: '8px 16px', borderRadius: 10, background: 'transparent',
                border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 800,
                cursor: 'pointer', transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate('login')}
              style={{
                padding: '10px 20px', borderRadius: 12, background: 'var(--brand)',
                color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 16px var(--brand-glow)', transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              Get Started <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ───────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 48px', textAlign: 'center', position: 'relative' }}>
        {/* Floating Pill Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px',
          borderRadius: 999, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
          color: 'var(--brand)', fontSize: '0.78rem', fontWeight: 800, marginBottom: 24,
        }}>
          <Sparkles size={14} style={{ animation: 'spin 10s linear infinite' }} />
          <span>PRODUCTION-READY AI TECHNICAL ASSESSMENT & PRACTICE PLATFORM</span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(2.4rem, 5vw, 4.2rem)', fontWeight: 900,
          lineHeight: 1.15, letterSpacing: '-0.03em', color: 'var(--text-primary)',
          maxWidth: 900, margin: '0 auto 20px',
        }}>
          Evaluate Candidates &amp; Master Coding <br />
          <span style={{
            background: 'linear-gradient(135deg, #2563eb, #7c3aed, #059669)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            10× Faster with AI Intelligence
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6,
          maxWidth: 760, margin: '0 auto 36px', fontWeight: 500,
        }}>
          Autonomous technical assessments with webcam video recording playback, honest ATS resume scoring, 
          4,000+ LeetCode DSA practice problems, anti-cheating proctoring reports, and custom interview template generation.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          <button
            onClick={() => onNavigate('login')}
            style={{
              padding: '14px 28px', borderRadius: 14, background: 'var(--brand)',
              color: '#fff', border: 'none', fontSize: '0.95rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 6px 24px var(--brand-glow)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            Start Free Assessment <ChevronRight size={18} />
          </button>
          <a
            href="#roi"
            style={{
              padding: '14px 28px', borderRadius: 14, background: 'var(--bg-card)',
              border: '1px solid var(--border)', color: 'var(--text-primary)',
              fontSize: '0.95rem', fontWeight: 800, textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            <BarChart3 size={18} style={{ color: '#059669' }} /> Calculate ROI Savings
          </a>
        </div>

        {/* Key Stats Bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16,
          maxWidth: 960, margin: '0 auto',
        }}>
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '20px 16px', boxShadow: '0 6px 20px rgba(0,0,0,0.03)',
                textAlign: 'center', transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: 'rgba(37,99,235,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px',
                  color: 'var(--brand)',
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, margin: '6px 0 0' }}>{s.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── INTERACTIVE DEMO ENGINE ─────────────────────── */}
      <section id="demo" style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Interactive Product Preview
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '6px 0 0' }}>
            Experience the TalentAI Engine in Action
          </h2>
        </div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 24, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.06)',
        }}>
          {/* Tab bar */}
          <div style={{
            padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginLeft: 6 }}>talentai-sandbox-v2</span>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'dora', label: 'Dora AI Socratic Mentor 🤖', icon: Brain },
                { id: 'proctoring', label: 'AI Proctoring & Integrity', icon: Shield },
                { id: 'dsa', label: 'LeetCode & Calendar Tracker', icon: Code2 },
                { id: 'ats', label: 'ATS Resume Parser', icon: FileText },
                { id: 'video', label: 'Video Response Player', icon: Video },
              ].map(t => {
                const TabIcon = t.icon;
                const active = interactiveTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setInteractiveTab(t.id as any)}
                    style={{
                      padding: '7px 14px', borderRadius: 10, border: 'none',
                      fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                      background: active ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                      boxShadow: active ? '0 4px 12px rgba(168,85,247,0.3)' : 'none',
                    }}
                  >
                    <TabIcon size={14} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Demo Content Cards */}
          <div style={{ padding: 28 }}>
            {interactiveTab === 'dora' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7', fontSize: '0.72rem', fontWeight: 800, width: 'fit-content' }}>
                    <Brain size={13} /> SOCRATIC LIVE SCREEN AI MENTOR
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    Dora AI — Line-by-Line Screen &amp; Code Inspector
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    Dora inspects your live Monaco editor screen line-by-line and asks Socratic questions to build intuition step-by-step. Choose between Qwen 2.5 Coder, DeepSeek R1, Llama 3.3 70B, or Gemini 2.5 Flash.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Live Verification</span>
                      <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981', margin: '2px 0 0' }}>Line Verification ON 🟢</p>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Free Models</span>
                      <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#a855f7', margin: '2px 0 0' }}>Qwen &amp; DeepSeek R1</p>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-secondary)', border: '1.5px solid #a855f7', borderRadius: 16, padding: 16,
                  display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 10px 30px rgba(168,85,247,0.15)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '1.1rem' }}>🤖</span>
                      <strong style={{ fontSize: '0.82rem', color: '#a855f7' }}>Dora AI Socratic Assistant</strong>
                    </div>
                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(168,85,247,0.15)', color: '#a855f7', fontWeight: 800 }}>
                      Qwen 2.5 Coder
                    </span>
                  </div>

                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, fontSize: '0.78rem', lineHeight: 1.5 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 700, marginBottom: 4 }}>User asked: "line 9"</div>
                    <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>
                      🤖 <strong>Dora AI</strong>: In your C++ code on line 9, you declared <code style={{ color: '#a855f7' }}>int maxLen = 0;</code>. What condition will you use in your loop to update <code style={{ color: '#a855f7' }}>maxLen</code> when adjacent elements match?
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: '0.68rem', padding: '4px 10px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700 }}>
                      ✓ Monaco Screen Inspected (9 lines C++)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {interactiveTab === 'proctoring' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(10,185,129,0.3)', color: '#10b981', fontSize: '0.72rem', fontWeight: 800, width: 'fit-content' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'ping 1s infinite' }} />
                    PROCTORING MONITOR ACTIVE
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    Biometric Verification &amp; Anti-Cheating Logs
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    Continuous webcam facial presence tracking combined with active tab-switch detection and copy-paste violation logging.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Face Presence</span>
                      <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981', margin: '2px 0 0' }}>Verified Single Face</p>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tab Switches</span>
                      <p style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--brand)', margin: '2px 0 0' }}>0 Violations Logged</p>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 16,
                  display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> LIVE WEBCAM RECORDING
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>1080p · 30 FPS</span>
                  </div>
                  <div style={{
                    height: 180, borderRadius: 12, background: 'var(--bg-primary)', border: '2px dashed #10b981',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <Brain style={{ width: 36, height: 36, color: '#10b981' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981' }}>Candidate Face Tracked</span>
                  </div>
                </div>
              </div>
            )}

            {interactiveTab === 'dsa' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', color: 'var(--brand)', fontSize: '0.72rem', fontWeight: 800, width: 'fit-content' }}>
                    <Code2 size={13} /> 4,000+ LEETCODE PROBLEMS
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    Monaco Code Editor &amp; Judge0 Execution
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    Write solutions in TypeScript, C++, Python, or Java with instant test case execution and Time/Space complexity O(n) benchmarking.
                  </p>
                  <button
                    onClick={handleRunCodeDemo}
                    disabled={codeTestRunning}
                    style={{
                      padding: '10px 18px', borderRadius: 10, background: '#10b981', color: '#fff',
                      border: 'none', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content',
                    }}
                  >
                    {codeTestRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                    <span>{codeTestRunning ? 'Executing Test Cases...' : 'Run Sample Test Cases'}</span>
                  </button>
                </div>

                <div style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 16,
                  fontFamily: 'monospace', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--brand)', fontWeight: 700 }}>#1 Two Sum · TypeScript</span>
                    <span style={{ color: 'var(--text-muted)' }}>Target: O(n) Time</span>
                  </div>
                  <pre style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.5 }}>
{`function twoSum(nums: number[], target: number) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) return [map.get(diff), i];
    map.set(nums[i], i);
  }
}`}
                  </pre>
                  {codeTestsPassed && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontWeight: 800, fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>✓ 3/3 Test Cases Passed</span>
                      <span>Runtime: 42ms</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {interactiveTab === 'ats' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', color: '#059669', fontSize: '0.72rem', fontWeight: 800, width: 'fit-content' }}>
                    <FileText size={13} /> HONEST ATS ENGINE
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    Uninflated ATS Match Scoring &amp; PDF Report
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    Extract contact details, key technical skills, experience cards, and formatting quality to generate honest scores and printable PDF evaluations.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Senior Fullstack Engineer Match</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669' }}>88/100</span>
                  </div>
                  <div style={{ background: 'var(--bg-primary)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: '88%', height: '100%', background: '#059669' }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'].map(sk => (
                      <span key={sk} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                        ✓ {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {interactiveTab === 'video' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#7c3aed', fontSize: '0.72rem', fontWeight: 800, width: 'fit-content' }}>
                    <Video size={13} /> VIDEO RESPONSE PLAYER
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                    Candidate Video Response Playback
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    Watch stored webcam video responses per candidate question with automated speech transcription and AI evaluation summary.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>Q2. Explain REST vs GraphQL</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', padding: '2px 8px', borderRadius: 6 }}>Webcam Recording</span>
                  </div>
                  <div style={{ height: 160, borderRadius: 10, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={32} style={{ color: '#fff', cursor: 'pointer' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SERVICES MATRIX SECTION ─────────────────────── */}
      <section id="services" style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Complete Capability Matrix
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0 0' }}>
            Everything You Need for Candidate Assessment &amp; Skill Practice
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {services.map((svc, i) => {
            const Icon = svc.icon;
            return (
              <div
                key={i}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', gap: 14, transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = svc.color; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: svc.bg, border: `1px solid ${svc.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: svc.color,
                  }}>
                    <Icon size={22} />
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: svc.bg, color: svc.color, border: `1px solid ${svc.border}` }}>
                    {svc.badge}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{svc.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{svc.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── ROI SAVINGS CALCULATOR SECTION ─────────────── */}
      <section id="roi" style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 24, padding: 36, boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Interactive ROI Calculator
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '6px 0 0' }}>
              Calculate Your Hiring &amp; Time Savings
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Monthly Hires</label>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--brand)' }}>{monthlyHires} hires/mo</span>
                </div>
                <input type="range" min="1" max="25" value={monthlyHires} onChange={e => setMonthlyHires(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--brand)' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Interview Hours per Candidate</label>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--brand)' }}>{hoursPerInterview} hrs</span>
                </div>
                <input type="range" min="1" max="10" value={hoursPerInterview} onChange={e => setHoursPerInterview(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--brand)' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Recruiter Hourly Rate ($)</label>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--brand)' }}>${recruiterRate}/hr</span>
                </div>
                <input type="range" min="20" max="150" value={recruiterRate} onChange={e => setRecruiterRate(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--brand)' }} />
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', borderRadius: 20, padding: 28, color: '#fff',
              display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 12px 36px rgba(37,99,235,0.3)',
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85 }}>Estimated Monthly Savings</span>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.1 }}>${monthlySavings.toLocaleString()}</div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Annual Savings</span>
                  <p style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>${annualSavings.toLocaleString()}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Hours Saved</span>
                  <p style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>{hoursSaved} hrs/mo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANS COMPARISON MATRIX (Students vs Organisations) ── */}
      <section id="matrix" style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Account Differentiation
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '6px 0 0' }}>
            Student Pass vs Organisation Plan
          </h2>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 800, color: 'var(--text-primary)' }}>Features &amp; Services</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 800, color: 'var(--brand)', width: '30%' }}>Student Pass ($20/mo)</th>
                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 800, color: '#7c3aed', width: '30%' }}>Organisation ($100/mo)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: '4,000+ LeetCode DSA Practice Bank', s: true, o: true },
                { f: 'Custom Interview Template Creation', s: true, o: true },
                { f: 'Generate Shareable Session Links (/session/:token)', s: true, o: true },
                { f: 'AI Resume Parser & Honest ATS Scoring', s: true, o: true },
                { f: 'Download Printable Evaluation PDF Reports', s: true, o: true },
                { f: 'Full Applicant Tracking Pipeline (ATS)', s: false, o: true },
                { f: 'Candidate Video Response Recording & Playback', s: 'Self-Review', o: 'Full Playback' },
                { f: 'Proctoring Integrity & Violation Event Logs', s: false, o: true },
                { f: 'Recruiter Score Overrides', s: false, o: true },
                { f: 'Single Account / Multi-user Workspace', s: 'Single Student', o: 'Full Company' },
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.f}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    {typeof row.s === 'boolean' ? (
                      row.s ? <CheckCircle2 size={18} style={{ color: '#10b981', margin: '0 auto' }} /> : <X size={18} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                    ) : <span style={{ fontWeight: 800, color: 'var(--brand)' }}>{row.s}</span>}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    {typeof row.o === 'boolean' ? (
                      row.o ? <CheckCircle2 size={18} style={{ color: '#10b981', margin: '0 auto' }} /> : <X size={18} style={{ color: 'var(--text-muted)', margin: '0 auto' }} />
                    ) : <span style={{ fontWeight: 800, color: '#7c3aed' }}>{row.o}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── PRICING SECTION (Differentiated Amounts) ───── */}
      <section id="pricing" style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Transparent Tiering
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '6px 0 16px' }}>
            Simple Pricing Tailored to Your Needs
          </h2>

          {/* Billing Cycle Switcher */}
          <div style={{
            display: 'inline-flex', padding: 4, borderRadius: 12, background: 'var(--bg-secondary)',
            border: '1px solid var(--border)', gap: 4,
          }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                padding: '8px 18px', borderRadius: 9, border: 'none',
                fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer',
                background: billingCycle === 'monthly' ? 'var(--brand)' : 'transparent',
                color: billingCycle === 'monthly' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              style={{
                padding: '8px 18px', borderRadius: 9, border: 'none',
                fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer',
                background: billingCycle === 'annual' ? 'var(--brand)' : 'transparent',
                color: billingCycle === 'annual' ? '#fff' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              Annual Billing <span style={{ fontSize: '0.65rem', background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: 999 }}>Save 17%</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'stretch' }}>
          {/* Student Pass Card */}
          <div style={{
            background: 'var(--bg-card)', border: '2px solid rgba(37,99,235,0.3)',
            borderRadius: 24, padding: 32, boxShadow: '0 12px 36px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24,
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '4px 12px', borderRadius: 999, background: 'rgba(37,99,235,0.1)', color: 'var(--brand)' }}>
                  Student &amp; Individual
                </span>
                <GraduationCap style={{ width: 24, height: 24, color: 'var(--brand)' }} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Student Pass</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>For individual students, job seekers, and developers.</p>

              <div style={{ margin: '24px 0', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                  ${billingCycle === 'monthly' ? '20' : '16'}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ month</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  'Unlimited 4,000+ LeetCode DSA Problems',
                  'Create Custom Templates & Share Links',
                  'AI Resume Parser & Honest ATS Score',
                  'Instant AI Code Review & Complexity Analysis',
                  'Download Printable PDF Evaluation Reports',
                  'Single Student Account Access',
                ].map((feat, fi) => (
                  <li key={fi} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} /> {feat}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => onNavigate('login')}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, background: 'var(--brand)',
                color: '#fff', border: 'none', fontSize: '0.88rem', fontWeight: 800,
                cursor: 'pointer', boxShadow: '0 4px 16px var(--brand-glow)',
              }}
            >
              Get Student Pass ($20/mo)
            </button>
          </div>

          {/* Organisation Plan Card */}
          <div style={{
            background: 'var(--bg-card)', border: '2px solid rgba(124,58,237,0.4)',
            borderRadius: 24, padding: 32, boxShadow: '0 16px 48px rgba(124,58,237,0.12)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -14, right: 28, background: '#7c3aed', color: '#fff',
              fontSize: '0.68rem', fontWeight: 900, padding: '3px 12px', borderRadius: 999,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Most Popular for Hiring
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '4px 12px', borderRadius: 999, background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
                  Hiring &amp; Enterprise
                </span>
                <Building2 style={{ width: 24, height: 24, color: '#7c3aed' }} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Organisation Plan</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>For hiring managers, recruiters, and engineering teams.</p>

              <div style={{ margin: '24px 0', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                  ${billingCycle === 'monthly' ? '100' : '83'}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ month</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  'Everything in Student Pass included',
                  'Full Applicant Tracking Pipeline (ATS)',
                  'Recorded Candidate Video Response Playback',
                  'Proctoring Integrity Logs (Tab Switches, Copy-Paste)',
                  'Recruiter AI Score Overrides & Feedback Notes',
                  'Bulk Resume Upload & Candidate Dispatch',
                  'Multi-user Workspace & Team Analytics',
                ].map((feat, fi) => (
                  <li key={fi} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={16} style={{ color: '#7c3aed', flexShrink: 0 }} /> {feat}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => onNavigate('login')}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, background: '#7c3aed',
                color: '#fff', border: 'none', fontSize: '0.88rem', fontWeight: 800,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
              }}
            >
              Get Organisation Plan ($100/mo)
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION ───────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Frequently Asked Questions
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '6px 0 0' }}>
            Got Questions? We Have Answers.
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 16, overflow: 'hidden', transition: 'all 0.2s',
                }}
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  style={{
                    width: '100%', padding: '18px 20px', background: 'transparent',
                    border: 'none', textAlign: 'left', fontSize: '0.95rem', fontWeight: 800,
                    color: 'var(--text-primary)', cursor: 'pointer', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  }}
                >
                  <span>{faq.q}</span>
                  <ChevronRight size={18} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
                </button>
                {isOpen && (
                  <div style={{ padding: '0 20px 18px', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Brain size={20} />
              </div>
              <span style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                Talent<span style={{ color: 'var(--brand)' }}>AI</span> Assessment Platform
              </span>
            </div>

            <div style={{ display: 'flex', gap: 20, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              <a href="#services" style={{ color: 'inherit', textDecoration: 'none' }}>Services</a>
              <a href="#pricing" style={{ color: 'inherit', textDecoration: 'none' }}>Pricing</a>
              <a href="#matrix" style={{ color: 'inherit', textDecoration: 'none' }}>Plans Compared</a>
              <span onClick={() => onNavigate('login')} style={{ cursor: 'pointer', color: 'var(--brand)' }}>Sign In</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>&copy; {new Date().getFullYear()} TalentAI Assessment Engine. All rights reserved.</span>
            <span>Built for Modern Hiring Teams &amp; Student Coders</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
