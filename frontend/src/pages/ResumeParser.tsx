import React, { useState } from 'react';
import {
  FileText, Upload, CheckCircle, Brain, Sliders, Sparkles,
  RefreshCw, Mail, Phone, Target, AlertCircle, Briefcase,
  GraduationCap, Award, Copy, Check, CheckCircle2, XCircle,
  BarChart2, UserCheck, Layers, Clock, ShieldCheck, Download,
  ExternalLink, Code2, Database, Cloud, Terminal, Compass,
  TrendingUp, ArrowRight, Printer
} from 'lucide-react';

interface ResumeParserProps {
  token: string;
}

const DESIGNATION_PRESETS = [
  'Software Engineer',
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'DevOps Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Data Engineer',
  'Mobile Developer',
  'Cloud Architect',
  'QA Automation Engineer',
  'Cybersecurity Analyst',
  'Product Manager',
  'Systems Engineer',
];

export default function ResumeParser({ token }: ResumeParserProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [reScoring, setReScoring] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsBreakdown, setAtsBreakdown] = useState<any>(null);
  const [error, setError] = useState('');

  const [jobTitle, setJobTitle] = useState('Software Engineer');
  const [activeTab, setActiveTab] = useState<'ats' | 'skills' | 'experience' | 'education' | 'projects'>('ats');
  const [copied, setCopied] = useState(false);

  const handleReScore = async (targetRole?: string) => {
    const roleToScore = targetRole || jobTitle;
    if (!parsedResult?.extractedText) return;
    setReScoring(true);
    try {
      const res = await fetch('/api/candidates/score-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeText: parsedResult.extractedText,
          jobTitle: roleToScore,
        }),
      });

      const data = await res.json();
      if (res.ok && data.atsResult) {
        setAtsScore(data.atsResult.overallScore);
        setAtsBreakdown(data.atsResult);
      }
    } catch (err) {
      console.error('Failed to re-score ATS:', err);
    } finally {
      setReScoring(false);
    }
  };

  const handleSelectRole = (preset: string) => {
    setJobTitle(preset);
    if (parsedResult?.extractedText) {
      handleReScore(preset);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError('');
      setParsedResult(null);
      setAtsScore(null);
      setAtsBreakdown(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setError('');
    setProgressPercent(15);
    setCurrentStage('Extracting document text stream & OCR...');
    setParsedResult(null);
    setAtsScore(null);
    setAtsBreakdown(null);

    const formData = new FormData();
    formData.append('resume', selectedFile);
    formData.append('jobTitle', jobTitle);

    // Simulated snappy progress steps during fetch
    const step1 = setTimeout(() => {
      setProgressPercent(45);
      setCurrentStage('Segregating essential entities (skills, experience, education)...');
    }, 400);

    const step2 = setTimeout(() => {
      setProgressPercent(75);
      setCurrentStage(`Aligning keyword taxonomy with ${jobTitle}...`);
    }, 800);

    try {
      const res = await fetch('/api/candidates/upload-resume', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      clearTimeout(step1);
      clearTimeout(step2);

      if (!res.ok) throw new Error(data.error || 'Failed to parse resume');

      setProgressPercent(100);
      setCurrentStage('Finalizing honest ATS score & report...');

      setTimeout(() => {
        setParsedResult(data.parsed);
        if (data.atsResult) {
          setAtsScore(data.atsResult.overallScore);
          setAtsBreakdown(data.atsResult);
        }
        setLoading(false);
      }, 300);
    } catch (err: any) {
      clearTimeout(step1);
      clearTimeout(step2);
      setError(err.message || 'Error occurred during parsing');
      setLoading(false);
    }
  };

  // Generate & Download Professional PDF Report
  const handleDownloadPDF = () => {
    if (!parsedResult || !atsBreakdown) return;

    const printWindow = window.open('', '_blank', 'width=950,height=1050');
    if (!printWindow) {
      alert('Please allow popups to export the candidate evaluation PDF report.');
      return;
    }

    const skillsList = parsedResult.skills || [];
    const matchedKws = atsBreakdown.matchedKeywords || [];
    const missingKws = atsBreakdown.missingKeywords || [];
    const strengths = atsBreakdown.strengths || [];
    const improvements = atsBreakdown.improvements || [];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ATS Evaluation Dossier — ${parsedResult.name}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a; line-height: 1.5; padding: 20px; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 20px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: #f3e8ff; color: #7c3aed; }
          .score-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .score-number { font-size: 42px; font-weight: 900; color: #7c3aed; line-height: 1; }
          .progress-bar { background: #e2e8f0; border-radius: 6px; height: 8px; width: 100%; overflow: hidden; margin-top: 4px; }
          .progress-fill { background: #7c3aed; height: 100%; }
          .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 20px 0 10px; }
          .tag { display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; border-radius: 6px; background: #f1f5f9; color: #334155; margin: 2px; }
          .tag-matched { background: #dcfce7; color: #166534; }
          .tag-missing { background: #fee2e2; color: #991b1b; }
          ul { margin: 6px 0; padding-left: 20px; font-size: 12px; color: #334155; }
          li { margin-bottom: 4px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="badge">TalentAI Autonomous ATS Dossier</div>
            <h1 style="margin: 6px 0 2px; font-size: 24px; font-weight: 900;">${parsedResult.name}</h1>
            <p style="margin: 0; font-size: 13px; color: #64748b;">
              ${parsedResult.email} · ${parsedResult.phone}
            </p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Evaluated Target Role</p>
            <p style="margin: 2px 0 0; font-size: 16px; font-weight: 800; color: #7c3aed;">${jobTitle}</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #94a3b8;">${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div class="score-card">
          <div>
            <p style="margin: 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b;">Genuine ATS Fit Score</p>
            <div class="score-number">${atsScore}%</div>
            <p style="margin: 4px 0 0; font-size: 13px; font-weight: 800; color: #16a34a;">${atsBreakdown.level}</p>
          </div>
          <div style="width: 55%; font-size: 12px;">
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700;">
                <span>Skills Alignment</span><span>${atsBreakdown.breakdown?.skills || 0}%</span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width: ${atsBreakdown.breakdown?.skills || 0}%;"></div></div>
            </div>
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-weight: 700;">
                <span>Experience Relevancy</span><span>${atsBreakdown.breakdown?.experience || 0}%</span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width: ${atsBreakdown.breakdown?.experience || 0}%; background: #2563eb;"></div></div>
            </div>
            <div>
              <div style="display: flex; justify-content: space-between; font-weight: 700;">
                <span>Quantifiable Impact</span><span>${atsBreakdown.breakdown?.quantifiedImpact || 0}%</span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width: ${atsBreakdown.breakdown?.quantifiedImpact || 0}%; background: #10b981;"></div></div>
            </div>
          </div>
        </div>

        <div class="section-title">Executive Profile Summary</div>
        <p style="font-size: 12px; color: #334155; line-height: 1.6; margin: 4px 0 16px;">
          ${parsedResult.summary}
        </p>

        <div class="section-title">Verified Skills Taxonomy (${skillsList.length})</div>
        <div style="margin-bottom: 16px;">
          ${skillsList.map((s: string) => `<span class="tag">${s}</span>`).join(' ')}
        </div>

        <div style="display: flex; gap: 20px; margin-bottom: 16px;">
          <div style="flex: 1;">
            <div class="section-title" style="color: #166534; border-color: #bbf7d0;">Candidate Strengths</div>
            <ul>
              ${strengths.map((s: string) => `<li>${s}</li>`).join('')}
            </ul>
          </div>
          <div style="flex: 1;">
            <div class="section-title" style="color: #991b1b; border-color: #fecaca;">Critical Gaps & Recommended Fixes</div>
            <ul>
              ${improvements.map((imp: string) => `<li>${imp}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="section-title">Target Role Keyword Match Analysis</div>
        <div style="margin-bottom: 14px;">
          <p style="font-size: 11px; font-weight: 700; margin: 4px 0; color: #166534;">Matched Keywords:</p>
          ${matchedKws.map((k: string) => `<span class="tag tag-matched">✓ ${k}</span>`).join(' ')}
        </div>
        <div style="margin-bottom: 14px;">
          <p style="font-size: 11px; font-weight: 700; margin: 4px 0; color: #991b1b;">Missing Role Keywords:</p>
          ${missingKws.map((k: string) => `<span class="tag tag-missing">✕ ${k}</span>`).join(' ')}
        </div>

        <div class="section-title">Work Experience History</div>
        <pre style="font-family: inherit; font-size: 11px; white-space: pre-line; color: #334155; margin: 6px 0 16px;">${parsedResult.experience}</pre>

        <div class="section-title">Academic & Education Credentials</div>
        <pre style="font-family: inherit; font-size: 11px; white-space: pre-line; color: #334155; margin: 6px 0;">${parsedResult.education}</pre>

        <div style="text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px;">
          Generated automatically by TalentAI Autonomous ATS Screening Engine.
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleCopySummary = () => {
    if (!parsedResult?.summary) return;
    navigator.clipboard.writeText(parsedResult.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreTheme = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-500', stroke: '#10b981', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    if (score >= 60) return { text: 'text-amber-500', stroke: '#f59e0b', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { text: 'text-rose-500', stroke: '#f43f5e', bg: 'bg-rose-500/10 border-rose-500/30' };
  };

  const scoreTheme = atsScore !== null ? getScoreTheme(atsScore) : null;

  return (
    <div className="p-6 md:p-8 space-y-8 w-full overflow-y-auto min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 font-sans">
      
      {/* ── Top Header ── */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Rebuilt Multi-Pass ATS Engine
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
            ATS Resume Parser & Optimizer
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Deep entity extraction, genuine honest scoring, role keyword gap analysis, and 1-click PDF dossier export.
          </p>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── Left Sidebar (Upload & Config) ── */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Target Designation Selector */}
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] space-y-4 shadow-sm">
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <Target className="w-4 h-4 text-[var(--brand)]" /> Target Job Designation
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Resume will be scored honestly against this role</p>
            </div>

            <input 
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] font-semibold transition-all"
              placeholder="e.g. Frontend Engineer, Full Stack Engineer"
            />

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DESIGNATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectRole(preset)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                    jobTitle === preset 
                      ? 'bg-[var(--brand)] border-[var(--brand)] text-white shadow-sm' 
                      : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Instant ATS Re-scoring Button */}
            {parsedResult?.extractedText && (
              <button
                type="button"
                onClick={() => handleReScore()}
                disabled={reScoring}
                className="w-full mt-2 py-2.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reScoring ? 'animate-spin' : ''}`} />
                {reScoring ? `Evaluating ATS Fit for ${jobTitle}...` : `⚡ Re-Score ATS for "${jobTitle}"`}
              </button>
            )}
          </div>

          {/* Upload Dropzone */}
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] space-y-5 shadow-sm">
            <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <Upload className="w-4 h-4 text-purple-500" /> Upload Resume Document
            </h3>

            <form onSubmit={handleUpload} className="space-y-4">
              <label className="border-2 border-dashed border-[var(--border)] hover:border-[var(--brand)] bg-[var(--bg-primary)] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
                <input 
                  type="file" 
                  accept=".pdf,.docx,.doc,.txt" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[var(--brand)] group-hover:scale-110 transition-transform mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <p className="text-xs font-bold text-[var(--text-primary)] max-w-[220px] truncate">
                  {selectedFile ? selectedFile.name : 'Choose PDF, Word, or TXT file'}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">PDF, DOCX, TXT supported</p>
              </label>

              {selectedFile && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-[var(--brand)] hover:bg-purple-600 text-xs font-black text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing Resume...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Run Autonomous ATS Evaluation
                    </>
                  )}
                </button>
              )}
            </form>

            <div className="p-3.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] text-[11px] text-[var(--text-muted)] leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <span>Multi-pass OCR decompresses binary streams, extracts real text, and evaluates candidate fit against industry standards.</span>
            </div>
          </div>
        </div>

        {/* ── Right Content Area ── */}
        <div className="lg:col-span-8">
          <div className="p-6 md:p-8 rounded-2xl border border-[var(--border)] min-h-[620px] bg-[var(--bg-card)] flex flex-col justify-between shadow-sm">
            
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ── Snappy Loading Screen ── */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 my-auto space-y-6 text-center">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                  <Brain className="w-8 h-8 text-[var(--brand)] animate-pulse" />
                </div>

                <div className="space-y-2 max-w-md">
                  <h3 className="text-xl font-black text-[var(--text-primary)]">Analyzing Candidate Resume</h3>
                  <p className="text-xs text-[var(--text-muted)] font-mono">{currentStage}</p>
                </div>

                {/* Progress bar */}
                <div className="w-full max-w-sm space-y-2">
                  <div className="w-full h-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-bold">
                    <span>Multi-Pass OCR Scan</span>
                    <span>{progressPercent}%</span>
                  </div>
                </div>
              </div>
            ) : !parsedResult ? (
              /* ── Empty State ── */
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-2xl py-32 text-center my-auto">
                <div className="w-20 h-20 rounded-3xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] mb-4 shadow-sm">
                  <FileText className="w-10 h-10 text-purple-500" />
                </div>
                <h4 className="text-lg font-bold text-[var(--text-primary)]">Ready to Parse & Score Resume</h4>
                <p className="text-xs max-w-md mt-1.5 text-[var(--text-muted)] leading-relaxed">
                  Select a candidate resume PDF, Word, or TXT file to automatically segregate essential details (skills, work history, degrees) and compute an honest, non-constant ATS score.
                </p>
              </div>
            ) : (
              /* ── Parsed Results & Scorecard ── */
              <div className="space-y-6">
                
                {/* ── Candidate Header Banner ── */}
                <div className="flex justify-between items-start flex-wrap gap-6 border-b border-[var(--border)] pb-6">
                  <div>
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-black px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Segregation Complete
                    </span>
                    <h2 className="text-3xl font-black text-[var(--text-primary)] mt-2 tracking-tight">
                      {parsedResult.name}
                    </h2>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-[var(--brand)]" /> {parsedResult.email}</span>
                      <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-[var(--brand)]" /> {parsedResult.phone}</span>
                      {parsedResult.links?.map((link: string, li: number) => (
                        <a key={li} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[var(--brand)] hover:underline">
                          <ExternalLink className="w-3 h-3" /> Link #{li + 1}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Circular Score Badge */}
                  {atsScore !== null && scoreTheme && (
                    <div className="flex items-center gap-4 bg-[var(--bg-primary)] border border-[var(--border)] p-4 rounded-2xl shadow-sm">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-[var(--border)]"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            strokeWidth="3.5"
                            strokeDasharray={`${atsScore}, 100`}
                            strokeLinecap="round"
                            stroke={scoreTheme.stroke}
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className={`absolute text-base font-black ${scoreTheme.text}`}>{atsScore}%</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-wider">ATS Fit Level</p>
                        <p className={`text-sm font-black mt-0.5 ${scoreTheme.text}`}>{atsBreakdown?.level || 'Evaluated'}</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-semibold">{jobTitle}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Action & Tab Navigation Bar ── */}
                <div className="flex items-center justify-between flex-wrap gap-3 bg-[var(--bg-primary)] p-2 rounded-xl border border-[var(--border)]">
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: 'ats', label: 'ATS Breakdown', icon: BarChart2 },
                      { id: 'skills', label: 'Segregated Skills', icon: Sliders },
                      { id: 'experience', label: 'Work Experience', icon: Briefcase },
                      { id: 'education', label: 'Education Credentials', icon: GraduationCap },
                      { id: 'projects', label: 'Projects', icon: Code2 },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === tab.id 
                              ? 'bg-[var(--brand)] text-white shadow-md' 
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" /> {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCopySummary}
                      className="px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    {/* DOWNLOAD IN PDF (Explicitly requested by user) */}
                    <button 
                      onClick={handleDownloadPDF}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black rounded-lg flex items-center gap-1.5 shadow-md shadow-purple-600/25 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF Report
                    </button>
                  </div>
                </div>

                {/* ── TAB 1: ATS Analysis ── */}
                {activeTab === 'ats' && atsBreakdown && (
                  <div className="space-y-6">
                    {/* Role ATS Engine Header */}
                    <div className="flex justify-between items-center flex-wrap gap-2 p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-purple-300">
                          Enterprise ATS Screening Standard for: <span className="text-white underline">{jobTitle}</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-purple-300 font-mono">
                        Multi-Factor Scoring (Skills 40% · Exp 25% · Impact 15% · Edu 10% · Format 10%)
                      </span>
                    </div>

                    {/* Honest Review Card */}
                    <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2">
                      <h4 className="text-xs font-black text-purple-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Brain className="w-4 h-4" /> Honest Critical Assessment
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {atsBreakdown.honestReview}
                      </p>
                    </div>

                    {/* Sub-score Progress Bars */}
                    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                        <Award className="w-4 h-4 text-[var(--brand)]" /> Category Score Breakdown
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { label: 'Technical Skills Alignment', score: atsBreakdown.breakdown?.skills || 0, color: 'bg-emerald-500' },
                          { label: 'Work Experience Depth', score: atsBreakdown.breakdown?.experience || 0, color: 'bg-blue-500' },
                          { label: 'Academic & Education', score: atsBreakdown.breakdown?.education || 0, color: 'bg-purple-500' },
                          { label: 'Quantifiable Metrics & Impact', score: atsBreakdown.breakdown?.quantifiedImpact || 0, color: 'bg-indigo-500' },
                          { label: 'ATS Formatting & Structure', score: atsBreakdown.breakdown?.formatting || 0, color: 'bg-teal-500' },
                          { label: 'Keyword Match Density', score: atsBreakdown.breakdown?.keywords || 0, color: 'bg-amber-500' },
                        ].map((metric) => (
                          <div key={metric.label} className="bg-[var(--bg-card)] p-3.5 rounded-xl border border-[var(--border)] space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-[var(--text-primary)]">{metric.label}</span>
                              <span className="font-mono text-[var(--text-primary)]">{metric.score}/100</span>
                            </div>
                            <div className="w-full h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border)]">
                              <div 
                                className={`h-full rounded-full transition-all duration-700 ${metric.color}`} 
                                style={{ width: `${metric.score}%` }} 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strengths & Actionable Improvements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="bg-[var(--bg-primary)] p-5 rounded-2xl border border-emerald-500/30 space-y-3">
                        <h4 className="text-xs font-black text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Key Strengths
                        </h4>
                        <ul className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                          {atsBreakdown.strengths?.map((s: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-500 font-bold">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-[var(--bg-primary)] p-5 rounded-2xl border border-rose-500/30 space-y-3">
                        <h4 className="text-xs font-black text-rose-500 uppercase tracking-wider flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-500" /> Actionable Improvements & Gaps
                        </h4>
                        <ul className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                          {atsBreakdown.improvements?.map((imp: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-rose-500 font-bold">•</span>
                              <span>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Matched vs Missing Keywords */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border)] space-y-2">
                        <p className="text-xs font-bold text-emerald-500">Matched Role Keywords ({atsBreakdown.matchedKeywords?.length || 0}):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {atsBreakdown.matchedKeywords?.map((kw: string) => (
                            <span key={kw} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                              ✓ {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border)] space-y-2">
                        <p className="text-xs font-bold text-rose-500">Missing Recommended Keywords ({atsBreakdown.missingKeywords?.length || 0}):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {atsBreakdown.missingKeywords?.map((kw: string) => (
                            <span key={kw} className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold">
                              ✕ {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 2: Segregated Skills ── */}
                {activeTab === 'skills' && (
                  <div className="space-y-6">
                    {/* Verbatim Extracted Keywords Card */}
                    <div className="bg-[var(--bg-primary)] border border-purple-500/30 rounded-2xl p-5 space-y-3 shadow-sm">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-purple-400">
                          <CheckCircle2 className="w-4 h-4 text-purple-400" /> Verbatim Extracted Keywords ({parsedResult.skills?.length || 0})
                        </h4>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          Extracted As-Is from Document
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        These keywords and technical competencies were extracted verbatim from your uploaded document without substitution or placeholder mock data.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {parsedResult.skills && parsedResult.skills.length > 0 ? (
                          parsedResult.skills.map((s: string) => (
                            <span key={s} className="px-3 py-1 bg-[var(--bg-card)] border border-purple-500/20 text-purple-300 rounded-xl text-xs font-bold shadow-sm">
                              {s}
                            </span>
                          ))
                        ) : (
                          <p className="text-xs text-[var(--text-muted)] italic">No explicit skills section found in resume.</p>
                        )}
                      </div>
                    </div>

                    {parsedResult.categorizedSkills ? (
                      <div className="space-y-4">
                        {[
                          { title: 'Programming Languages', list: parsedResult.categorizedSkills.languages, icon: Code2, color: 'text-purple-400' },
                          { title: 'Frameworks & Web Technologies', list: parsedResult.categorizedSkills.frameworks, icon: Layers, color: 'text-blue-400' },
                          { title: 'Databases & Storage', list: parsedResult.categorizedSkills.databases, icon: Database, color: 'text-emerald-400' },
                          { title: 'Cloud & DevOps Infrastructure', list: parsedResult.categorizedSkills.cloudDevOps, icon: Cloud, color: 'text-amber-400' },
                          { title: 'Tools & Methodologies', list: parsedResult.categorizedSkills.toolsAndOthers, icon: Terminal, color: 'text-indigo-400' },
                        ].map((cat, idx) => {
                          const CatIcon = cat.icon;
                          return (
                            <div key={idx} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
                              <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${cat.color}`}>
                                <CatIcon className="w-4 h-4" /> {cat.title} ({cat.list?.length || 0})
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {cat.list && cat.list.length > 0 ? (
                                  cat.list.map((skill: string) => (
                                    <span key={skill} className="px-3 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-primary)] shadow-sm">
                                      {skill}
                                    </span>
                                  ))
                                ) : (
                                  <p className="text-xs text-[var(--text-muted)] italic">No entries detected in this specific category.</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {parsedResult.skills?.map((s: string) => (
                          <span key={s} className="px-3 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs font-bold">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 3: Work Experience ── */}
                {activeTab === 'experience' && (
                  <div className="space-y-4">
                    {parsedResult.experienceList && parsedResult.experienceList.length > 0 ? (
                      parsedResult.experienceList.map((job: any, jIdx: number) => (
                        <div key={jIdx} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <h4 className="text-sm font-extrabold text-[var(--text-primary)]">{job.role}</h4>
                              <p className="text-xs font-bold text-[var(--brand)]">{job.company}</p>
                            </div>
                            {job.duration && (
                              <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]">
                                {job.duration}
                              </span>
                            )}
                          </div>
                          {job.highlights && job.highlights.length > 0 && (
                            <ul className="space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed pl-4 list-disc">
                              {job.highlights.map((h: string, hIdx: number) => (
                                <li key={hIdx}>{h}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 text-xs text-[var(--text-secondary)] whitespace-pre-line">
                        {parsedResult.experience}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 4: Education Credentials ── */}
                {activeTab === 'education' && (
                  <div className="space-y-4">
                    {parsedResult.educationList && parsedResult.educationList.length > 0 ? (
                      parsedResult.educationList.map((edu: any, eIdx: number) => (
                        <div key={eIdx} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-2">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <h4 className="text-sm font-extrabold text-[var(--text-primary)]">{edu.degree}</h4>
                              <p className="text-xs text-[var(--brand)] font-bold">{edu.institution}</p>
                            </div>
                            {edu.year && (
                              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]">
                                {edu.year}
                              </span>
                            )}
                          </div>
                          {edu.grade && (
                            <p className="text-xs text-emerald-400 font-semibold">Grade / Score: {edu.grade}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 text-xs text-[var(--text-secondary)] whitespace-pre-line">
                        {parsedResult.education}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 5: Projects & Portfolio ── */}
                {activeTab === 'projects' && (
                  <div className="space-y-4">
                    {parsedResult.projects && parsedResult.projects.length > 0 ? (
                      parsedResult.projects.map((proj: any, pIdx: number) => (
                        <div key={pIdx} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-2">
                          <h4 className="text-sm font-extrabold text-[var(--text-primary)]">{proj.name}</h4>
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{proj.description}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-8 text-center text-xs text-[var(--text-muted)]">
                        No distinct standalone projects section found. Check work experience history for project accomplishments.
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
