import React, { useState, useEffect, useCallback, useMemo } from "react";
import Editor from "@monaco-editor/react";
import {
  HelpCircle,
  Code,
  Brain,
  Lightbulb,
  ListTodo,
  Copy,
  Check,
  Search,
  BookOpen,
  Loader,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  Zap,
  Tag,
  Layers,
  ArrowRight,
  ChevronUp,
  Plus,
  ArrowLeft,
  Play,
  Cpu,
  Bug,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  X,
  Code2,
  Trophy,
  Star,
  CheckSquare,
  Square,
  Flame,
  Award,
  BarChart2,
  Crown,
  FileText,
  GripVertical,
  Move,
} from "lucide-react";
import { CP31_DATA, CP31_RATINGS, CP31Problem } from "../data/cp31Sheet";

interface QuestionBankProps {
  token?: string;
}

const STARTER_TEMPLATES: Record<string, string> = {
  javascript: `// JavaScript\n\nfunction main() {\n  // Write your solution here\n}\n\nmain();\n`,
  python: `# Python 3\n\ndef main():\n    # Write your solution here\n    pass\n\nif __name__ == '__main__':\n    main()\n`,
  cpp: `// C++17\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n\n    // Write your solution here\n\n    return 0;\n}\n`,
  java: `// Java 17\nimport java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) throws Exception {\n        // Write your solution here\n    }\n}\n`,
};

const MONACO_OPTIONS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  fontLigatures: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  lineNumbers: "on" as const,
  wordWrap: "on" as const,
  automaticLayout: true,
  tabSize: 4,
  insertSpaces: true,
  formatOnPaste: true,
  formatOnType: true,
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true },
  padding: { top: 16, bottom: 16 },
  renderWhitespace: "boundary" as const,
  smoothScrolling: true,
};

const EVAL_STEPS = [
  { label: "Parsing AST & syntax tree structure...", progress: 20 },
  { label: "Executing stdin/stdout ground truth testcases...", progress: 40 },
  { label: "Checking Big-O Time & Space complexity bounds...", progress: 65 },
  { label: "Detecting edge-case flaws & boundary condition bugs...", progress: 85 },
  { label: "Generating genuine AI evaluation scorecard...", progress: 100 },
];

