import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  Bookmark,
  Search,
  Flame,
  Star,
  ExternalLink,
  BookOpen,
  Filter,
  Clock,
  Award,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  FileText,
  Trash2,
  Sparkles,
  Trophy,
} from "lucide-react";
import { CP31_DATA, CP31_RATINGS } from "../data/cp31Sheet";

interface SolvedTrackerProps {
  token?: string;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const DIFF_COLOR: Record<string, { bg: string; c: string }> = {
  EASY: { bg: "rgba(16,185,129,0.12)", c: "#10b981" },
  MEDIUM: { bg: "rgba(245,158,11,0.12)", c: "#f59e0b" },
  HARD: { bg: "rgba(239,68,68,0.12)", c: "#ef4444" },
};

export default function SolvedTracker({ token }: SolvedTrackerProps) {
  const [activeTab, setActiveTab] = useState<"calendar" | "solved" | "review">("calendar");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedDateDetail, setSelectedDateDetail] = useState<{ dateStr: string; items: any[] } | null>(null);

  // Search & Filters for Solved/Review tables
  const [search, setSearch] = useState("");
  const [diffFilter, setDiffFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");

  // Local Storage Data Sources
  const [cp31Solved, setCp31Solved] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("cp31_solved_problems");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [reviewItems, setReviewItems] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem("talentai_review_bookmarks");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [revisionNotes, setRevisionNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("cp31_revision_notes");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [apiSolvedList, setApiSolvedList] = useState<any[]>([]);

  // Daily Submission Log (Map of "YYYY-MM-DD" => array of solved item titles)
  const [submissionLog, setSubmissionLog] = useState<Record<string, Array<{ id: string; title: string; platform: string; difficulty: string; score?: number }>>>(() => {
    try {
      const saved = localStorage.getItem("talentai_submission_log");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Fetch real submission calendar and review bookmarks from backend API
  useEffect(() => {
    const fetchRealSubmissions = async () => {
      const tok = token || localStorage.getItem('token');
      if (!tok) return;

      try {
        const res = await fetch('/api/student/submission-calendar', {
          headers: { Authorization: `Bearer ${tok}` }
        });
        const data = await res.json();

        if (data.success && data.submissionLog) {
          setSubmissionLog(data.submissionLog);
          if (Array.isArray(data.solvedList)) {
            setApiSolvedList(data.solvedList);
          }
          try {
            localStorage.setItem("talentai_submission_log", JSON.stringify(data.submissionLog));
          } catch {}
        }
      } catch (e) {
        console.log("Calendar API fetch fallback to local storage");
      }

      try {
        const reviewRes = await fetch('/api/student/review-items', {
          headers: { Authorization: `Bearer ${tok}` }
        });
        const reviewData = await reviewRes.json();

        if (reviewData.success && Array.isArray(reviewData.items)) {
          const map: Record<string, any> = {};
          reviewData.items.forEach((it: any) => { map[it.id] = it; });
          setReviewItems((prev) => ({ ...map, ...prev }));
        }
      } catch (e) {
        console.log("Review API fetch fallback");
      }
    };

    fetchRealSubmissions();
  }, [token]);

  // Save Review Bookmarks to LocalStorage and API
  const toggleReviewBookmark = async (problem: { id: string; title: string; difficulty?: string; platform?: string; rating?: number; officialUrl?: string }) => {
    const tok = token || localStorage.getItem('token');

    setReviewItems((prev) => {
      const updated = { ...prev };
      if (updated[problem.id]) {
        delete updated[problem.id];
      } else {
        updated[problem.id] = {
          id: problem.id,
          title: problem.title,
          difficulty: problem.difficulty || (problem.rating ? String(problem.rating) : "MEDIUM"),
          platform: problem.platform || (problem.id.startsWith("cp") ? "Codeforces" : "LeetCode"),
          rating: problem.rating,
          officialUrl: problem.officialUrl,
          markedAt: new Date().toISOString().split("T")[0],
          note: revisionNotes[problem.id] || "",
        };
      }
      try {
        localStorage.setItem("talentai_review_bookmarks", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (tok) {
      try {
        await fetch('/api/student/toggle-review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tok}`
          },
          body: JSON.stringify({
            problemId: problem.id,
            problemTitle: problem.title,
            platform: problem.platform || (problem.id.startsWith('cp') ? 'Codeforces' : 'LeetCode'),
            difficulty: problem.difficulty,
            officialUrl: problem.officialUrl,
            note: revisionNotes[problem.id] || ''
          })
        });
      } catch (e) {
        console.error('Toggle review API error:', e);
      }
    }
  };

  // Note Modal state for Review page
  const [editingNoteItem, setEditingNoteItem] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");

  const handleSaveReviewNote = () => {
    if (!editingNoteItem) return;
    const text = noteText.slice(0, 10000);
    const updatedNotes = { ...revisionNotes, [editingNoteItem.id]: text };
    setRevisionNotes(updatedNotes);
    try {
      localStorage.setItem("cp31_revision_notes", JSON.stringify(updatedNotes));
    } catch {}

    if (reviewItems[editingNoteItem.id]) {
      setReviewItems((prev) => {
        const next = {
          ...prev,
          [editingNoteItem.id]: { ...prev[editingNoteItem.id], note: text }
        };
        try { localStorage.setItem("talentai_review_bookmarks", JSON.stringify(next)); } catch {}
        return next;
      });
    }
    setEditingNoteItem(null);
  };

  // Compile list of ALL solved problems across CP Sheet & LeetCode & 1v1 Arena
  const solvedList = React.useMemo(() => {
    const list: any[] = [...apiSolvedList];
    const seenIds = new Set(list.map((it) => it.id));

    // Add CP Sheet solved items that aren't already included
    Object.keys(CP31_DATA).forEach((ratingStr) => {
      const rating = Number(ratingStr);
      CP31_DATA[rating].forEach((p) => {
        if (cp31Solved[p.id] && !seenIds.has(p.id)) {
          seenIds.add(p.id);
          list.push({
            id: p.id,
            title: p.name,
            difficulty: `${rating} Rating`,
            rating,
            platform: "Codeforces",
            officialUrl: p.url,
            solvedAt: new Date().toISOString().split("T")[0],
            score: 10,
            tags: p.tags || ["cp"],
          });
        }
      });
    });
    return list;
  }, [apiSolvedList, cp31Solved]);

  // Compute Year Activity Heatmap statistics
  const yearStats = React.useMemo(() => {
    let yearTotalSolved = 0;
    let activeDaysCount = 0;
    const monthCounts: number[] = Array(12).fill(0);

    Object.entries(submissionLog).forEach(([dateStr, items]) => {
      if (dateStr.startsWith(String(selectedYear))) {
        if (items.length > 0) {
          activeDaysCount++;
          yearTotalSolved += items.length;
          const monthIdx = Number(dateStr.split("-")[1]) - 1;
          if (monthIdx >= 0 && monthIdx < 12) {
            monthCounts[monthIdx] += items.length;
          }
        }
      }
    });

    return {
      totalSolved: yearTotalSolved,
      activeDays: activeDaysCount,
      monthCounts,
    };
  }, [submissionLog, selectedYear]);

  // Filtered lists for tables
  const filteredSolved = solvedList.filter((item) => {
    const matchSearch = search ? item.title.toLowerCase().includes(search.toLowerCase()) || item.id.toLowerCase().includes(search.toLowerCase()) : true;
    const matchDiff = diffFilter === "ALL" ? true : item.difficulty.toUpperCase().includes(diffFilter);
    const matchPlatform = platformFilter === "ALL" ? true : item.platform.toUpperCase() === platformFilter;
    return matchSearch && matchDiff && matchPlatform;
  });

  const reviewList = Object.values(reviewItems).filter((item: any) => {
    const matchSearch = search ? item.title.toLowerCase().includes(search.toLowerCase()) : true;
    const matchPlatform = platformFilter === "ALL" ? true : item.platform.toUpperCase() === platformFilter;
    return matchSearch && matchPlatform;
  });

  return (
    <div style={{ padding: "24px 28px 60px", maxWidth: 1300, margin: "0 auto", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Note Edit Modal */}
      {editingNoteItem && (
        <div style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--brand)", borderRadius: 20, padding: 24, maxWidth: 560, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <FileText size={18} style={{ color: "var(--brand)" }} /> Revision Note for {editingNoteItem.title}
              </h3>
              <button onClick={() => setEditingNoteItem(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <textarea
              rows={8}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your core intuition, trick, key formulas, or C++ snippet for this problem..."
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                fontFamily: "monospace",
                lineHeight: 1.6,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                marginBottom: 14,
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setEditingNoteItem(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}>
                Cancel
              </button>
              <button onClick={handleSaveReviewNote} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "var(--brand)", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: "0.78rem" }}>
                Save Revision Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Detail Drawer Modal */}
      {selectedDateDetail && (
        <div style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 24, maxWidth: 500, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 900, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={18} style={{ color: "var(--brand)" }} /> Submissions on {selectedDateDetail.dateStr}
              </h3>
              <button onClick={() => setSelectedDateDetail(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            {selectedDateDetail.items.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>
                No recorded submissions on this date.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto" }}>
                {selectedDateDetail.items.map((it, idx) => (
                  <div key={idx} style={{ padding: "10px 14px", borderRadius: 10, background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>{it.title}</h4>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 600 }}>{it.platform} · {it.difficulty}</span>
                    </div>
                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#10b981", background: "rgba(16,185,129,0.12)", padding: "3px 8px", borderRadius: 6 }}>
                      Solved (+10 pts)
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 18, textAlign: "right" }}>
              <button onClick={() => setSelectedDateDetail(null)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--brand)", color: "#fff", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 900, margin: 0, color: "var(--text-primary)" }}>
              Solved Problems &amp; Calendar Tracker
            </h1>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
              Codeforces-style annual submission heatmap, revision bookmarks, and solved problem log.
            </p>
          </div>

          {/* Key Metric Pills */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 16px", textAlign: "center" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Solved</span>
              <p style={{ fontSize: "1.1rem", fontWeight: 900, color: "#10b981", margin: 0 }}>{solvedList.length}</p>
            </div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 16px", textAlign: "center" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Marked for Review</span>
              <p style={{ fontSize: "1.1rem", fontWeight: 900, color: "#f59e0b", margin: 0 }}>{Object.keys(reviewItems).length}</p>
            </div>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 16px", textAlign: "center" }}>
              <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Active Days ({selectedYear})</span>
              <p style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--brand)", margin: 0 }}>{yearStats.activeDays}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab("calendar")}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            border: activeTab === "calendar" ? "none" : "1px solid var(--border)",
            background: activeTab === "calendar" ? "var(--brand)" : "var(--bg-card)",
            color: activeTab === "calendar" ? "#fff" : "var(--text-secondary)",
            fontSize: "0.82rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: activeTab === "calendar" ? "0 4px 14px rgba(37,99,235,0.25)" : "none",
          }}
        >
          <Calendar size={16} /> Annual Calendar Heatmap
        </button>

        <button
          onClick={() => setActiveTab("solved")}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            border: activeTab === "solved" ? "none" : "1px solid var(--border)",
            background: activeTab === "solved" ? "var(--brand)" : "var(--bg-card)",
            color: activeTab === "solved" ? "#fff" : "var(--text-secondary)",
            fontSize: "0.82rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: activeTab === "solved" ? "0 4px 14px rgba(37,99,235,0.25)" : "none",
          }}
        >
          <CheckCircle2 size={16} /> Solved Questions ({solvedList.length})
        </button>

        <button
          onClick={() => setActiveTab("review")}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            border: activeTab === "review" ? "none" : "1px solid var(--border)",
            background: activeTab === "review" ? "linear-gradient(135deg, #f59e0b, #d97706)" : "var(--bg-card)",
            color: activeTab === "review" ? "#fff" : "var(--text-secondary)",
            fontSize: "0.82rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: activeTab === "review" ? "0 4px 14px rgba(245,158,11,0.3)" : "none",
          }}
        >
          <Bookmark size={16} /> Marked for Review ({Object.keys(reviewItems).length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CODEFORCES-STYLE ANNUAL CALENDAR HEATMAP                          */}
      {/* ========================================================================= */}
      {activeTab === "calendar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Year Switcher Banner */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 99, background: "rgba(37,99,235,0.1)", color: "var(--brand)", fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>
                <Flame size={12} /> Codeforces Submission Heatmap
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 900, margin: 0, color: "var(--text-primary)" }}>
                Submission Activity for {selectedYear}
              </h2>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                {yearStats.totalSolved} problems solved across {yearStats.activeDays} active days in {selectedYear}.
              </p>
            </div>

            {/* Year Selector Buttons */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", background: "var(--bg-secondary)", padding: 4, borderRadius: 12, border: "1px solid var(--border)" }}>
              {[2026, 2025, 2024, 2023].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: selectedYear === yr ? "var(--brand)" : "transparent",
                    color: selectedYear === yr ? "#fff" : "var(--text-muted)",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* 12-Month Calendar Grid */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 18, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                {selectedYear} Monthly Submission Matrix (12 Months)
              </h3>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                Showing days with ≥ 1 problem solved (LeetCode, 1v1 Arena, Codeforces)
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 18 }}>
              {MONTH_NAMES.map((mName, mIdx) => {
                const totalDays = new Date(selectedYear, mIdx + 1, 0).getDate();
                const firstDayOfWeek = new Date(selectedYear, mIdx, 1).getDay();
                const monthNumStr = String(mIdx + 1).padStart(2, "0");
                const todayStr = new Date().toISOString().split("T")[0];

                return (
                  <div
                    key={mName}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)" }}>
                        {mName} {selectedYear}
                      </span>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, color: yearStats.monthCounts[mIdx] > 0 ? "#10b981" : "var(--text-muted)", background: yearStats.monthCounts[mIdx] > 0 ? "rgba(16,185,129,0.12)" : "var(--bg-card)", padding: "2px 8px", borderRadius: 6, border: "1px solid var(--border)" }}>
                        {yearStats.monthCounts[mIdx]} Solved
                      </span>
                    </div>

                    {/* Weekday Labels Header */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
                      {["S", "M", "T", "W", "T", "F", "S"].map((w, wIdx) => (
                        <div key={wIdx} style={{ textAlign: "center", fontSize: "0.58rem", fontWeight: 800, color: "var(--text-muted)" }}>
                          {w}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days Matrix */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                      {/* Leading Empty Spacer Cells */}
                      {Array.from({ length: firstDayOfWeek }).map((_, emptyIdx) => (
                        <div key={`empty-${emptyIdx}`} style={{ aspectRatio: "1" }} />
                      ))}

                      {/* Day Number Cells */}
                      {Array.from({ length: totalDays }, (_, dIdx) => {
                        const dayNum = dIdx + 1;
                        const dayNumStr = String(dayNum).padStart(2, "0");
                        const dateKey = `${selectedYear}-${monthNumStr}-${dayNumStr}`;
                        const daySubmissions = submissionLog[dateKey] || [];
                        const count = daySubmissions.length;
                        const isToday = dateKey === todayStr;

                        let bg = "var(--bg-card)";
                        let color = "var(--text-muted)";
                        let border = "1px solid var(--border)";

                        if (count >= 4) {
                          bg = "#10b981";
                          color = "#fff";
                          border = "1px solid #059669";
                        } else if (count >= 2) {
                          bg = "rgba(16,185,129,0.75)";
                          color = "#fff";
                          border = "1px solid #10b981";
                        } else if (count >= 1) {
                          bg = "rgba(16,185,129,0.35)";
                          color = "var(--text-primary)";
                          border = "1px solid rgba(16,185,129,0.6)";
                        }

                        if (isToday) {
                          border = count >= 1 ? "2px solid #10b981" : "2px solid var(--brand)";
                        }

                        return (
                          <div
                            key={dayNum}
                            onClick={() => {
                              if (count > 0) {
                                setSelectedDateDetail({ dateStr: dateKey, items: daySubmissions });
                              }
                            }}
                            title={`${mName} ${dayNum}, ${selectedYear}: ${count > 0 ? `${count} problem${count > 1 ? 's' : ''} solved` : "No problems solved"}`}
                            style={{
                              aspectRatio: "1",
                              borderRadius: 6,
                              background: bg,
                              border,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.62rem",
                              fontWeight: count > 0 || isToday ? 900 : 600,
                              color,
                              cursor: count > 0 ? "pointer" : "default",
                              transition: "transform 0.1s, box-shadow 0.1s",
                              boxShadow: count >= 1 ? "0 2px 6px rgba(16,185,129,0.2)" : "none",
                            }}
                            onMouseEnter={(e) => {
                              if (count > 0) e.currentTarget.style.transform = "scale(1.2)";
                            }}
                            onMouseLeave={(e) => {
                              if (count > 0) e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            {dayNum}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Heatmap Intensity Legend */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 16, fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
              <span>Less</span>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: "var(--bg-card)", border: "1px solid var(--border)" }} />
              <div style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(16,185,129,0.3)" }} />
              <div style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(16,185,129,0.7)" }} />
              <div style={{ width: 14, height: 14, borderRadius: 4, background: "#10b981" }} />
              <span>More</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALL SOLVED PROBLEMS TABLE                                          */}
      {/* ========================================================================= */}
      {activeTab === "solved" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Search & Filter Bar */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search solved problems by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.78rem", outline: "none" }}
              />
            </div>

            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.75rem", fontWeight: 700, outline: "none", cursor: "pointer" }}
            >
              <option value="ALL">All Platforms</option>
              <option value="LEETCODE">LeetCode</option>
              <option value="CODEFORCES">Codeforces</option>
            </select>
          </div>

          {/* Solved Problems Table */}
          <div style={{ borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", background: "var(--bg-card)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 110px 120px 140px 140px 120px", gap: 0, padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
              <span>Problem</span>
              <span style={{ textAlign: "center" }}>Difficulty</span>
              <span style={{ textAlign: "center" }}>Platform</span>
              <span style={{ textAlign: "center" }}>Solved Date</span>
              <span style={{ textAlign: "center" }}>Review Bookmark</span>
              <span style={{ textAlign: "center" }}>Official Link</span>
            </div>

            {filteredSolved.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
                <CheckCircle2 size={36} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0 }}>No solved problems match criteria</h4>
              </div>
            ) : (
              filteredSolved.map((item, idx) => {
                const isBookmarked = !!reviewItems[item.id];

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 110px 120px 140px 140px 120px",
                      gap: 0,
                      padding: "12px 18px",
                      alignItems: "center",
                      borderBottom: idx < filteredSolved.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <CheckCircle2 size={16} style={{ color: "#10b981", flexShrink: 0 }} />
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {item.title}
                      </span>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.62rem", fontWeight: 800, padding: "3px 10px", borderRadius: 99, background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                        {item.difficulty}
                      </span>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.62rem", fontWeight: 800, padding: "3px 10px", borderRadius: 99, background: "rgba(37,99,235,0.12)", color: "#2563eb" }}>
                        {item.platform}
                      </span>
                    </div>

                    <div style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                      {item.solvedAt || item.createdAt?.split('T')[0] || "—"}
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <button
                        onClick={() => toggleReviewBookmark(item)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 8,
                          border: isBookmarked ? "1px solid #f59e0b" : "1px solid var(--border)",
                          background: isBookmarked ? "rgba(245,158,11,0.12)" : "var(--bg-secondary)",
                          color: isBookmarked ? "#f59e0b" : "var(--text-muted)",
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Bookmark size={12} style={{ fill: isBookmarked ? "#f59e0b" : "none" }} />
                        {isBookmarked ? "Reviewing 🔖" : "+ Bookmark"}
                      </button>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      {item.officialUrl ? (
                        <a href={item.officialUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}>
                          Link ↗
                        </a>
                      ) : <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>—</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MARKED FOR REVIEW (REVISION BOOKMARKS)                             */}
      {/* ========================================================================= */}
      {activeTab === "review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 16, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 900, margin: 0, color: "var(--text-primary)" }}>
                🔖 Marked for Review ({reviewList.length} problems)
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                Keep track of tricky problems to revise before contests and interviews. Add core intuition notes for each!
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
            {reviewList.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)", gridColumn: "1 / -1" }}>
                <Bookmark size={36} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0 }}>No problems marked for review yet</h4>
                <p style={{ fontSize: "0.75rem", margin: "4px 0 0" }}>Click "+ Bookmark" on any problem to add it to your review list.</p>
              </div>
            ) : (
              reviewList.map((item) => {
                const note = revisionNotes[item.id] || item.note || "";
                const hasNote = note.trim().length > 0;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: "var(--bg-card)",
                      border: "1.5px solid rgba(245,158,11,0.3)",
                      borderRadius: 16,
                      padding: 18,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 14,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 800, padding: "2px 8px", borderRadius: 6, background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                          {item.platform} · {item.difficulty}
                        </span>
                        <button
                          onClick={() => toggleReviewBookmark(item)}
                          title="Remove from Review list"
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444" }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <h4 style={{ fontSize: "1rem", fontWeight: 900, margin: "0 0 6px", color: "var(--text-primary)" }}>
                        {item.title}
                      </h4>

                      {/* Revision Note Box */}
                      <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                            <FileText size={12} /> Revision Note
                          </span>
                          <button
                            onClick={() => { setEditingNoteItem(item); setNoteText(note); }}
                            style={{ background: "transparent", border: "none", color: "var(--brand)", fontSize: "0.68rem", fontWeight: 800, cursor: "pointer" }}
                          >
                            {hasNote ? "Edit Note ✏️" : "+ Add Note"}
                          </button>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.75rem", fontFamily: "monospace", color: hasNote ? "var(--text-primary)" : "var(--text-muted)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                          {hasNote ? note : "No revision note added yet. Click '+ Add Note' to write intuition."}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Marked on {item.markedAt || "2026-10-01"}</span>
                      {item.officialUrl && (
                        <a href={item.officialUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "#2563eb", fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          Solve Link ↗
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

    </div>
  );
}