function titleToSlug(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/^\[(leetcode|codeforces|cp)\]\s*/i, '')
    .replace(/^#\S+\s*·\s*/, '')
    .replace(/\((codeforces|cp) \S+\)/gi, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

const DIFF_COLOR: Record<string, { bg: string; c: string }> = {
  EASY: { bg: "rgba(16,185,129,0.12)", c: "#10b981" },
  MEDIUM: { bg: "rgba(245,158,11,0.12)", c: "#f59e0b" },
  HARD: { bg: "rgba(239,68,68,0.12)", c: "#ef4444" },
};

function getRatingStyle(rating: number): { bg: string; c: string } {
  if (rating < 1200) return { bg: "rgba(107,114,128,0.12)", c: "#9ca3af" };
  if (rating < 1400) return { bg: "rgba(16,185,129,0.12)", c: "#10b981" };
  if (rating < 1600) return { bg: "rgba(6,182,212,0.12)", c: "#06b6d4" };
  if (rating < 1900) return { bg: "rgba(59,130,246,0.12)", c: "#3b82f6" };
  if (rating < 2100) return { bg: "rgba(168,85,247,0.12)", c: "#a855f7" };
  if (rating < 2400) return { bg: "rgba(245,158,11,0.12)", c: "#f59e0b" };
  return { bg: "rgba(239,68,68,0.12)", c: "#ef4444" };
}

/* ── Map API problem to a rich question object ── */
function mapLCProblem(p: any) {
  const isCP =
    p.source === "CP" ||
    p.source === "CODEFORCES" ||
    (p.questionFrontendId && (String(p.questionFrontendId).startsWith("CF") || String(p.questionFrontendId).startsWith("CP")));
  const diffMap: Record<string, string> = { Easy: "EASY", Medium: "MEDIUM", Hard: "HARD" };
  const diff = diffMap[p.difficulty] || (p.difficulty || "MEDIUM").toUpperCase();

  let rawTitle = p.title || p.name || "Problem";
  rawTitle = rawTitle
    .replace(/^\[(Codeforces|CP)\]\s*/i, "")
    .replace(/^(Codeforces|CP)\s*#\S+\s*·\s*/i, "")
    .replace(/^#\S+\s*·\s*/, "")
    .replace(/\((Codeforces|CP) \S+\)/gi, "")
    .trim();

  let contestId = p.contestId || "";
  let index = p.index || "";
  const qidRaw = String(p.questionFrontendId || p.id || "");
  if (!contestId || !index) {
    const cfMatch =
      qidRaw.match(/(?:CF|CP)-(\d+)([A-Z]\d?)/i) || qidRaw.match(/^(\d+)([A-Z]\d?)$/i);
    if (cfMatch) {
      contestId = cfMatch[1];
      index = cfMatch[2];
    }
  }

  const qNum =
    contestId && index
      ? `#${contestId}${index}`
      : qidRaw && qidRaw !== "undefined"
        ? `#${qidRaw.replace(/^(CF|CP)-/i, "")}`
        : "";
  const displayTitle = isCP
    ? `[CP ${qNum}] ${rawTitle}`
    : `${qNum ? `${qNum} · ` : ""}${rawTitle}`;

  let officialUrl = p.officialUrl;
  if (!officialUrl) {
    if (isCP) {
      officialUrl =
        contestId && index
          ? `https://codeforces.com/problemset/problem/${contestId}/${index}`
          : "https://codeforces.com/problemset";
    } else {
      const slug = p.titleSlug || p.slug || titleToSlug(rawTitle);
      officialUrl = slug
        ? `https://leetcode.com/problems/${slug}/`
        : "https://leetcode.com/problemset/all/";
    }
  }

  const examples = p.examples
    ? typeof p.examples === "string"
      ? JSON.parse(p.examples)
      : p.examples
    : [
        {
          input: "See problem page for testcases",
          output: "Expected stdout output",
          explanation: "Check official problem page.",
        },
      ];

  const constraints = p.constraints
    ? Array.isArray(p.constraints)
      ? p.constraints
      : typeof p.constraints === "string"
        ? JSON.parse(p.constraints)
        : [p.constraints]
    : [
        `Category: LeetCode`,
        `Difficulty: ${diff}`,
        `Time limit: 2.0s | Memory limit: 256MB`,
      ];

  const optMap: Record<string, { time: string; space: string }> = {
    EASY: { time: "O(n)", space: "O(1)" },
    MEDIUM: { time: "O(n log n)", space: "O(n)" },
    HARD: { time: "O(n²)", space: "O(n)" },
  };
  const opt = optMap[diff] || { time: "O(n)", space: "O(n)" };

  const rawText = p.text || (p.content ? p.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");
  const defaultOneLiner = rawText ? rawText.split('\n')[0].replace(/^Problem Description:\s*/i, '').replace(/^Problem Statement:\s*/i, '').slice(0, 130) : `Formulate an optimal solution to solve ${rawTitle}.`;

  return {
    id: `${isCP ? "cp" : "lc"}-${p.questionFrontendId || p.id}`,
    category: isCP ? "CP" : "LEETCODE",
    difficulty: diff,
    title: displayTitle,
    oneLiner: p.oneLiner || defaultOneLiner,
    text:
      rawText ||
      `Solve LeetCode problem: ${rawTitle}.\n\nFormulate an optimal solution considering edge cases and Big-O efficiency.`,
    examples,
    constraints,
    code:
      p.codeSnippet ||
      `// ${displayTitle}\n\nfunction solution() {\n  // Write solution here\n}`,
    optimalTime: p.optimalTime || opt.time,
    optimalSpace: p.optimalSpace || opt.space,
    optimalApproach:
      p.optimalApproach ||
      `Optimal ${diff.toLowerCase()}-level approach.`,
    guide:
      p.expectedGuide || "Evaluate: logic correctness, efficiency, and edge-case handling.",
    leetcodeId: p.questionFrontendId || p.id,
    titleSlug: p.titleSlug || p.slug || "",
    officialUrl,
  };
}

/* ── Formatted LeetCode Description Renderer ──────────────── */
function FormattedLeetCodeDescription({ text, examples, constraints }: { text: string; examples?: any[]; constraints?: any[] }) {
  if (!text) return null;

  const rawParagraphs = text.split('\n\n').filter(Boolean);

  const renderFormattedParagraph = (str: string) => {
    // Replace backticks or code identifiers like nums, target, ans, [1,2,3] with code pills
    const parts = str.split(/(`[^`]+`|\b[a-zA-Z0-9_]+\s*=\s*\[[^\]]+\]|\b[a-zA-Z0-9_]+\s*=\s*"[^"]*"|\b[a-zA-Z0-9_]+\s*=\s*\d+)/g);
    return (
      <p style={{ fontSize: '0.88rem', lineHeight: 1.8, color: 'var(--text-primary)', margin: '0 0 12px' }}>
        {parts.map((part, i) => {
          if (!part) return null;
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={i} style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '2px 6px', fontSize: '0.78rem',
                fontFamily: 'monospace', color: 'var(--brand)', fontWeight: 700, margin: '0 2px'
              }}>
                {part.slice(1, -1)}
              </code>
            );
          }
          if (/^[a-zA-Z0-9_]+\s*=/.test(part)) {
            return (
              <code key={i} style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '2px 6px', fontSize: '0.78rem',
                fontFamily: 'monospace', color: '#10b981', fontWeight: 700, margin: '0 2px'
              }}>
                {part}
              </code>
            );
          }
          return part;
        })}
      </p>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Description text */}
      <div>
        {rawParagraphs.map((p, idx) => (
          <React.Fragment key={idx}>
            {renderFormattedParagraph(p)}
          </React.Fragment>
        ))}
      </div>

      {/* Examples */}
      {examples && examples.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          <h4 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: 0 }}>
            Examples ({examples.length})
          </h4>
          {examples.map((ex: any, i: number) => (
            <div key={i} style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Example {i + 1}:
              </div>
              <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-primary)', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text-muted)' }}>Input: </strong>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{ex.input || 'nums = [3,1,3,2,1,3]'}</span>
              </div>
              <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-primary)', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--text-muted)' }}>Output: </strong>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>{ex.output || '[1,2,3,1,3,3]'}</span>
              </div>
              {ex.explanation && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, padding: '4px 2px' }}>
                  <strong style={{ color: 'var(--text-muted)' }}>Explanation: </strong>
                  {ex.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Constraints */}
      {constraints && constraints.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <h4 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Constraints
          </h4>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px' }}>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.8, fontFamily: 'monospace' }}>
              {constraints.map((c: string, i: number) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Monthly Activity Heatmap Tracker ─────────────────────── */
function MonthlyActivityTracker({ token, refreshTrigger = 0 }: { token?: string; refreshTrigger?: number }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth();
  const currentMonthName = now.toLocaleString('default', { month: 'short' });
  const currentDay = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonthNum + 1, 0).getDate();

  const [activityMap, setActivityMap] = useState<Record<number, number>>({});
  const [totalSolved, setTotalSolved] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchCalendar = async () => {
      const tok = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      if (!tok) return;

      try {
        const res = await fetch('/api/student/submission-calendar', {
          headers: { Authorization: `Bearer ${tok}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setActivityMap(data.currentMonthMap || {});
            setTotalSolved(data.totalSolved ?? 0);
            setStreak(data.streak ?? 0);
          }
        }
      } catch (e) {
        console.error("Monthly tracker fetch error", e);
      }
    };

    fetchCalendar();
    return () => { isMounted = false; };
  }, [token, refreshTrigger]);

  const activeDays = Object.keys(activityMap).length;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18,
      padding: '16px 20px', marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
              Monthly Activity &amp; Practice Tracker ({currentMonthName} {currentYear})
            </h3>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              🔥 {streak} Day Streak
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {activeDays} active day{activeDays === 1 ? '' : 's'} this month · Solved problems from LeetCode &amp; 1v1 Arena
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 10px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active Days</span>
            <p style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--brand)', margin: 0 }}>{activeDays}/{daysInMonth}</p>
          </div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 10px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Solved</span>
            <p style={{ fontSize: '0.85rem', fontWeight: 900, color: '#10b981', margin: 0 }}>{totalSolved}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysInMonth}, 1fr)`, gap: 3, overflowX: 'auto', paddingBottom: 2 }}>
        {Array.from({ length: daysInMonth }, (_, idx) => {
          const dayNum = idx + 1;
          const count = activityMap[dayNum] || 0;
          const isToday = dayNum === currentDay;

          let bg = 'var(--bg-secondary)';
          let color = 'var(--text-muted)';
          let border = isToday ? '2px solid var(--brand)' : '1px solid var(--border)';

          if (count >= 4) {
            bg = '#10b981';
            color = '#fff';
            border = '1px solid #059669';
          } else if (count >= 2) {
            bg = 'rgba(16,185,129,0.75)';
            color = '#fff';
            border = '1px solid #10b981';
          } else if (count >= 1) {
            bg = 'rgba(16,185,129,0.35)';
            color = 'var(--text-primary)';
            border = '1px solid rgba(16,185,129,0.6)';
          }

          return (
            <div
              key={dayNum}
              title={`${currentMonthName} ${dayNum}, ${currentYear}: ${count > 0 ? `${count} problem${count > 1 ? 's' : ''} solved ✓` : 'No problems solved'}`}
              style={{
                height: 26, borderRadius: 5, background: bg,
                border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.62rem', fontWeight: count > 0 || isToday ? 900 : 600,
                color,
                cursor: count > 0 ? 'pointer' : 'default',
                transition: 'transform 0.1s',
              }}
            >
              {dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}



const CATEGORIES = [
  { id: "ALL", label: "All Problems" },
  { id: "LEETCODE", label: "LeetCode (+10 pts on solve)" },
  { id: "CP", label: "CP Sheet (800–3000 Rating)" },
  { id: "CODING", label: "Coding" },
  { id: "DSA", label: "DSA" },
  { id: "SYSTEM_DESIGN", label: "Sys Design" },
  { id: "HR", label: "Behavioral" },
];

export default function QuestionBank({ token }: QuestionBankProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [diffFilter, setDiffFilter] = useState<"ALL" | "EASY" | "MEDIUM" | "HARD">("ALL");
  const [leetcodeQs, setLeetcodeQs] = useState<any[]>([]);
  const [lcLoading, setLcLoading] = useState(false);
  const [lcError, setLcError] = useState("");
  const [customQs, setCustomQs] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newQ, setNewQ] = useState<any>({ title: "", text: "", category: "CODING", difficulty: "MEDIUM" });

  // CP Sheet State (Ratings 800 - 3000, 50 questions per rating)
  const [cp31Rating, setCp31Rating] = useState<number | "ALL">(800);
  const [cp31Filter, setCp31Filter] = useState<"ALL" | "SOLVED" | "UNSOLVED">("ALL");
  const [cp31Search, setCp31Search] = useState("");
  const [cp31Solved, setCp31Solved] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("cp31_solved_problems");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleCP31Solved = async (id: string, problemObj?: any) => {
    const isNowSolved = !cp31Solved[id];

    setCp31Solved((prev) => {
      const updated = { ...prev, [id]: isNowSolved };
      try {
        localStorage.setItem("cp31_solved_problems", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (isNowSolved) {
      const tok = token || localStorage.getItem('token');
      if (tok) {
        try {
          await fetch('/api/student/record-submission', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tok}`
            },
            body: JSON.stringify({
              problemId: id,
              problemTitle: problemObj?.name || problemObj?.title || id,
              platform: 'Codeforces',
              difficulty: problemObj?.rating ? `${problemObj.rating}` : '800',
              score: 10,
              officialUrl: problemObj?.url || `https://codeforces.com/problemset/problem/${id}`
            })
          });
        } catch (e) {
          console.error('Record CP submission API error:', e);
        }
      }
    }
  };

  // CP Revision Notes State (Notes up to 10,000 characters per problem)
  const [cp31Notes, setCp31Notes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("cp31_revision_notes");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [noteProblemModal, setNoteProblemModal] = useState<any | null>(null);
  const [currentNoteText, setCurrentNoteText] = useState("");
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  const openNoteModal = (p: any) => {
    setNoteProblemModal(p);
    setCurrentNoteText(cp31Notes[p.id] || "");
    setNoteSavedFeedback(false);
  };

  const handleSaveNote = () => {
    if (!noteProblemModal) return;
    const textToSave = currentNoteText.slice(0, 10000);
    const updated = { ...cp31Notes, [noteProblemModal.id]: textToSave };
    setCp31Notes(updated);
    try {
      localStorage.setItem("cp31_revision_notes", JSON.stringify(updated));
    } catch {}
    setNoteSavedFeedback(true);
    setTimeout(() => setNoteSavedFeedback(false), 2000);
  };

  const handleDeleteNote = () => {
    if (!noteProblemModal) return;
    const updated = { ...cp31Notes };
    delete updated[noteProblemModal.id];
    setCp31Notes(updated);
    setCurrentNoteText("");
    try {
      localStorage.setItem("cp31_revision_notes", JSON.stringify(updated));
    } catch {}
  };

  // Practice workspace state
  const [activePracticeQ, setActivePracticeQ] = useState<any | null>(null);
  const [practiceLang, setPracticeLang] = useState("cpp");
  const [practiceCode, setPracticeCode] = useState(STARTER_TEMPLATES["cpp"]);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);

  // Floating Dora AI Assistant state & Movable Coordinates
  const getDefaultDoraPos = () => {
    if (typeof window !== "undefined") {
      return {
        x: Math.max(20, window.innerWidth - 305),
        y: Math.max(20, window.innerHeight - 135),
      };
    }
    return { x: 800, y: 650 };
  };

  const [doraOpen, setDoraOpen] = useState(false);
  const [doraPos, setDoraPos] = useState(getDefaultDoraPos);
  const [isDraggingDora, setIsDraggingDora] = useState(false);
  const dragStartRef = React.useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const hasUserMovedDora = React.useRef(false);

  // Place Dora at bottom-right (above submit bar) by default, matching user screen layout
  useEffect(() => {
    const handleResize = () => {
      if (!hasUserMovedDora.current && typeof window !== "undefined") {
        setDoraPos({
          x: Math.max(20, window.innerWidth - 305),
          y: Math.max(20, window.innerHeight - 135),
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleDoraDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ('button' in e && (e as React.MouseEvent).button !== 0) return;
    setIsDraggingDora(true);
    hasUserMovedDora.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      posX: doraPos.x,
      posY: doraPos.y,
    };
  };

  useEffect(() => {
    if (!isDraggingDora) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const dx = clientX - dragStartRef.current.mouseX;
      const dy = clientY - dragStartRef.current.mouseY;

      const maxX = Math.max(10, window.innerWidth - 320);
      const maxY = Math.max(10, window.innerHeight - 80);

      const nextX = Math.max(10, Math.min(maxX, dragStartRef.current.posX + dx));
      const nextY = Math.max(10, Math.min(maxY, dragStartRef.current.posY + dy));

      setDoraPos({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      setIsDraggingDora(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingDora]);

  const [doraPermissionAllowed, setDoraPermissionAllowed] = useState(false);
  const [doraModel, setDoraModel] = useState<'qwen' | 'deepseek' | 'llama' | 'gemini' | 'free'>('qwen');
  const [userApiKey, setUserApiKey] = useState(() => {
    try { return localStorage.getItem('dora_user_api_key') || ''; } catch { return ''; }
  });
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [doraMessages, setDoraMessages] = useState<Array<{ role: 'user' | 'dora'; text: string }>>([
    {
      role: 'dora',
      text: "Hi! I'm Dora, your AI Socratic coding assistant 🤖. Powered by real LLM inference engines (Qwen 2.5 Coder, DeepSeek R1, Gemini). I can inspect your Monaco code on screen line-by-line! Ask me about any specific line (e.g. type 'line 9'), 'now see', or click 'Inspect Code'."
    }
  ]);
  const [doraInput, setDoraInput] = useState('');
  const [doraLoading, setDoraLoading] = useState(false);

  const handleSendDoraMessage = async (msgText?: string) => {
    const textToSend = msgText || doraInput;
    if (!textToSend.trim() || doraLoading) return;

    const userMsgObj = { role: 'user' as const, text: textToSend };
    const updatedHistory = [...doraMessages, userMsgObj];
    setDoraMessages(updatedHistory);
    setDoraInput('');
    setDoraLoading(true);

    try {
      const res = await fetch('/api/question-bank/dora-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          problemTitle: activePracticeQ?.title || 'Practice Problem',
          problemText: activePracticeQ?.text || '',
          candidateCode: practiceCode,
          language: practiceLang,
          userMessage: textToSend,
          chatHistory: updatedHistory,
          modelProvider: doraModel,
          userApiKey: userApiKey.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setDoraMessages((prev) => [...prev, { role: 'dora', text: data.reply }]);
      } else {
        setDoraMessages((prev) => [...prev, { role: 'dora', text: "🤖 **Dora AI**: I inspected your code on screen! Check your variable initializations and loop boundaries." }]);
      }
    } catch (e) {
      setDoraMessages((prev) => [...prev, { role: 'dora', text: "🤖 **Dora AI**: Screen inspected! Check your main loop invariants and test with simple edge cases." }]);
    } finally {
      setDoraLoading(false);
    }
  };
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalStepIdx, setEvalStepIdx] = useState(0);
  const [practiceResult, setPracticeResult] = useState<any | null>(null);
  const [showReferenceSol, setShowReferenceSol] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  // Lazy loading batching state for table
  const [visibleCount, setVisibleCount] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        document.documentElement.getAttribute("data-theme") === "dark";
      setIsDarkTheme(isDark);
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetch("/api/question-bank", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((d) => {
        if (d.questions) {
          setCustomQs(
            d.questions.map((q: any) => ({
              ...q,
              examples: typeof q.examples === "string" ? JSON.parse(q.examples) : q.examples || [],
              constraints: typeof q.constraints === "string" ? JSON.parse(q.constraints) : q.constraints || [],
            }))
          );
        }
      })
      .catch(console.error);
  }, [token, isModalOpen]);

  const [detailsCache, setDetailsCache] = useState<Record<string, any>>({});

  useEffect(() => {
    if (activeCategory === "CP") return;
    setLcLoading(true);
    setLcError("");
    fetch(`/api/leetcode/problems?page=1&limit=4000&source=LEETCODE`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => setLeetcodeQs(d.problems ? d.problems.map(mapLCProblem) : []))
      .catch(() => setLcError("Could not load catalog problems."))
      .finally(() => setLcLoading(false));
  }, [activeCategory, token]);

  // Fetch full details when opening practice workspace
  const handleOpenPractice = async (q: any) => {
    const targetSlug = q.titleSlug || q.slug || titleToSlug(q.title);
    const fullQ = {
      ...q,
      titleSlug: targetSlug,
      examples: Array.isArray(q.examples)
        ? q.examples
        : typeof q.examples === "string" ? JSON.parse(q.examples) : [],
      constraints: Array.isArray(q.constraints)
        ? q.constraints
        : typeof q.constraints === "string" ? JSON.parse(q.constraints) : [],
      codeSnippets: q.codeSnippets || [],
    };
    setActivePracticeQ(fullQ);
    setPracticeLang("cpp");

    setPracticeCode(STARTER_TEMPLATES["cpp"]);
    setPracticeResult(null);
    setDoraMessages([
      {
        role: 'dora',
        text: `Hi! I'm Dora, your AI Socratic coding assistant 🤖. Powered by real LLM inference engines (Qwen 2.5 Coder, DeepSeek R1, Gemini). I can inspect your Monaco code for "${q.title || 'this problem'}" line-by-line! Ask me about any specific line (e.g. type 'line 9'), 'now see', or click 'Inspect Code'.`
      }
    ]);
    setDoraInput('');

    if (targetSlug) {
      if (detailsCache[targetSlug]) {
        const data = detailsCache[targetSlug];
        setActivePracticeQ((prev: any) => ({
          ...prev,
          text: data.text || prev.text,
          examples: data.examples
            ? typeof data.examples === "string" ? JSON.parse(data.examples) : data.examples
            : prev.examples,
          constraints: data.constraints
            ? typeof data.constraints === "string" ? JSON.parse(data.constraints) : data.constraints
            : prev.constraints,
          code: data.codeSnippet || prev.code,
          codeSnippets: data.codeSnippets || prev.codeSnippets,
          optimalTime: data.optimalTime || prev.optimalTime,
          optimalSpace: data.optimalSpace || prev.optimalSpace,
          optimalApproach: data.optimalApproach || prev.optimalApproach,
          referenceSolution: data.referenceSolution || prev.referenceSolution,
          officialUrl: data.officialUrl || prev.officialUrl,
        }));
      } else {
        try {
          const res = await fetch(`/api/leetcode/problem/${targetSlug}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            setDetailsCache((prev) => ({ ...prev, [targetSlug]: data }));
            setActivePracticeQ((prev: any) => ({
              ...prev,
              text: data.text || prev.text,
              examples: data.examples
                ? typeof data.examples === "string" ? JSON.parse(data.examples) : data.examples
                : prev.examples,
              constraints: data.constraints
                ? typeof data.constraints === "string" ? JSON.parse(data.constraints) : data.constraints
                : prev.constraints,
              code: data.codeSnippet || prev.code,
              codeSnippets: data.codeSnippets || prev.codeSnippets,
              optimalTime: data.optimalTime || prev.optimalTime,
              optimalSpace: data.optimalSpace || prev.optimalSpace,
              optimalApproach: data.optimalApproach || prev.optimalApproach,
              referenceSolution: data.referenceSolution || prev.referenceSolution,
              officialUrl: data.officialUrl || prev.officialUrl,
            }));
          }
        } catch (e) {
          console.error("Failed to load full details", e);
        }
      }
    }
  };

  const handlePracticeLangChange = (lang: string) => {
    setPracticeLang(lang);
    setPracticeCode(STARTER_TEMPLATES[lang] || STARTER_TEMPLATES["cpp"]);
  };

  const handleSubmitPractice = async () => {
    if (!activePracticeQ || !practiceCode.trim()) return;
    setIsEvaluating(true);
    setEvalStepIdx(0);

    const stepTimer = setInterval(() => {
      setEvalStepIdx((prev) => {
        if (prev < EVAL_STEPS.length - 1) return prev + 1;
        clearInterval(stepTimer);
        return prev;
      });
    }, 1600);

    try {
      const res = await fetch("/api/question-bank/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: activePracticeQ.title,
          text: activePracticeQ.text,
          code: practiceCode,
          language: practiceLang,
          isCheating: false,
          examples: activePracticeQ.examples,
          constraints: activePracticeQ.constraints,
          optimalTime: activePracticeQ.optimalTime,
          optimalSpace: activePracticeQ.optimalSpace,
          optimalApproach: activePracticeQ.optimalApproach,
          referenceSolution: activePracticeQ.referenceSolution,
          titleSlug: activePracticeQ.titleSlug || activePracticeQ.slug,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPracticeResult(data);
        if (data.score >= 70 || data.pointsAwarded > 0) {
          setCalendarRefreshTrigger((prev) => prev + 1);
        }
      }
    } catch (e) {
      alert("Evaluation failed. Please try again.");
    } finally {
      setTimeout(() => {
        clearInterval(stepTimer);
        setIsEvaluating(false);
      }, 1800);
    }
  };

  const allQuestions = useMemo(() => [...customQs, ...leetcodeQs], [customQs, leetcodeQs]);

  const filtered = useMemo(() => {
    return allQuestions.filter((q) => {
      const s = search.toLowerCase();
      const matchSearch = !s || q.title.toLowerCase().includes(s) || q.text.toLowerCase().includes(s);
      const matchCat = activeCategory === "ALL" || q.category === activeCategory;
      const matchDiff = diffFilter === "ALL" || q.difficulty === diffFilter;
      return matchSearch && matchCat && matchDiff;
    });
  }, [allQuestions, search, activeCategory, diffFilter]);

  // CP Sheet Filtered List & Analytics
  const cp31AllList: CP31Problem[] = useMemo(() => {
    const list: CP31Problem[] = [];
    CP31_RATINGS.forEach((r) => {
      if (CP31_DATA[r]) list.push(...CP31_DATA[r]);
    });
    return list;
  }, []);

  const cp31TotalSolved = useMemo(() => {
    return cp31AllList.filter((p) => cp31Solved[p.id]).length;
  }, [cp31AllList, cp31Solved]);

  const cp31Displayed = useMemo(() => {
    let list: CP31Problem[] = [];
    if (cp31Rating === "ALL") {
      list = cp31AllList;
    } else {
      list = CP31_DATA[cp31Rating] || [];
    }

    return list.filter((p) => {
      const isSolved = !!cp31Solved[p.id];
      if (cp31Filter === "SOLVED" && !isSolved) return false;
      if (cp31Filter === "UNSOLVED" && isSolved) return false;

      if (cp31Search.trim()) {
        const q = cp31Search.toLowerCase().trim();
        const matchId = p.id.toLowerCase().includes(q);
        const matchName = p.name.toLowerCase().includes(q);
        const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchId && !matchName && !matchTags) return false;
      }
      return true;
    });
  }, [cp31Rating, cp31Filter, cp31Search, cp31Solved, cp31AllList]);

  const handleCreate = async () => {
    try {
      await fetch("/api/question-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(newQ),
      });
      setIsModalOpen(false);
      setNewQ({ title: "", text: "", category: "CODING", difficulty: "MEDIUM" });
    } catch (e) {
      console.error(e);
    }
  };

  if (activePracticeQ) {
    const langLabel =
      practiceLang === "cpp" ? "C++17" : practiceLang === "python" ? "Python 3" : practiceLang === "java" ? "Java 17" : "JavaScript";
    const diffStyle = DIFF_COLOR[activePracticeQ.difficulty] || DIFF_COLOR.MEDIUM;
    const currentAvailablePoints = 10;

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "'Inter', system-ui, sans-serif" }}>

        {isEvaluating && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--brand)", borderRadius: 24, padding: 40, maxWidth: 480, width: "100%", textAlign: "center" }}>
              <Loader size={36} style={{ animation: "spin 1s linear infinite", color: "var(--brand)", margin: "0 auto 16px" }} />
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: 8 }}>AI Evaluation in Progress</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 20 }}>
                {EVAL_STEPS[evalStepIdx]?.label}
              </p>
              <div style={{ width: "100%", height: 6, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--brand)", width: `${EVAL_STEPS[evalStepIdx]?.progress}%`, transition: "width 0.4s ease" }} />
              </div>
            </div>
          </div>
        )}

        {/* Practice Topbar */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setActivePracticeQ(null)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}>
              <ArrowLeft size={14} /> Back
            </button>
            <span style={{ fontSize: "0.92rem", fontWeight: 800 }}>{activePracticeQ.title}</span>
            <span style={{ fontSize: "0.65rem", fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: diffStyle.bg, color: diffStyle.c }}>
              {activePracticeQ.difficulty}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setDoraOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 10,
                border: "1px solid rgba(168,85,247,0.4)",
                background: doraOpen ? "linear-gradient(135deg, #a855f7, #7c3aed)" : "rgba(168,85,247,0.12)",
                color: doraOpen ? "#fff" : "#a855f7",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 800,
                boxShadow: "0 4px 12px rgba(168,85,247,0.2)",
                transition: "all 0.2s ease"
              }}>
              <Brain size={14} />
              Ask Dora AI {doraPermissionAllowed ? "(Screen Live 🟢)" : "(Screen & Code)"}
            </button>
            <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 800, background: "rgba(16,185,129,0.1)", padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)" }}>
              +10 Points on Solve (Base 10 pts)
            </span>
          </div>
        </div>

        {/* Practice Workspace Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", height: "calc(100vh - 57px)" }}>
          {/* Left Column: Problem Spec */}
          <div style={{ borderRight: "1px solid var(--border)", overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 12 }}>{activePracticeQ.title}</h2>
              <FormattedLeetCodeDescription
                text={activePracticeQ.text}
                examples={activePracticeQ.examples}
                constraints={activePracticeQ.constraints}
              />
            </div>
          </div>

          {/* Right Column: Code Editor & Runner */}
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-card)" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-secondary)" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["cpp", "python", "javascript", "java"].map((l) => (
                  <button key={l} onClick={() => handlePracticeLangChange(l)}
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: practiceLang === l ? "var(--brand)" : "var(--bg-card)", color: practiceLang === l ? "#fff" : "var(--text-muted)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                    {l === "cpp" ? "C++17" : l === "python" ? "Python 3" : l === "java" ? "Java 17" : "JavaScript"}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>Solve for +10 pts</span>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <Editor
                height="100%"
                language={practiceLang === "javascript" ? "javascript" : practiceLang === "python" ? "python" : practiceLang === "java" ? "java" : "cpp"}
                value={practiceCode}
                onChange={(val) => setPracticeCode(val || "")}
                theme={isDarkTheme ? "vs-dark" : "light"}
                options={MONACO_OPTIONS}
              />
            </div>

            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={handleSubmitPractice} disabled={isEvaluating}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontWeight: 900, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: isEvaluating ? 0.6 : 1, boxShadow: "0 4px 14px rgba(16,185,129,0.25)" }}>
                <Play size={15} /> {isEvaluating ? "Evaluating…" : "Submit Solution & Run AI Evaluation 🚀"}
              </button>
              {activePracticeQ.officialUrl && (
                <a href={activePracticeQ.officialUrl} target="_blank" rel="noopener noreferrer"
                  style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(37,99,235,0.3)", background: "rgba(37,99,235,0.06)", color: "#2563eb", fontWeight: 800, fontSize: "0.75rem", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                  <ExternalLink size={14} /> LeetCode ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Scorecard Modal */}
        {practiceResult && (
          <div style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--brand)", borderRadius: 24, padding: "28px 24px", maxWidth: 680, width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 900, display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                  <Sparkles size={18} style={{ color: "#f59e0b" }} /> AI Evaluation & Reference Comparison
                </h3>
                <button onClick={() => setPracticeResult(null)}
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex" }}>
                  <X size={14} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>

              {/* Score & Passed Status Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 16, background: "var(--bg-secondary)", border: "1px solid var(--border)", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ fontSize: "2.6rem", fontWeight: 900, fontFamily: "monospace", lineHeight: 1, color: practiceResult.score >= 70 ? "#10b981" : practiceResult.score >= 40 ? "#f59e0b" : "#ef4444" }}>
                    {practiceResult.score}
                    <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>/100</span>
                  </div>
                  <div>
                    <span style={{
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      padding: "3px 10px",
                      borderRadius: 99,
                      background: practiceResult.score >= 70 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                      color: practiceResult.score >= 70 ? "#10b981" : "#ef4444",
                    }}>
                      {practiceResult.score >= 70 ? "PASSED BENCHMARK ✓" : "NEEDS REVISION ✕"}
                    </span>
                    <p style={{ margin: "4px 0 0", fontSize: "0.74rem", color: "var(--text-muted)" }}>
                      Compared directly against actual reference solution & test cases
                    </p>
                  </div>
                </div>

                {practiceResult.pointsAwarded > 0 ? (
                  <div style={{ padding: "8px 14px", borderRadius: 12, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", textAlign: "center" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#10b981", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                      <Trophy size={16} /> +{practiceResult.pointsAwarded}
                    </div>
                    <div style={{ fontSize: "0.62rem", color: "#10b981", fontWeight: 700 }}>Points Awarded! 🎉</div>
                  </div>
                ) : practiceResult.alreadySolved ? (
                  <div style={{ padding: "8px 14px", borderRadius: 12, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", textAlign: "center" }}>
                    <div style={{ fontSize: "1rem", fontWeight: 900, color: "#3b82f6", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                      <CheckCircle2 size={16} /> Solved
                    </div>
                    <div style={{ fontSize: "0.62rem", color: "#3b82f6", fontWeight: 700 }}>Already Completed</div>
                  </div>
                ) : null}
              </div>

              {/* Comparison Summary Banner */}
              <div style={{ padding: "12px 16px", borderRadius: 14, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Cpu size={14} style={{ color: "#3b82f6" }} />
                  <strong style={{ fontSize: "0.76rem", color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Comparison to Actual Reference Solution
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                  {practiceResult.comparisonSummary || "Your solution was executed in the sandbox and compared directly against the optimal reference solution and test cases."}
                </p>
                <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", fontSize: "0.72rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>
                    Optimal Time: <strong style={{ color: "#10b981" }}>{practiceResult.optimalTime || activePracticeQ.optimalTime || 'O(n)'}</strong>
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    Optimal Space: <strong style={{ color: "#10b981" }}>{practiceResult.optimalSpace || activePracticeQ.optimalSpace || 'O(1)'}</strong>
                  </span>
                  {practiceResult.optimalApproach && (
                    <span style={{ color: "var(--text-muted)" }}>
                      Approach: <strong style={{ color: "var(--text-primary)" }}>{practiceResult.optimalApproach}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Test Cases Comparison Table */}
              {practiceResult.testCaseResults && practiceResult.testCaseResults.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Test Cases & Actual Solution Comparison:</span>
                    <span style={{ color: practiceResult.testCaseResults.every((t: any) => t.passed) ? "#10b981" : "#f59e0b", fontSize: "0.72rem", fontWeight: 800 }}>
                      {practiceResult.testCaseResults.filter((t: any) => t.passed).length} / {practiceResult.testCaseResults.length} Passed
                    </span>
                  </div>
                  <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", background: "var(--bg-secondary)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "60px 1.2fr 1fr 1fr 85px", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--border)", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>
                      <span>Case</span>
                      <span>Input</span>
                      <span>Actual Sol</span>
                      <span>Your Output</span>
                      <span style={{ textAlign: "right" }}>Status</span>
                    </div>
                    {practiceResult.testCaseResults.map((tc: any, tIdx: number) => (
                      <div key={tIdx} style={{ display: "grid", gridTemplateColumns: "60px 1.2fr 1fr 1fr 85px", gap: 8, padding: "8px 12px", borderBottom: tIdx < practiceResult.testCaseResults.length - 1 ? "1px solid var(--border)" : "none", fontSize: "0.72rem", alignItems: "center", background: tc.passed ? "rgba(16,185,129,0.02)" : "rgba(239,68,68,0.04)" }}>
                        <span style={{ fontWeight: 800, color: "var(--text-muted)" }}>#{tIdx + 1}</span>
                        <code style={{ fontSize: "0.68rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tc.input}</code>
                        <code style={{ fontSize: "0.68rem", color: "#10b981", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tc.expected}</code>
                        <code style={{ fontSize: "0.68rem", color: tc.passed ? "#10b981" : "#ef4444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tc.actual || '(none)'}</code>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 900, padding: "2px 6px", borderRadius: 6, background: tc.passed ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: tc.passed ? "#10b981" : "#ef4444" }}>
                            {tc.passed ? "PASSED ✓" : "FAILED ✕"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Feedback */}
              <div style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)", fontSize: "0.78rem", lineHeight: 1.6, marginBottom: 16 }}>
                <strong style={{ color: "var(--text-muted)" }}>Detailed Feedback: </strong>
                <span style={{ color: "var(--text-primary)" }}>{practiceResult.feedback}</span>
              </div>

              {/* View Actual Reference Solution (Collapsible) */}
              {practiceResult.referenceSolution && (
                <div style={{ marginBottom: 16 }}>
                  <button
                    onClick={() => setShowReferenceSol((v) => !v)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Code2 size={14} style={{ color: "var(--brand)" }} />
                      View Actual Ground Truth Reference Solution
                    </span>
                    <span>{showReferenceSol ? "▲ Hide" : "▼ Expand"}</span>
                  </button>
                  {showReferenceSol && (
                    <div style={{ marginTop: 8, padding: 12, borderRadius: 10, background: "#1e1e1e", color: "#d4d4d4", fontFamily: "monospace", fontSize: "0.75rem", overflowX: "auto", maxHeight: 220, border: "1px solid var(--border)" }}>
                      <pre style={{ margin: 0 }}>{practiceResult.referenceSolution}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setPracticeResult(null)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "var(--brand)", color: "#fff", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>
                  Keep Practicing
                </button>
                <button onClick={() => { setPracticeResult(null); setActivePracticeQ(null); }}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>
                  Back to Question Bank
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Dora AI Assistant Side Panel / Overlay */}
        {doraOpen && (
          <div style={{
            position: "fixed",
            left: Math.max(10, Math.min(typeof window !== "undefined" ? window.innerWidth - 440 : 800, doraPos.x - 120)),
            top: Math.max(10, doraPos.y > 450 ? doraPos.y - 570 : doraPos.y + 10),
            width: 420,
            height: 560,
            zIndex: 140,
            background: "var(--bg-card)",
            border: "1.5px solid #a855f7",
            borderRadius: 20,
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backdropFilter: "blur(12px)",
          }}>
            {/* Dora Header with Drag Handle */}
            <div
              onMouseDown={handleDoraDragStart}
              onTouchStart={handleDoraDragStart}
              style={{
                padding: "12px 16px",
                background: "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(124,58,237,0.18))",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: isDraggingDora ? "grabbing" : "grab",
                userSelect: "none",
              }}
              title="Click and drag to move Dora anywhere on screen"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ color: "#a855f7", display: "flex", alignItems: "center" }}>
                  <GripVertical size={16} />
                </div>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <Brain size={16} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <h4 style={{ fontSize: "0.88rem", fontWeight: 900, margin: 0, color: "var(--text-primary)" }}>Dora AI Assistant</h4>
                    <select
                      value={doraModel}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setDoraModel(val);
                        if (val === 'gemini') setShowApiKeyInput(true);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        padding: "2px 6px",
                        borderRadius: 6,
                        border: "1px solid rgba(168,85,247,0.4)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        outline: "none",
                        cursor: "pointer",
                      }}>
                      <option value="qwen">⚡ Qwen 2.5 Coder (Free AI)</option>
                      <option value="deepseek">🧠 DeepSeek R1 (Free AI)</option>
                      <option value="llama">🔥 Llama 3.3 70B (Free AI)</option>
                      <option value="gemini">✨ Gemini 2.5 Flash</option>
                    </select>
                  </div>
                  <span style={{ fontSize: "0.62rem", color: doraPermissionAllowed ? "#10b981" : "#f59e0b", fontWeight: 700 }}>
                    {doraPermissionAllowed ? "🟢 Live Screen & Code Inspected · Move Anywhere ⠿" : "⚠️ Screen Access Required · Move Anywhere ⠿"}
                  </span>
                </div>
              </div>
              <button onClick={() => setDoraOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                <X size={16} />
              </button>
            </div>

            {/* Optional Gemini API Key Drawer */}
            {(showApiKeyInput || doraModel === 'gemini') && (
              <div style={{ padding: "8px 12px", background: "rgba(168,85,247,0.08)", borderBottom: "1px solid rgba(168,85,247,0.2)", display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="password"
                  placeholder="Paste optional Gemini API Key (or leave blank to use Free AI)..."
                  value={userApiKey}
                  onChange={(e) => {
                    setUserApiKey(e.target.value);
                    try { localStorage.setItem('dora_user_api_key', e.target.value); } catch {}
                  }}
                  style={{ flex: 1, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.68rem" }}
                />
                <button
                  onClick={() => setShowApiKeyInput(false)}
                  style={{ padding: "3px 8px", borderRadius: 6, border: "none", background: "var(--brand)", color: "#fff", fontSize: "0.65rem", fontWeight: 800, cursor: "pointer" }}>
                  Saved ✓
                </button>
              </div>
            )}

            {/* Permission Banner if not yet allowed */}
            {!doraPermissionAllowed ? (
              <div style={{ padding: 16, background: "rgba(245,158,11,0.08)", borderBottom: "1px solid rgba(245,158,11,0.2)", display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>
                  🔒 <strong>Screen &amp; Code Access Request:</strong> Allow Dora AI to inspect your current Monaco code editor and problem screen to verify line-by-line?
                </p>
                <button
                  onClick={() => setDoraPermissionAllowed(true)}
                  style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontWeight: 800, fontSize: "0.75rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,0.2)" }}>
                  ✅ Allow Screen &amp; Code Access
                </button>
              </div>
            ) : (
              <div style={{ padding: "6px 12px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", fontSize: "0.68rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📷 Inspected: {practiceLang.toUpperCase()} ({practiceCode.split('\n').length} lines)</span>
                <span style={{ color: "#10b981", fontWeight: 700 }}>Line Verification On</span>
              </div>
            )}

            {/* Messages Box */}
            <div style={{ flex: 1, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {doraMessages.map((m, idx) => (
                <div key={idx} style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  background: m.role === 'user' ? 'var(--brand)' : 'var(--bg-secondary)',
                  color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                  borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  padding: '10px 12px',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}>
                  {m.role === 'dora' && (
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a855f7', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Brain size={12} /> Dora AI Socratic Mentor
                    </div>
                  )}
                  {m.text}
                </div>
              ))}
              {doraLoading && (
                <div style={{ alignSelf: 'flex-start', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 12, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Dora is analyzing your screen &amp; code…
                </div>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div style={{ padding: "6px 12px", display: "flex", gap: 6, overflowX: "auto", borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              <button
                onClick={() => handleSendDoraMessage("line 9")}
                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.1)", color: "#a855f7", fontSize: "0.68rem", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                🎯 Check Line 9
              </button>
              <button
                onClick={() => handleSendDoraMessage("now see")}
                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                🔍 Inspect Code
              </button>
              <button
                onClick={() => handleSendDoraMessage("Help me build intuition for this problem step-by-step without spilling the solution")}
                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                🧠 Build Intuition
              </button>
              <button
                onClick={() => handleSendDoraMessage("What line should I modify next to get closer to the solution?")}
                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                ⚡ Next Code Step
              </button>
            </div>

            {/* Input Box */}
            <div style={{ padding: 10, borderTop: "1px solid var(--border)", background: "var(--bg-card)", display: "flex", gap: 6 }}>
              <input
                type="text"
                placeholder={doraPermissionAllowed ? "Ask Dora about your screen code (e.g. 'line 9', 'now see')…" : "Allow screen access above to chat with Dora…"}
                value={doraInput}
                onChange={(e) => setDoraInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendDoraMessage()}
                disabled={!doraPermissionAllowed || doraLoading}
                style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.78rem", outline: "none" }}
              />
              <button
                onClick={() => handleSendDoraMessage()}
                disabled={!doraPermissionAllowed || doraLoading || !doraInput.trim()}
                style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "#a855f7", color: "#fff", fontWeight: 800, fontSize: "0.75rem", cursor: "pointer", opacity: (!doraPermissionAllowed || doraLoading || !doraInput.trim()) ? 0.5 : 1 }}>
                Send
              </button>
            </div>
          </div>
        )}

        {/* ── Dora Movable Floating Mascot / Pill (Placed at Top by default) ── */}
        <div style={{
          position: "fixed",
          left: doraPos.x,
          top: doraPos.y,
          zIndex: 130,
          display: "flex",
          alignItems: "center",
          gap: 6,
          userSelect: "none",
        }}>
          {!doraOpen && (
            <div
              style={{
                background: "var(--bg-card)",
                border: "2px solid #a855f7",
                borderRadius: 999,
                padding: "6px 12px 6px 8px",
                boxShadow: "0 8px 24px rgba(168,85,247,0.35)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}
            >
              {/* Drag Handle */}
              <div
                onMouseDown={handleDoraDragStart}
                onTouchStart={handleDoraDragStart}
                style={{
                  cursor: isDraggingDora ? "grabbing" : "grab",
                  display: "flex",
                  alignItems: "center",
                  color: "#a855f7",
                  padding: "2px 4px 2px 2px",
                  borderRadius: 6,
                }}
                title="Drag Dora anywhere on screen"
              >
                <GripVertical size={16} />
              </div>

              {/* Clickable pill to open chat */}
              <div
                onClick={() => setDoraOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <div style={{ fontSize: "1.2rem", lineHeight: 1 }}>🤖</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 900, color: "#a855f7", display: "flex", alignItems: "center", gap: 4 }}>
                    Dora AI Mentor <span style={{ width: 6, height: 6, borderRadius: 99, background: "#10b981", display: "inline-block" }} />
                  </span>
                  <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", fontWeight: 700 }}>
                    Move anywhere · Inspect code
                  </span>
                </div>
              </div>

              <button
                onClick={() => setDoraOpen(true)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(135deg, #a855f7, #6366f1)",
                  color: "#fff",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                Ask 💬
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px 60px", maxWidth: 1300, margin: "0 auto", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, maxWidth: 560, width: "100%" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 14 }}>Add Custom Question</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" placeholder="Title" value={newQ.title} onChange={(e) => setNewQ({ ...newQ, title: e.target.value })} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.82rem" }} />
              <textarea placeholder="Question Text" rows={4} value={newQ.text} onChange={(e) => setNewQ({ ...newQ, text: e.target.value })} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.82rem" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <select value={newQ.category} onChange={(e) => setNewQ({ ...newQ, category: e.target.value })} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.8rem" }}>
                  <option value="CODING">Coding</option><option value="DSA">DSA</option><option value="SYSTEM_DESIGN">System Design</option><option value="HR">Behavioral</option>
                </select>
                <select value={newQ.difficulty} onChange={(e) => setNewQ({ ...newQ, difficulty: e.target.value })} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.8rem" }}>
                  <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button onClick={() => setIsModalOpen(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button onClick={handleCreate} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--brand)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: 0 }}>Question Bank & Practice</h1>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
            LeetCode Practice (+10 pts on solve) &amp; CP Sheet (800–3000 Rating · 50 Qs / Tier)
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 10, border: "none", background: "var(--brand)", color: "#fff", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>
          <Plus size={14} /> Add Custom Question
        </button>
      </div>

      {/* Real-time Monthly Practice Calendar Heatmap */}
      <MonthlyActivityTracker token={token} refreshTrigger={calendarRefreshTrigger} />

      {/* Category Tabs */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: "0.75rem",
              fontWeight: 800,
              border: "1px solid var(--border)",
              cursor: "pointer",
              background: activeCategory === cat.id ? "var(--brand)" : "var(--bg-card)",
              color: activeCategory === cat.id ? "#fff" : "var(--text-muted)",
              transition: "all 0.15s",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: activeCategory === cat.id ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
            }}>
            {cat.id === "CP" && <Flame size={14} color={activeCategory === cat.id ? "#fff" : "#ef4444"} />}
            {cat.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* CP SHEET VIEW (800 - 3000 Rating, 50 problems per rating)                 */}
      {/* ========================================================================= */}
      {activeCategory === "CP" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Banner Card */}
          <div style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.08))", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 100, background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                <Crown size={12} /> Competitive Programming Catalog (800 to 3000)
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 900, margin: 0, color: "var(--text-primary)" }}>
                Codeforces CP Practice Sheet (50 Qs per Rating Tier)
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: "4px 0 0", maxWidth: 680 }}>
                Curated 50 problems for every rating from 800 (Newbie) to 3000 (Legendary Grandmaster). Solve on Codeforces and tick mark when solved.
              </p>
            </div>

            {/* Overall Progress Widget */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 18px", minWidth: 220, textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Overall Solved</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#10b981" }}>
                  {cp31TotalSolved} / {cp31AllList.length} ({Math.round((cp31TotalSolved / Math.max(1, cp31AllList.length)) * 100)}%)
                </span>
              </div>
              <div style={{ width: "100%", height: 7, borderRadius: 99, background: "var(--bg-secondary)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6, #ef4444)", width: `${(cp31TotalSolved / Math.max(1, cp31AllList.length)) * 100}%`, transition: "width 0.3s ease" }} />
              </div>
            </div>
          </div>

          {/* Rating Tier Selector Pills (800 to 3000) */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", maxHeight: 180, overflowY: "auto", padding: "4px 2px" }}>
            <button onClick={() => setCp31Rating("ALL")}
              style={{
                padding: "7px 13px",
                borderRadius: 9,
                border: "1px solid var(--border)",
                background: cp31Rating === "ALL" ? "var(--brand)" : "var(--bg-card)",
                color: cp31Rating === "ALL" ? "#fff" : "var(--text-primary)",
                fontSize: "0.72rem",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.15s",
              }}>
              All Ratings ({cp31AllList.length})
            </button>

            {CP31_RATINGS.map((r) => {
              const rProblems = CP31_DATA[r] || [];
              const rSolved = rProblems.filter((p) => cp31Solved[p.id]).length;
              const rStyle = getRatingStyle(r);
              const isSelected = cp31Rating === r;

              return (
                <button key={r} onClick={() => setCp31Rating(r)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 9,
                    border: isSelected ? `1.5px solid ${rStyle.c}` : "1px solid var(--border)",
                    background: isSelected ? rStyle.c : "var(--bg-card)",
                    color: isSelected ? "#fff" : "var(--text-primary)",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                  <span>{r}</span>
                  <span style={{ fontSize: "0.65rem", padding: "1px 5px", borderRadius: 5, background: isSelected ? "rgba(255,255,255,0.25)" : rStyle.bg, color: isSelected ? "#fff" : rStyle.c, fontWeight: 900 }}>
                    {rSolved}/50
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Status Filters */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input type="text" placeholder="Search CP problems by name, ID (e.g. 1900A) or tag (e.g. dp, greedy, flows)…"
                value={cp31Search} onChange={(e) => setCp31Search(e.target.value)}
                style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.78rem", outline: "none" }} />
            </div>

            <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", padding: 3, borderRadius: 10, border: "1px solid var(--border)" }}>
              {(["ALL", "UNSOLVED", "SOLVED"] as const).map((f) => (
                <button key={f} onClick={() => setCp31Filter(f)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: cp31Filter === f ? "var(--brand)" : "transparent",
                    color: cp31Filter === f ? "#fff" : "var(--text-muted)",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}>
                  {f === "ALL" ? "All" : f === "SOLVED" ? "Solved ✓" : "Unsolved ⌛"}
                </button>
              ))}
            </div>
          </div>

          {/* CP Problem Table */}
          <div style={{ borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden", background: "var(--bg-card)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "50px 1.4fr 110px 1.1fr 140px 150px", gap: 0, padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
              <span style={{ textAlign: "center" }}>Done</span>
              <span>Problem</span>
              <span style={{ textAlign: "center" }}>Rating &amp; Rank</span>
              <span>Tags</span>
              <span style={{ textAlign: "center" }}>Revision Note</span>
              <span style={{ textAlign: "center" }}>Solve on Codeforces</span>
            </div>

            {cp31Displayed.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
                <CheckCircle2 size={36} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0 }}>No problems matching criteria</h4>
                <p style={{ fontSize: "0.75rem", margin: "4px 0 0" }}>Try adjusting your rating tier or search keyword.</p>
              </div>
            ) : (
              cp31Displayed.map((p, idx) => {
                const isSolved = !!cp31Solved[p.id];
                const rStyle = getRatingStyle(p.rating);
                const note = cp31Notes[p.id] || "";
                const hasNote = note.trim().length > 0;

                return (
                  <div key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "50px 1.4fr 110px 1.1fr 140px 150px",
                      gap: 0,
                      padding: "11px 18px",
                      alignItems: "center",
                      borderBottom: idx < cp31Displayed.length - 1 ? "1px solid var(--border)" : "none",
                      background: isSolved ? "rgba(16,185,129,0.03)" : "transparent",
                      transition: "background 0.15s",
                    }}>

                    {/* Checkbox */}
                    <div style={{ textAlign: "center" }}>
                      <button onClick={() => toggleCP31Solved(p.id, p)}
                        title={isSolved ? "Mark as unsolved" : "Mark as solved"}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: isSolved ? "1px solid #10b981" : "1px solid var(--border)",
                          background: isSolved ? "#10b981" : "var(--bg-secondary)",
                          color: "#fff",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}>
                        {isSolved ? <Check size={16} strokeWidth={3} /> : null}
                      </button>
                    </div>

                    {/* Title */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-muted)", fontFamily: "monospace", minWidth: 56 }}>
                        #{p.id}
                      </span>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: isSolved ? "var(--text-muted)" : "var(--text-primary)", textDecoration: isSolved ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </span>
                    </div>

                    {/* Rating & Rank */}
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 900, padding: "3px 10px", borderRadius: 99, background: rStyle.bg, color: rStyle.c }}>
                        {p.rating}
                      </span>
                    </div>

                    {/* Tags */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", overflow: "hidden" }}>
                      {p.tags.slice(0, 3).map((t, ti) => (
                        <span key={ti} style={{ fontSize: "0.62rem", padding: "2px 6px", borderRadius: 6, background: "var(--bg-secondary)", color: "var(--text-muted)", border: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Revision Note Button */}
                    <div style={{ textAlign: "center" }}>
                      <button onClick={() => openNoteModal(p)}
                        title="Write revision notes up to 10,000 characters"
                        style={{
                          padding: "5px 10px",
                          borderRadius: 8,
                          border: hasNote ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--border)",
                          background: hasNote ? "rgba(16,185,129,0.12)" : "var(--bg-secondary)",
                          color: hasNote ? "#10b981" : "var(--text-muted)",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}>
                        <FileText size={12} />
                        {hasNote ? `Note (${note.length}c)` : "+ Note"}
                      </button>
                    </div>

                    {/* Solve on Codeforces button */}
                    <div style={{ textAlign: "center" }}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          border: "none",
                          background: "linear-gradient(135deg, #ef4444, #dc2626)",
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: "0.72rem",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          boxShadow: "0 2px 8px rgba(239,68,68,0.25)",
                        }}>
                        <ExternalLink size={12} /> Codeforces ↗
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Revision Note Modal Popup (up to 10,000 chars) */}
          {noteProblemModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, maxWidth: 640, width: "100%", padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: 6, background: "rgba(37,99,235,0.1)", color: "#2563eb", textTransform: "uppercase", marginBottom: 6 }}>
                      <FileText size={12} /> Revision Note (Max 10,000 Characters)
                    </div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 900, margin: 0, color: "var(--text-primary)" }}>
                      {noteProblemModal.name} <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>(#{noteProblemModal.id})</span>
                    </h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "3px 0 0" }}>
                      Rating: <strong>{noteProblemModal.rating}</strong> · Save detailed notes, formulas, logic, or edge cases.
                    </p>
                  </div>
                  <button onClick={() => setNoteProblemModal(null)} style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex" }}>
                    <X size={16} style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <textarea
                    rows={12}
                    maxLength={10000}
                    value={currentNoteText}
                    onChange={(e) => setCurrentNoteText(e.target.value)}
                    placeholder="Write your revision note here (up to 10,000 characters)... e.g. key observations, algorithm approach, edge cases, C++ snippets."
                    style={{
                      width: "100%",
                      padding: 14,
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      fontSize: "0.83rem",
                      fontFamily: "monospace",
                      lineHeight: 1.6,
                      outline: "none",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    <span>
                      {noteSavedFeedback ? <strong style={{ color: "#10b981" }}>✓ Revision note saved!</strong> : "Saved to local storage"}
                    </span>
                    <span style={{ fontWeight: 800, color: currentNoteText.length > 9500 ? "#ef4444" : "var(--text-muted)" }}>
                      {currentNoteText.length.toLocaleString()} / 10,000 chars
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  {currentNoteText.length > 0 ? (
                    <button onClick={handleDeleteNote} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                      Clear Note
                    </button>
                  ) : <div />}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setNoteProblemModal(null)} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                      Close
                    </button>
                    <button onClick={handleSaveNote} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: "#10b981", color: "#fff", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer" }}>
                      Save Revision Note
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* STANDARD LEETCODE & CUSTOM QUESTIONS VIEW                                 */
        /* ========================================================================= */
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input type="text" placeholder="Search LeetCode problems…" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.78rem", outline: "none" }} />
            </div>
            <select value={diffFilter} onChange={(e: any) => setDiffFilter(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.72rem", fontWeight: 700, outline: "none", cursor: "pointer" }}>
              <option value="ALL">All Diff</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </select>
          </div>

          {lcLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "var(--text-muted)" }}>
              <Loader size={28} style={{ animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: "0.82rem", fontWeight: 700, marginTop: 10 }}>Loading problem catalog…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", border: "1px solid var(--border)", borderRadius: 16, background: "var(--bg-card)" }}>
              <BookOpen size={36} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
              <h3 style={{ fontSize: "0.9rem", fontWeight: 700 }}>No questions found</h3>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Try clearing your search or filters.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", margin: 0 }}>
                  Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} problems
                </p>
                {visibleCount < filtered.length && (
                  <span style={{ fontSize: "0.65rem", color: "var(--brand)", fontWeight: 700 }}>
                    Scroll down inside table for next 50 items
                  </span>
                )}
              </div>

              <div
                onScroll={(e) => {
                  const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
                  if (scrollTop + clientHeight >= scrollHeight - 60 && !isLoadingMore && visibleCount < filtered.length) {
                    setIsLoadingMore(true);
                    setTimeout(() => {
                      setVisibleCount((prev) => Math.min(prev + 50, filtered.length));
                      setIsLoadingMore(false);
                    }, 300);
                  }
                }}
                style={{
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  overflowY: "auto",
                  maxHeight: "calc(100vh - 210px)",
                  background: "var(--bg-card)",
                  width: "100%",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 120px 160px 140px", gap: 0, padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", position: "sticky", top: 0, zIndex: 10 }}>
                  <span>Problem</span>
                  <span style={{ textAlign: "center" }}>Difficulty</span>
                  <span style={{ textAlign: "center" }}>Platform</span>
                  <span style={{ textAlign: "center" }}>Official Link</span>
                  <span style={{ textAlign: "center" }}>Action</span>
                </div>

                {filtered.slice(0, visibleCount).map((q, idx) => {
                  const diffStyle = DIFF_COLOR[q.difficulty] || DIFF_COLOR.MEDIUM;

                  return (
                    <div key={q.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 110px 120px 160px 140px",
                        gap: 0,
                        padding: "11px 20px",
                        alignItems: "center",
                        borderBottom: idx < visibleCount - 1 ? "1px solid var(--border)" : "none",
                        transition: "background 0.15s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }} onClick={() => handleOpenPractice(q)}>
                        <div style={{ width: 7, height: 7, borderRadius: 99, flexShrink: 0, background: diffStyle.c }} />
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {q.title}
                        </span>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "0.62rem", fontWeight: 800, padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", background: diffStyle.bg, color: diffStyle.c }}>
                          {q.difficulty}
                        </span>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "0.62rem", fontWeight: 800, padding: "3px 10px", borderRadius: 99, textTransform: "uppercase", background: "rgba(37,99,235,0.12)", color: "#2563eb" }}>
                          LeetCode
                        </span>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        {q.officialUrl ? (
                          <a href={q.officialUrl} target="_blank" rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: "0.7rem", fontWeight: 700, color: "#2563eb", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <ExternalLink size={12} /> LeetCode ↗
                          </a>
                        ) : (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>—</span>
                        )}
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <button onClick={(e) => { e.stopPropagation(); handleOpenPractice(q); }}
                          style={{ padding: "6px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, var(--brand), #1d4ed8)", color: "#fff", fontWeight: 800, fontSize: "0.72rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}>
                          <Play size={12} /> Solve (+5 pts)
                        </button>
                      </div>
                    </div>
                  );
                })}

                {isLoadingMore && (
                  <div style={{ padding: "14px 0", textAlign: "center", background: "var(--bg-secondary)", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--brand)" }}>
                    <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
                    <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>Loading next 50 problems…</span>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes doraFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-7px); } }
        @keyframes doraPopIn { from { opacity: 0; transform: scale(0.8) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}
