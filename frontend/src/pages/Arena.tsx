import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Swords, Trophy, Users, UserPlus, Check, X, ShieldAlert,
  Zap, Clock, Play, Code2, Sparkles, RefreshCw, Search,
  CheckCircle2, AlertCircle, LogOut, Bug, Cpu, ChevronLeft, ChevronRight,
  Image, AlertTriangle, Eye, Loader2, Hourglass, ExternalLink, Flame,
  UserCheck, MessageSquare, Send, Glasses, Copy
} from 'lucide-react';

interface ArenaProps {
  token: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
];

const EVAL_STEPS = [
  { label: 'Parsing AST & language syntax tree structures...', progress: 20 },
  { label: 'Executing ground truth testcase vectors...', progress: 40 },
  { label: 'Analyzing Time Complexity O(N) vs Optimal...', progress: 65 },
  { label: 'Detecting edge-case bugs & memory boundary checks...', progress: 85 },
  { label: 'Generating genuine AI score & feedback report...', progress: 100 },
];

const LANG_MONACO: Record<string, string> = {
  javascript: 'javascript',
  cpp: 'cpp',
  python: 'python',
  java: 'java',
};

const STARTER_TEMPLATES: Record<string, string> = {
  javascript: `// JavaScript — Write your complete solution below
// You may define helper functions and a main() call at the bottom.

function solution(input) {
  // Your code here
}
`,
  python: `# Python 3 — Write your complete solution below
# You may define helper functions freely.

def solution(input_val):
    # Your code here
    pass
`,
  cpp: `// C++17 — Write your complete solution below
// Include any headers you need.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Read input, solve, and print output

    return 0;
}
`,
  java: `// Java 17 — Write your complete solution below
import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws Exception {
        Scanner sc = new Scanner(System.in);
        // Read input and solve

    }
}
`,
};

const MONACO_OPTIONS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  fontLigatures: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  lineNumbers: 'on' as const,
  wordWrap: 'on' as const,
  automaticLayout: true,
  tabSize: 4,
  insertSpaces: true,
  formatOnPaste: true,
  formatOnType: true,
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true },
  padding: { top: 16, bottom: 16 },
  renderWhitespace: 'boundary' as const,
  smoothScrolling: true,
  cursorBlinking: 'smooth' as const,
  cursorSmoothCaretAnimation: 'on' as const,
  suggestOnTriggerCharacters: true,
  quickSuggestions: true,
  parameterHints: { enabled: true },
};

// ─── Types ───────────────────────────────────────────────────────────────────

type AppView = 'leaderboard' | 'friends' | 'battle' | 'myResult' | 'waiting' | 'pendingOutbound' | 'pendingInbound';

// ─── Component ───────────────────────────────────────────────────────────────

export default function Arena({ token }: ArenaProps) {
  // ── Core state ───────────────────────────────────────────────────────────
  const [view, setView] = useState<AppView>('leaderboard');
  const [profile, setProfile] = useState<any>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  // Battle Mode: 4 Arena Levels (EASY, MEDIUM, HARD, BLINDFOLD)
  const [arenaMode, setArenaMode] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'BLINDFOLD'>('MEDIUM');

  // Dismissed completed challenge IDs so return to leaderboard works seamlessly
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // Friends / Directory & Pagination (6 per page with > controls)
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [friendsPage, setFriendsPage] = useState(1);

  // Followed status (persisted in localStorage)
  const [followedUsers, setFollowedUsers] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('followed_users');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Friend comments / text notes (persisted in localStorage)
  const [friendComments, setFriendComments] = useState<Record<string, { id: string; text: string; date: string }[]>>(() => {
    try {
      const saved = localStorage.getItem('friend_comments');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [activeCommentUser, setActiveCommentUser] = useState<any | null>(null);
  const [newCommentInput, setNewCommentInput] = useState('');

  const toggleFollow = (userId: string) => {
    setFollowedUsers(prev => {
      const updated = { ...prev, [userId]: !prev[userId] };
      try { localStorage.setItem('followed_users', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const handleAddComment = () => {
    if (!activeCommentUser || !newCommentInput.trim()) return;
    const userId = activeCommentUser.userId;
    const newEntry = {
      id: `c_${Date.now()}`,
      text: newCommentInput.trim(),
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const userList = friendComments[userId] || [];
    const updated = { ...friendComments, [userId]: [newEntry, ...userList] };
    setFriendComments(updated);
    try { localStorage.setItem('friend_comments', JSON.stringify(updated)); } catch {}
    setNewCommentInput('');
  };

  const handleAddRandomFriend = async () => {
    const candidateList = students.filter(st => st.userId !== profile?.userId && st.friendship?.status !== 'ACCEPTED' && st.friendship?.status !== 'PENDING');
    if (candidateList.length === 0) {
      alert('No new candidates available to add right now!');
      return;
    }
    const randomUser = candidateList[Math.floor(Math.random() * candidateList.length)];
    await handleSendFriendRequest(randomUser.userId);
    alert(`Friend request sent to ${randomUser.name}!`);
  };

  // Matchmaking
  const [isSearchingQueue, setIsSearchingQueue] = useState(false);
  const [queueTimer, setQueueTimer] = useState(0);
  const [matchError, setMatchError] = useState('');
  // Guard: true while we wait for pollActive to confirm the matched challenge
  const [isLoadingBattle, setIsLoadingBattle] = useState(false);

  // Battle / Challenge
  const [activeChallenge, setActiveChallenge] = useState<any>(null);
  const [language, setLanguage] = useState('cpp');
  const [challengeCode, setChallengeCode] = useState(STARTER_TEMPLATES['cpp']);
  const prevChallengeIdRef = useRef<string | null>(null);

  // My submission score & eval
  const [mySubmission, setMySubmission] = useState<{ score: number; eval: any } | null>(null);
  const [copiedSolution, setCopiedSolution] = useState(false);

  // Auto-reset editor code & state whenever a brand new challenge starts
  useEffect(() => {
    if (activeChallenge?.id) {
      if (activeChallenge.id !== prevChallengeIdRef.current) {
        prevChallengeIdRef.current = activeChallenge.id;
        setChallengeCode(activeChallenge.questionCode || STARTER_TEMPLATES[language] || STARTER_TEMPLATES['cpp']);
        setMySubmission(activeChallenge.myScore !== null && activeChallenge.myScore !== undefined ? {
          score: activeChallenge.myScore,
          eval: { feedback: 'Evaluation complete.', strengths: 'Submitted', weaknesses: 'None', improvements: 'None' }
        } : null);
        setMatchResult(null);
        setCheatingDetected(false);
        pasteCountRef.current = 0;
      }
    } else {
      prevChallengeIdRef.current = null;
    }
  }, [activeChallenge?.id, language]);

  // Match result (when both submit or match completes)
  const [matchResult, setMatchResult] = useState<any>(null);

  // Abort confirm popup
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  // Cheating detection
  const [cheatingDetected, setCheatingDetected] = useState(false);
  const pasteCountRef = useRef(0);

  // AI Evaluation progress modal
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalStepIdx, setEvalStepIdx] = useState(0);

  // Avatar modal
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Dark/light theme detection
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  const headers = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // ── Theme detection ───────────────────────────────────────────────────────
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDarkTheme(isDark);
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => observer.disconnect();
  }, []);

  // ── Language change ───────────────────────────────────────────────────────
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setChallengeCode(STARTER_TEMPLATES[newLang] || STARTER_TEMPLATES['cpp']);
  };

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/arena/profile', { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setUserRank(data.rank);
        if (data.profile?.points !== undefined) {
          window.dispatchEvent(new CustomEvent('talentai_points_updated', {
            detail: { points: data.profile.points, tier: data.profile.tier }
          }));
        }
      }
    } catch (e) {}
  }, [headers]);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch('/api/arena/leaderboard', { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (e) {}
    finally { setLoadingLeaderboard(false); }
  }, [headers]);

  const fetchFriendsAndDirectory = useCallback(async () => {
    try {
      const [stdRes, frdRes, pndRes] = await Promise.all([
        fetch(`/api/arena/students?search=${encodeURIComponent(searchQuery)}`, { headers: headers() }),
        fetch('/api/arena/friends', { headers: headers() }),
        fetch('/api/arena/friends/pending', { headers: headers() }),
      ]);
      const [stdData, frdData, pndData] = await Promise.all([stdRes.json(), frdRes.json(), pndRes.json()]);
      if (stdRes.ok) setStudents(stdData.students || []);
      if (frdRes.ok) setFriends(frdData.friends || []);
      if (pndRes.ok) setPendingRequests(pndData.requests || []);
    } catch (e) {}
  }, [headers, searchQuery]);

  // ── Single-Click Return to Leaderboard ────────────────────────────────────
  const goToLeaderboard = useCallback(() => {
    if (activeChallenge?.id) {
      setDismissedIds(prev => [...prev, activeChallenge.id]);
    }
    setView('leaderboard');
    setActiveChallenge(null);
    setMySubmission(null);
    setMatchResult(null);
    setShowAbortConfirm(false);
    setCheatingDetected(false);
    setIsLoadingBattle(false);
    pasteCountRef.current = 0;
    setChallengeCode(STARTER_TEMPLATES[language]);
    fetchProfile();
    fetchLeaderboard();
  }, [activeChallenge, language, fetchProfile, fetchLeaderboard]);

  // ── Poll active challenge ─────────────────────────────────────────────────
  const pollActive = useCallback(async () => {
    try {
      const res = await fetch('/api/arena/challenge/active', { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();

      if (!data.challenge) {
        // While isLoadingBattle is true we wait for the matched challenge to appear;
        // don't reset to leaderboard yet — the DB write just happened.
        if (!isLoadingBattle && (view === 'battle' || view === 'pendingOutbound' || view === 'pendingInbound' || view === 'waiting')) {
          setActiveChallenge(null);
          setView('leaderboard');
        }
        return;
      }

      const ch = data.challenge;

      // If user dismissed this challenge, don't force them into it
      if (dismissedIds.includes(ch.id) && (ch.status === 'COMPLETED' || ch.status === 'ABORTED' || ch.status === 'EXPIRED' || ch.status === 'DECLINED')) {
        setIsLoadingBattle(false);
        return;
      }

      // Challenge is confirmed — clear the loading flag
      setIsLoadingBattle(false);
      setActiveChallenge(ch);

      // PENDING status (Friend challenge invitation)
      if (ch.status === 'PENDING') {
        if (ch.isChallenger) {
          if (view !== 'leaderboard' && view !== 'friends') setView('pendingOutbound');
        } else {
          if (view !== 'leaderboard' && view !== 'friends') setView('pendingInbound');
        }
        return;
      }

      // ACTIVE status
      if (ch.status === 'ACTIVE') {
        if (ch.iHaveSubmitted) {
          if (!mySubmission && ch.myScore !== null && ch.myScore !== undefined) {
            setMySubmission({
              score: ch.myScore,
              eval: { feedback: 'Code submitted successfully. Evaluation complete.', strengths: 'Submitted', weaknesses: 'None', improvements: 'None' }
            });
          }
          if (view !== 'leaderboard' && view !== 'friends' && view !== 'myResult') {
            setView('waiting');
          }
        } else {
          if (view !== 'myResult') {
            setView('battle');
          }
        }
        return;
      }

      // COMPLETED or ABORTED status
      if (ch.status === 'COMPLETED' || ch.status === 'ABORTED') {
        if (!mySubmission && ch.myScore !== null && ch.myScore !== undefined) {
          setMySubmission({
            score: ch.myScore,
            eval: { feedback: 'Match completed.', strengths: 'Evaluated', weaknesses: 'None', improvements: 'None' }
          });
        }
        if (!matchResult && !dismissedIds.includes(ch.id)) {
          const rRes = await fetch(`/api/arena/challenge/result/${ch.id}`, { headers: headers() });
          if (rRes.ok) {
            const rData = await rRes.json();
            setMatchResult(rData);
            if (view !== 'leaderboard' && view !== 'friends') setView('myResult');
            fetchProfile();
            fetchLeaderboard();
          }
        }
      }
    } catch (e) {}
  }, [headers, mySubmission, matchResult, dismissedIds, view, isLoadingBattle, fetchProfile, fetchLeaderboard]);

  useEffect(() => {
    fetchProfile();
    fetchLeaderboard();
    fetchFriendsAndDirectory();
    // Restore persistent queue timer if user is already searching
    fetch('/api/arena/matchmaking/status', { headers: headers() })
      .then(res => res.json())
      .then(data => {
        if (data.inQueue && typeof data.elapsedSecs === 'number') {
          setIsSearchingQueue(true);
          setQueueTimer(data.elapsedSecs);
        }
      })
      .catch(() => {});
  }, []);

  // Polling loop
  useEffect(() => {
    pollActive();
    const interval = setInterval(pollActive, 2000);
    return () => clearInterval(interval);
  }, [pollActive]);

  // Matchmaking queue status poller (Only matches real users who also clicked Find Random Opponent)
  useEffect(() => {
    if (!isSearchingQueue) return;
    const timerInt = setInterval(() => setQueueTimer(t => t + 1), 1000);
    const statusInt = setInterval(async () => {
      try {
        const res = await fetch('/api/arena/matchmaking/status', { headers: headers() });
        if (res.ok) {
          const data = await res.json();
          if (data.matched && data.challengeId) {
            setIsSearchingQueue(false);
            setQueueTimer(0);
            setMatchError('');
            // Mark that a battle is loading; pollActive() will set view + activeChallenge
            // together once the challenge is confirmed — avoids white-screen race.
            setIsLoadingBattle(true);
            pollActive();
          } else if (data.timedOut) {
            setIsSearchingQueue(false);
            setQueueTimer(0);
            setMatchError('No matchmaking possible right now. Try again later or challenge an online friend!');
          } else if (data.inQueue && typeof data.elapsedSecs === 'number') {
            setQueueTimer(data.elapsedSecs);
          }
        }
      } catch (e) {}
    }, 1000);
    return () => { clearInterval(timerInt); clearInterval(statusInt); };
  }, [isSearchingQueue, headers, pollActive]);

  useEffect(() => {
    if (queueTimer >= 60 && isSearchingQueue) {
      setIsSearchingQueue(false);
      setQueueTimer(0);
      setMatchError('No matchmaking possible right now. Try again later or challenge an online friend!');
      fetch('/api/arena/matchmaking/leave', { method: 'POST', headers: headers() }).catch(() => {});
    }
  }, [queueTimer, isSearchingQueue, headers]);

  // ── Anti-cheating: tab switch + paste ─────────────────────────────────────
  useEffect(() => {
    if (!activeChallenge || activeChallenge.status !== 'ACTIVE' || mySubmission || view !== 'battle') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setCheatingDetected(true);
        fetch('/api/arena/challenge/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers() },
          body: JSON.stringify({
            challengeId: activeChallenge.id,
            code: challengeCode,
            language,
            isCheating: true,
          })
        }).then(r => r.json()).then(data => {
          if (data.success) {
            setMySubmission({ score: 0, eval: data.eval });
            setView('myResult');
            fetchProfile();
            fetchLeaderboard();
          }
        }).catch(() => {});
      }
    };

    const handlePaste = () => {
      pasteCountRef.current += 1;
      if (pasteCountRef.current >= 2) {
        setCheatingDetected(true);
        fetch('/api/arena/challenge/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers() },
          body: JSON.stringify({
            challengeId: activeChallenge.id,
            code: challengeCode,
            language,
            isCheating: true,
          })
        }).then(r => r.json()).then(data => {
          if (data.success) {
            setMySubmission({ score: 0, eval: data.eval });
            setView('myResult');
            fetchProfile();
            fetchLeaderboard();
          }
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('paste', handlePaste);
    };
  }, [activeChallenge, headers, language, challengeCode, mySubmission, view]);

  // ── Avatar ───────────────────────────────────────────────────────────────
  const handleSaveAvatar = async (url: string) => {
    try {
      const res = await fetch('/api/arena/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ avatarUrl: url }),
      });
      if (res.ok) { setShowAvatarModal(false); fetchProfile(); }
    } catch (e) {}
  };

  // ── Abort ─────────────────────────────────────────────────────────────────
  const handleAbortConfirmed = async () => {
    if (!activeChallenge) return;
    setShowAbortConfirm(false);
    try {
      const res = await fetch('/api/arena/challenge/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ challengeId: activeChallenge.id }),
      });
      if (res.ok) {
        goToLeaderboard();
      }
    } catch (e) {}
  };

  // ── Respond to incoming challenge (Accept / Decline) ──────────────────────
  const handleRespondChallenge = async (action: 'ACCEPT' | 'DECLINE') => {
    if (!activeChallenge) return;
    try {
      const res = await fetch('/api/arena/challenge/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ challengeId: activeChallenge.id, action }),
      });
      if (res.ok) {
        if (action === 'ACCEPT') {
          setView('battle');
          setChallengeCode(STARTER_TEMPLATES[language]);
        } else {
          goToLeaderboard();
        }
      }
    } catch (e) {}
  };

  // ── Cancel outbound pending challenge ────────────────────────────────────
  const handleCancelPendingChallenge = async () => {
    if (!activeChallenge) return;
    try {
      await fetch('/api/arena/challenge/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ challengeId: activeChallenge.id }),
      });
      goToLeaderboard();
    } catch (e) {}
  };

  // ── Matchmaking ──────────────────────────────────────────────────────────
  const handleJoinQueue = async () => {
    setMatchError('');
    try {
      const res = await fetch('/api/arena/matchmaking/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ mode: arenaMode }),
      });
      if (res.ok) { setIsSearchingQueue(true); setQueueTimer(0); }
    } catch (e) {}
  };

  const handleCancelQueue = async () => {
    try { await fetch('/api/arena/matchmaking/leave', { method: 'POST', headers: headers() }); } catch (e) {}
    setIsSearchingQueue(false);
    setQueueTimer(0);
  };

  // ── Friend & Challenge actions ───────────────────────────────────────────
  const handleSendFriendRequest = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/arena/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) fetchFriendsAndDirectory();
    } catch (e) {}
  };

  const handleRespondFriendRequest = async (friendshipId: string, action: 'ACCEPTED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/arena/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ friendshipId, action }),
      });
      if (res.ok) fetchFriendsAndDirectory();
    } catch (e) {}
  };

  // ── Start friend battle ─────────────────────────────────────────────────
  const handleStartChallenge = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/arena/challenge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ targetUserId, mode: arenaMode }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveChallenge(data.challenge);
        setMySubmission(null);
        setMatchResult(null);
        setChallengeCode(data.challenge?.questionCode || STARTER_TEMPLATES[language]);
        setView('pendingOutbound');
      } else {
        alert(data.error || 'Failed to start challenge');
      }
    } catch (e) { alert('Error starting challenge'); }
  };

  // ── Submit solution ──────────────────────────────────────────────────────
  const handleSubmitChallenge = async () => {
    if (!activeChallenge || !challengeCode.trim()) return;
    setIsEvaluating(true);
    setEvalStepIdx(0);

    const stepTimer = setInterval(() => {
      setEvalStepIdx(prev => {
        if (prev < EVAL_STEPS.length - 1) return prev + 1;
        clearInterval(stepTimer);
        return prev;
      });
    }, 1800);

    try {
      const res = await fetch('/api/arena/challenge/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({
          challengeId: activeChallenge.id,
          code: challengeCode,
          language,
          isCheating: false,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMySubmission({ score: data.score, eval: data.eval });

        if (data.matchCompleted || data.challenge?.status === 'COMPLETED') {
          const rRes = await fetch(`/api/arena/challenge/result/${data.challenge?.id || activeChallenge.id}`, { headers: headers() });
          if (rRes.ok) {
            const rData = await rRes.json();
            setMatchResult(rData);
          }
        }

        setView('myResult');
        fetchProfile();
        fetchLeaderboard();
      }
    } catch (e) {
      alert('Submission error');
    } finally {
      setTimeout(() => {
        clearInterval(stepTimer);
        setIsEvaluating(false);
      }, 2000);
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────
  const renderExamples = (examplesJson?: any) => {
    if (!examplesJson) return null;
    let list: any[] = [];
    try {
      list = typeof examplesJson === 'string' ? JSON.parse(examplesJson) : examplesJson;
    } catch { return null; }
    if (!Array.isArray(list) || list.length === 0) return null;

    return (
      <div className="space-y-3 pt-3">
        <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Sample Examples ({list.length})
        </p>
        {list.map((ex: any, idx: number) => (
          <div key={idx} className="p-3.5 rounded-xl border text-xs space-y-2 font-mono shadow-sm" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider border-b pb-1" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <span>Example #{idx + 1}</span>
            </div>
            <div>
              <span className="font-bold text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Input:</span>
              <pre className="p-2 rounded-lg text-emerald-400 font-bold overflow-x-auto whitespace-pre-wrap font-mono text-[11px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>{ex.input}</pre>
            </div>
            <div>
              <span className="font-bold text-[11px] block mb-0.5" style={{ color: 'var(--text-muted)' }}>Output:</span>
              <pre className="p-2 rounded-lg font-bold overflow-x-auto whitespace-pre-wrap font-mono text-[11px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--brand)' }}>{ex.output}</pre>
            </div>
            {ex.explanation && (
              <div className="text-[11px] font-sans pt-1 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <strong className="text-amber-500">Explanation: </strong>{ex.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderConstraints = (constraintsJson?: any) => {
    if (!constraintsJson) return null;
    let list: string[] = [];
    try {
      list = typeof constraintsJson === 'string' ? JSON.parse(constraintsJson) : constraintsJson;
    } catch { return null; }
    if (!Array.isArray(list) || list.length === 0) return null;

    return (
      <div className="space-y-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
          <ShieldAlert className="w-3.5 h-3.5 text-blue-500" /> Constraints & Limits
        </p>
        <ul className="list-disc list-inside text-xs font-mono space-y-1.5 p-3 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          {list.map((c: string, idx: number) => <li key={idx} className="leading-relaxed">{c}</li>)}
        </ul>
      </div>
    );
  };

  const langLabel = (l: string) =>
    l === 'cpp' ? 'C++17' : l === 'python' ? 'Python 3' : l === 'java' ? 'Java 17' : 'JavaScript';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 w-full overflow-y-auto min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Abort Confirm Popup Modal ── */}
      {showAbortConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="p-7 rounded-2xl border max-w-sm w-full space-y-5 shadow-2xl text-center" style={{ background: 'var(--bg-card)', borderColor: 'rgba(239,68,68,0.5)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Abort Match?</h3>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                You will <strong className="text-red-400">lose 10 points</strong> and your opponent will <strong className="text-green-400">gain 10 points</strong>. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAbortConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs border transition-all"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                Cancel
              </button>
              <button onClick={handleAbortConfirmed}
                className="force-white flex-1 py-2.5 rounded-xl font-black text-xs transition-all"
                style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: '#ffffff' }}>
                <span style={{ color: '#ffffff' }}>Yes, Abort (−10 pts)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Evaluation Progress Modal ── */}
      {isEvaluating && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="p-8 rounded-3xl border max-w-lg w-full text-center space-y-6 shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--brand)' }}>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto animate-pulse" style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid var(--brand)', color: 'var(--brand)' }}>
              <Cpu className="w-10 h-10 animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                🤖 AI Code Evaluation Engine — {langLabel(language)}
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Analyzing {langLabel(language)} syntax, time complexity & bugs...
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold font-mono">
                <span style={{ color: 'var(--brand)' }}>{EVAL_STEPS[evalStepIdx].label}</span>
                <span style={{ color: '#f59e0b' }}>{EVAL_STEPS[evalStepIdx].progress}%</span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${EVAL_STEPS[evalStepIdx].progress}%`, background: 'linear-gradient(90deg, var(--brand), #10b981)' }} />
              </div>
            </div>
            <div className="text-[11px] font-mono p-3 rounded-xl border text-left space-y-1" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <div>[SYSTEM] Reading {langLabel(language)} solution AST tokens...</div>
              <div>[PARSER] Matching variable scoping & loop bounds...</div>
              <div>[BENCHMARK] Calculating Big-O Time & Space limits...</div>
              <div>[AI] Comparing against ground truth expected output...</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Avatar Modal ── */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl border max-w-md w-full space-y-4 shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Select Profile Picture</h3>
              <button onClick={() => setShowAvatarModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Choose Preset Avatar</p>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {AVATAR_PRESETS.map((url, i) => (
                  <img key={i} src={url} alt={`Preset ${i}`} onClick={() => handleSaveAvatar(url)}
                    className="w-14 h-14 rounded-xl object-cover cursor-pointer border-2 hover:scale-105 transition-all"
                    style={{ borderColor: profile?.avatarUrl === url ? 'var(--brand)' : 'transparent' }} />
                ))}
              </div>
              <p className="text-xs font-bold uppercase tracking-wider pt-2" style={{ color: 'var(--text-secondary)' }}>Or Enter Custom Image URL</p>
              <input type="text" placeholder="https://example.com/avatar.jpg" value={customAvatarUrl}
                onChange={e => setCustomAvatarUrl(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs outline-none"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              <button onClick={() => customAvatarUrl && handleSaveAvatar(customAvatarUrl)}
                className="force-white w-full py-2.5 rounded-xl font-bold text-xs"
                style={{ background: 'var(--brand)', color: '#ffffff' }}>
                <span style={{ color: '#ffffff' }}>Save Custom Avatar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header Banner ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Trophy className="w-3.5 h-3.5" /> AI Evaluated 1v1 Battle Arena
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Competitive Arena</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>12,000+ LeetCode &amp; CP Questions · C++17, Python 3, Java 17, JS · Abort = −10 pts</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleJoinQueue} disabled={isSearchingQueue}
            className="force-white px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            style={{
              background: arenaMode === 'HARD' ? 'linear-gradient(135deg, #dc2626, #991b1b)'
                : arenaMode === 'EASY' ? 'linear-gradient(135deg, #10b981, #059669)'
                : arenaMode === 'BLINDFOLD' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              color: '#ffffff',
            }}>
            {arenaMode === 'HARD' ? (
              <Flame className="w-4 h-4" style={{ color: '#ffffff', stroke: '#ffffff', fill: '#ffffff' }} />
            ) : arenaMode === 'BLINDFOLD' ? (
              <Glasses className="w-4 h-4" style={{ color: '#ffffff', stroke: '#ffffff' }} />
            ) : (
              <Zap className="w-4 h-4" style={{ color: '#ffffff', stroke: '#ffffff', fill: '#ffffff' }} />
            )}
            <span style={{ color: '#ffffff' }}>
              {isSearchingQueue
                ? `Searching ${arenaMode} Arena...`
                : `Find Random Opponent (${arenaMode === 'EASY' ? 'Easy Arena' : arenaMode === 'MEDIUM' ? 'Medium Arena' : arenaMode === 'HARD' ? 'Hard Arena' : 'Blindfold Arena'})`}
            </span>
          </button>
          {profile && (
            <div className="flex items-center gap-3 p-2.5 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div onClick={() => setShowAvatarModal(true)}
                className="w-10 h-10 rounded-xl overflow-hidden cursor-pointer border flex items-center justify-center relative group"
                style={{ background: 'var(--brand)', borderColor: 'var(--border)' }} title="Change Profile Picture">
                {profile.avatarUrl
                  ? <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  : <span className="text-white font-black text-sm">{profile.name?.charAt(0) || 'P'}</span>}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Image className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xs">
                <div className="font-black font-mono" style={{ color: '#f59e0b' }}>🏆 {profile.points} pts</div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Rank: <strong style={{ color: 'var(--text-primary)' }}>#{userRank || '—'}</strong></p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4 Arena Levels Selector Cards ── */}
      <div className="p-4 rounded-2xl border flex flex-col space-y-3 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}>
              4 Battle Levels
            </span>
            <span className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>
              Select Arena Difficulty Level:
            </span>
          </div>
          <span className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
            Active: <strong style={{ color: arenaMode === 'EASY' ? '#10b981' : arenaMode === 'MEDIUM' ? '#f59e0b' : arenaMode === 'HARD' ? '#ef4444' : '#8b5cf6' }}>{arenaMode} ARENA</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Easy Arena */}
          <button
            type="button"
            onClick={() => setArenaMode('EASY')}
            disabled={isSearchingQueue}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1.5 ${arenaMode === 'EASY' ? 'ring-2 ring-emerald-500 shadow-md' : 'opacity-70 hover:opacity-100'} disabled:opacity-50`}
            style={{
              background: arenaMode === 'EASY' ? 'rgba(16,185,129,0.1)' : 'var(--bg-secondary)',
              borderColor: arenaMode === 'EASY' ? '#10b981' : 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black flex items-center gap-1.5" style={{ color: '#10b981' }}>
                🟢 Easy Arena
              </span>
              {arenaMode === 'EASY' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>LeetCode Easy Questions</p>
          </button>

          {/* Medium Arena */}
          <button
            type="button"
            onClick={() => setArenaMode('MEDIUM')}
            disabled={isSearchingQueue}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1.5 ${arenaMode === 'MEDIUM' ? 'ring-2 ring-amber-500 shadow-md' : 'opacity-70 hover:opacity-100'} disabled:opacity-50`}
            style={{
              background: arenaMode === 'MEDIUM' ? 'rgba(245,158,11,0.1)' : 'var(--bg-secondary)',
              borderColor: arenaMode === 'MEDIUM' ? '#f59e0b' : 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black flex items-center gap-1.5" style={{ color: '#f59e0b' }}>
                🟡 Medium Arena
              </span>
              {arenaMode === 'MEDIUM' && <Check className="w-3.5 h-3.5 text-amber-500" />}
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>LeetCode Medium Questions</p>
          </button>

          {/* Hard Arena */}
          <button
            type="button"
            onClick={() => setArenaMode('HARD')}
            disabled={isSearchingQueue}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1.5 ${arenaMode === 'HARD' ? 'ring-2 ring-red-500 shadow-md' : 'opacity-70 hover:opacity-100'} disabled:opacity-50`}
            style={{
              background: arenaMode === 'HARD' ? 'rgba(239,68,68,0.1)' : 'var(--bg-secondary)',
              borderColor: arenaMode === 'HARD' ? '#ef4444' : 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black flex items-center gap-1.5" style={{ color: '#ef4444' }}>
                🔴 Hard Arena
              </span>
              {arenaMode === 'HARD' && <Check className="w-3.5 h-3.5 text-red-500" />}
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>LeetCode Hard Questions</p>
          </button>

          {/* Blindfold Arena */}
          <button
            type="button"
            onClick={() => setArenaMode('BLINDFOLD')}
            disabled={isSearchingQueue}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-1.5 ${arenaMode === 'BLINDFOLD' ? 'ring-2 ring-purple-500 shadow-md' : 'opacity-70 hover:opacity-100'} disabled:opacity-50`}
            style={{
              background: arenaMode === 'BLINDFOLD' ? 'rgba(139,92,246,0.1)' : 'var(--bg-secondary)',
              borderColor: arenaMode === 'BLINDFOLD' ? '#8b5cf6' : 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black flex items-center gap-1.5" style={{ color: '#8b5cf6' }}>
                🕶️ Blindfold Arena
              </span>
              {arenaMode === 'BLINDFOLD' && <Check className="w-3.5 h-3.5 text-purple-500" />}
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Any Level (Easy/Med/Hard)</p>
          </button>
        </div>
      </div>

      {/* ── Top Navigation Tabs (ALWAYS VISIBLE & CLICKABLE) ── */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl border flex-wrap" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <button onClick={goToLeaderboard}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'leaderboard' ? 'force-white' : ''}`}
            style={{
              background: view === 'leaderboard' ? 'var(--brand)' : 'transparent',
              color: view === 'leaderboard' ? '#ffffff' : 'var(--text-muted)',
            }}>
            <Trophy className="w-4 h-4" style={{ color: view === 'leaderboard' ? '#ffffff' : 'currentColor', stroke: view === 'leaderboard' ? '#ffffff' : 'currentColor' }} />
            <span style={{ color: view === 'leaderboard' ? '#ffffff' : 'var(--text-muted)' }}>🏆 Global Leaderboard</span>
          </button>
          <button onClick={() => setView('friends')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${view === 'friends' ? 'force-white' : ''}`}
            style={{
              background: view === 'friends' ? 'var(--brand)' : 'transparent',
              color: view === 'friends' ? '#ffffff' : 'var(--text-muted)',
            }}>
            <Users className="w-4 h-4" style={{ color: view === 'friends' ? '#ffffff' : 'currentColor', stroke: view === 'friends' ? '#ffffff' : 'currentColor' }} />
            <span style={{ color: view === 'friends' ? '#ffffff' : 'var(--text-muted)' }}>
              👥 Friends &amp; Directory {pendingRequests.length ? `(${pendingRequests.length})` : ''}
            </span>
          </button>
        </div>

        {/* Quick status indicator if an active arena exists */}
        {activeChallenge && view !== 'leaderboard' && view !== 'friends' && (
          <button onClick={goToLeaderboard}
            className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 border"
            style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--brand)', borderColor: 'rgba(37,99,235,0.3)' }}>
            <ChevronLeft className="w-3.5 h-3.5" /> Return to Leaderboard
          </button>
        )}
      </div>

      {/* ── Matchmaking queue banner ── */}
      {isSearchingQueue && (
        <div className="p-5 rounded-2xl border flex items-center justify-between flex-wrap gap-4 shadow-xl" style={{ background: 'var(--bg-card)', borderColor: arenaMode === 'HARD' ? '#dc2626' : 'var(--brand)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white animate-spin" style={{ background: arenaMode === 'HARD' ? '#dc2626' : 'var(--brand)' }}>
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
                Searching for rival in {arenaMode === 'HARD' ? '🔥 Hard Mode (CP)' : '⚡ Medium Mode (LeetCode)'}...
              </h4>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Elapsed: <strong className="font-mono text-amber-500">{queueTimer}s / 60s max</strong> · Matching only with real active players...
              </p>
            </div>
          </div>
          <button onClick={handleCancelQueue}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
            Cancel Queue
          </button>
        </div>
      )}

      {/* ── Matchmaking Error / Timeout Banner ── */}
      {matchError && (
        <div className="p-4 rounded-2xl border flex items-center justify-between gap-4" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)', color: '#ef4444' }}>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-bold">{matchError}</span>
          </div>
          <button onClick={() => setMatchError('')} className="p-1 rounded-lg hover:bg-red-500/10 text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW: PENDING OUTBOUND — "Waiting for friend to accept battle..."
      ───────────────────────────────────────────────────────────── */}
      {view === 'pendingOutbound' && activeChallenge && (
        <div className="p-8 rounded-3xl border text-center space-y-6 max-w-xl mx-auto shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--brand)' }}>
          <div className="w-20 h-20 rounded-3xl border flex items-center justify-center mx-auto animate-pulse"
            style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)', color: '#f59e0b' }}>
            <Hourglass className="w-10 h-10 animate-spin" />
          </div>
          <div>
            <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border inline-block mb-2"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}>
              ⚔️ 1v1 Battle Invitation Sent
            </span>
            <h3 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              Waiting for {activeChallenge.challengedName} to accept battle...
            </h3>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Challenge expires in <strong className="font-mono text-amber-500 text-sm">{activeChallenge.pendingTimerRemaining ?? 30}s</strong> if not accepted.
            </p>
          </div>
          <div className="p-4 rounded-2xl border text-left text-xs space-y-1.5" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <p className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Code2 className="w-4 h-4 text-brand" /> {activeChallenge.questionTitle}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Difficulty: <strong className="text-amber-500">{activeChallenge.difficulty}</strong></p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCancelPendingChallenge}
              className="flex-1 py-3 rounded-xl font-bold text-xs border transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>
              Cancel Challenge
            </button>
            <button onClick={goToLeaderboard}
              className="force-white flex-1 py-3 rounded-xl font-bold text-xs transition-all"
              style={{ background: 'var(--brand)', color: '#ffffff' }}>
              <span style={{ color: '#ffffff' }}>Return to Leaderboard</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW: PENDING INBOUND — Incoming challenge popup modal/card
      ───────────────────────────────────────────────────────────── */}
      {view === 'pendingInbound' && activeChallenge && (
        <div className="p-8 rounded-3xl border text-center space-y-6 max-w-xl mx-auto shadow-2xl animate-bounce" style={{ background: 'var(--bg-card)', borderColor: '#10b981' }}>
          <div className="w-20 h-20 rounded-3xl border flex items-center justify-center mx-auto shadow-xl"
            style={{ background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)', color: '#10b981' }}>
            <Swords className="w-10 h-10" />
          </div>
          <div>
            <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border inline-block mb-2"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}>
              🔥 Incoming 1v1 Battle Challenge
            </span>
            <h3 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              {activeChallenge.challengerName} has challenged you!
            </h3>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Time remaining to accept: <strong className="font-mono text-emerald-500 text-sm">{activeChallenge.pendingTimerRemaining ?? 30}s</strong>
            </p>
          </div>
          <div className="p-4 rounded-2xl border text-left text-xs space-y-1.5" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <p className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Code2 className="w-4 h-4 text-brand" /> {activeChallenge.questionTitle}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Difficulty: <strong className="text-amber-500">{activeChallenge.difficulty}</strong></p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleRespondChallenge('DECLINE')}
              className="flex-1 py-3.5 rounded-xl font-bold text-xs border transition-all"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              Decline
            </button>
            <button onClick={() => handleRespondChallenge('ACCEPT')}
              className="force-white flex-1 py-3.5 rounded-xl font-black text-sm transition-all shadow-lg"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', color: '#ffffff' }}>
              <span style={{ color: '#ffffff' }}>Accept Battle ⚔️</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW: BATTLE — Loading state (match found, fetching challenge)
      ───────────────────────────────────────────────────────────── */}
      {view === 'battle' && isLoadingBattle && !activeChallenge && (
        <div className="flex flex-col items-center justify-center py-24 space-y-5">
          <div className="w-20 h-20 rounded-3xl border flex items-center justify-center animate-pulse"
            style={{ background: 'rgba(37,99,235,0.1)', borderColor: 'var(--brand)', color: 'var(--brand)' }}>
            <Swords className="w-10 h-10 animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>⚔️ Match Found!</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading your 1v1 battle arena...</p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW: BATTLE (Active 1v1 fight)
      ───────────────────────────────────────────────────────────── */}
      {view === 'battle' && activeChallenge && activeChallenge.status === 'ACTIVE' && (
        <div className="rounded-2xl border shadow-xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--brand)' }}>
          {/* Battle header */}
          <div className="flex justify-between items-center flex-wrap gap-4 border-b p-5" style={{ borderColor: 'var(--border)' }}>
            <div>
              <span className="text-[10px] font-black px-3 py-1 rounded-full inline-flex items-center gap-1.5 border" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                <Swords className="w-3.5 h-3.5" /> 1v1 ARENA BATTLE — LIVE
              </span>
              <h3 className="text-2xl font-black mt-2" style={{ color: 'var(--text-primary)' }}>{activeChallenge.questionTitle}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Difficulty: <strong style={{ color: '#f59e0b' }}>{activeChallenge.difficulty}</strong></p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>vs Opponent</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {activeChallenge.isChallenger ? activeChallenge.challengedName : activeChallenge.challengerName}
                </p>
                {activeChallenge.opponentHasSubmitted && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                    ✓ Opponent submitted ({activeChallenge.opponentScore}/100) — score &gt; {activeChallenge.opponentScore} to win!
                  </span>
                )}
              </div>
              <button onClick={() => setShowAbortConfirm(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
                style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                title="Abort match (−10 pts)">
                <LogOut className="w-4 h-4" /> Abort
              </button>
            </div>
          </div>

          {/* Cheating warning bar */}
          {cheatingDetected && (
            <div className="mx-5 mt-4 p-3 rounded-xl border text-xs flex items-center gap-3 animate-pulse" style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}>
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-extrabold">⚠️ Integrity Violation Detected</p>
                <p className="opacity-80">Tab switch or repeated copy-paste detected. Score set to 0 automatically.</p>
              </div>
            </div>
          )}

          {/* Split layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ borderTop: '1px solid var(--border)' }}>
            {/* Problem panel */}
            <div className="p-5 space-y-4 overflow-y-auto border-b lg:border-b-0 lg:border-r" style={{ maxHeight: '76vh', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Code2 className="w-4 h-4" style={{ color: 'var(--brand)' }} /> Problem Description
                </h4>
                {/* Open CP Problem button */}
                {(activeChallenge.questionTitle?.toLowerCase().includes('codeforces') || activeChallenge.questionTitle?.includes('[CP')) && (() => {
                  const cfMatch = activeChallenge.questionTitle?.match(/(?:CF|CP)-?(\d+)([A-Z]\d?)/i) ||
                    activeChallenge.questionTitle?.match(/Codeforces\s+(\d+)([A-Z]\d?)/i);
                  if (cfMatch) {
                    const url = `https://codeforces.com/contest/${cfMatch[1]}/problem/${cfMatch[2].toUpperCase()}`;
                    return (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all hover:opacity-80"
                        style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <ExternalLink className="w-3 h-3" /> View CP Problem
                      </a>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Full problem statement */}
              <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
                {activeChallenge.questionText}
              </div>
              {renderExamples(activeChallenge.examples)}
              {renderConstraints(activeChallenge.constraints)}
            </div>

            {/* Monaco Editor panel */}
            <div className="flex flex-col" style={{ minHeight: '76vh' }}>
              <div className="flex justify-between items-center px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                  <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Code Editor</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--brand)' }}>
                    {langLabel(language)}
                  </span>
                </div>
                <select value={language} onChange={e => handleLanguageChange(e.target.value)}
                  className="border rounded-lg px-2.5 py-1 text-xs outline-none font-bold"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--brand)' }}>
                  <option value="cpp">C++ (GCC 17)</option>
                  <option value="python">Python 3</option>
                  <option value="java">Java 17</option>
                  <option value="javascript">JavaScript</option>
                </select>
              </div>
              <div className="flex-1" style={{ minHeight: '55vh' }}>
                <Editor
                  height="100%"
                  language={LANG_MONACO[language]}
                  value={challengeCode}
                  onChange={val => setChallengeCode(val || '')}
                  theme={isDarkTheme ? 'vs-dark' : 'light'}
                  options={MONACO_OPTIONS}
                />
              </div>
              <div className="p-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
                <button onClick={handleSubmitChallenge} disabled={isEvaluating}
                  className="force-white w-full py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.25)', color: '#ffffff' }}>
                  <Play className="w-4 h-4" style={{ color: '#ffffff', stroke: '#ffffff', fill: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>{isEvaluating ? 'Evaluating...' : 'Submit & Run AI Evaluation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW: MY RESULT — Shown immediately after submitting
      ───────────────────────────────────────────────────────────── */}
      {view === 'myResult' && (mySubmission || (activeChallenge?.myScore !== null && activeChallenge?.myScore !== undefined)) && (() => {
        const scoreVal = mySubmission?.score ?? activeChallenge?.myScore ?? 0;
        return (
        <div className="space-y-5 max-w-2xl mx-auto">
          {/* Score card */}
          <div className="p-8 rounded-2xl border shadow-xl text-center space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--brand)' }}>
            <div className="w-20 h-20 rounded-3xl border flex items-center justify-center mx-auto shadow-xl animate-bounce"
              style={{
                background: cheatingDetected ? 'rgba(239,68,68,0.1)' : scoreVal >= 70 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                borderColor: cheatingDetected ? 'rgba(239,68,68,0.4)' : scoreVal >= 70 ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)',
                color: cheatingDetected ? '#ef4444' : scoreVal >= 70 ? '#10b981' : '#f59e0b',
              }}>
              {cheatingDetected ? <ShieldAlert className="w-9 h-9" /> : scoreVal >= 70 ? <CheckCircle2 className="w-9 h-9" /> : <AlertCircle className="w-9 h-9" />}
            </div>

            <div>
              <h3 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
                {cheatingDetected ? '🚫 Integrity Violation' : '✅ Solution Submitted!'}
              </h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {cheatingDetected ? 'Tab switch/copy-paste detected. Score forced to 0.' : 'AI has evaluated your code.'}
              </p>
            </div>

            {/* Big score display */}
            <div className="py-5 rounded-2xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Your AI Score</p>
              <p className="text-6xl font-black font-mono" style={{ color: scoreVal >= 70 ? '#10b981' : scoreVal >= 40 ? '#f59e0b' : '#ef4444' }}>
                {scoreVal}<span className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>/100</span>
              </p>
            </div>

            {/* Opponent status */}
            {!matchResult && (
              <div className="flex items-center gap-3 justify-center p-3 rounded-xl border text-xs" style={{ background: 'rgba(37,99,235,0.08)', borderColor: 'rgba(37,99,235,0.25)' }}>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span style={{ color: 'var(--brand)' }}>
                  Waiting for opponent to submit... You can freely view the Leaderboard while they complete!
                </span>
              </div>
            )}

            {/* Full result (if both submitted) */}
            {matchResult && (
              <div className="space-y-3 text-left">
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border text-xs" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>{matchResult.challengerName}</p>
                    <p className="text-2xl font-black font-mono mt-1" style={{ color: '#f59e0b' }}>{matchResult.challenge?.challengerScore ?? '—'}/100</p>
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--text-muted)' }}>{matchResult.challengedName}</p>
                    <p className="text-2xl font-black font-mono mt-1" style={{ color: '#f59e0b' }}>{matchResult.challenge?.challengedScore ?? '—'}/100</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border text-center" style={{
                  background: matchResult.isWinner ? 'rgba(16,185,129,0.08)' : matchResult.isDraw ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                  borderColor: matchResult.isWinner ? 'rgba(16,185,129,0.3)' : matchResult.isDraw ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)',
                }}>
                  <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                    {matchResult.isWinner ? '🎉 You Won!' : matchResult.isDraw ? '🤝 Draw!' : '💔 Defeated'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {matchResult.isWinner ? `+${matchResult.earnedPoints} points added to your profile (|score diff| formula)` : matchResult.isDraw ? '+15 points (draw bonus)' : '+5 participation points'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* AI Eval Report */}
          {mySubmission?.eval && (
            <div className="p-6 rounded-2xl border space-y-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--brand)' }}>
                  <Cpu className="w-4 h-4" /> Comprehensive Performance & Complexity Report — {langLabel(language)}
                </h4>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--brand)' }}>
                  Score: {mySubmission.score}/100
                </span>
              </div>

              {/* Performance Metrics: Time & Space Complexity Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>Time Complexity Benchmark</span>
                    <span className="text-sm font-mono font-black" style={{ color: '#10b981' }}>
                      {mySubmission.eval.optimalTime || 'O(N)'}
                    </span>
                  </div>
                  <Clock className="w-5 h-5 text-emerald-400 opacity-80" />
                </div>
                <div className="p-3.5 rounded-xl border flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>Space Complexity Benchmark</span>
                    <span className="text-sm font-mono font-black" style={{ color: '#3b82f6' }}>
                      {mySubmission.eval.optimalSpace || 'O(1)'}
                    </span>
                  </div>
                  <Cpu className="w-5 h-5 text-blue-400 opacity-80" />
                </div>
              </div>

              {/* Feedback Summary */}
              <div className="p-3.5 rounded-xl border text-xs leading-relaxed" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                <strong className="text-blue-400 font-bold">Performance Summary: </strong>{mySubmission.eval.feedback}
              </div>

              {/* Optimal Approach Explanation */}
              {mySubmission.eval.optimalApproach && (
                <div className="p-3.5 rounded-xl border text-xs" style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.25)' }}>
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-[11px]" style={{ color: '#f59e0b' }}>
                    <Sparkles className="w-3.5 h-3.5" /> Optimal Algorithmic Approach
                  </p>
                  <p style={{ color: 'var(--text-primary)' }}>{mySubmission.eval.optimalApproach}</p>
                </div>
              )}

              {/* Flaws & Bugs */}
              <div className="p-3.5 rounded-xl border text-xs" style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' }}>
                <p className="font-bold flex items-center gap-1.5 mb-1 text-[11px]" style={{ color: '#ef4444' }}>
                  <Bug className="w-3.5 h-3.5" /> Bugs & Flaws Flagged
                </p>
                <p style={{ color: 'var(--text-primary)' }}>{mySubmission.eval.weaknesses}</p>
              </div>

              {/* Strengths */}
              <div className="p-3.5 rounded-xl border text-xs" style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.25)' }}>
                <p className="font-bold flex items-center gap-1.5 mb-1 text-[11px]" style={{ color: '#10b981' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Strengths Identified
                </p>
                <p style={{ color: 'var(--text-primary)' }}>{mySubmission.eval.strengths}</p>
              </div>

              {/* Recommended Refactoring */}
              <div className="p-3.5 rounded-xl border text-xs" style={{ background: 'rgba(37,99,235,0.06)', borderColor: 'rgba(37,99,235,0.25)' }}>
                <p className="font-bold flex items-center gap-1.5 mb-1 text-[11px]" style={{ color: 'var(--brand)' }}>
                  <Sparkles className="w-3.5 h-3.5" /> Recommended Refactoring Steps
                </p>
                <p style={{ color: 'var(--text-primary)' }}>{mySubmission.eval.improvements}</p>
              </div>

              {/* Test Cases Results Breakdown */}
              {mySubmission.eval.testCaseResults && mySubmission.eval.testCaseResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Code2 className="w-3.5 h-3.5" /> Test Case Execution Matrix
                  </p>
                  <div className="space-y-1.5">
                    {mySubmission.eval.testCaseResults.map((tc: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg border text-xs flex items-center justify-between" style={{
                        background: tc.passed ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)',
                        borderColor: tc.passed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                      }}>
                        <div className="space-y-0.5">
                          <span className="font-mono text-[11px]" style={{ color: 'var(--text-primary)' }}>Case #{idx + 1}: Input: <code>{tc.input}</code></span>
                          <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                            Expected: <span className="text-emerald-400">{tc.expected}</span> | Actual: <span className={tc.passed ? 'text-emerald-400' : 'text-rose-400'}>{tc.actual}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tc.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {tc.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Official Correct / Optimal Solution */}
              {(mySubmission.eval.referenceSolution || activeChallenge?.referenceSolution) && (
                <div className="p-4 rounded-xl border space-y-2 mt-4" style={{ background: '#090d16', borderColor: 'rgba(59,130,246,0.4)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-blue-400" /> Official Correct / Optimal Solution ({langLabel(language)})
                    </span>
                    <button
                      onClick={() => {
                        const solCode = mySubmission.eval.referenceSolution || activeChallenge?.referenceSolution;
                        navigator.clipboard.writeText(solCode);
                        setCopiedSolution(true);
                        setTimeout(() => setCopiedSolution(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {copiedSolution ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSolution ? 'Copied!' : 'Copy Solution'}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-black/60 text-slate-200 text-xs font-mono border border-blue-900/40 leading-relaxed whitespace-pre-wrap">
                    <code>{mySubmission.eval.referenceSolution || activeChallenge?.referenceSolution}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={goToLeaderboard}
              className="force-white flex-1 py-3.5 rounded-xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, var(--brand), #1d4ed8)', color: '#ffffff' }}>
              <ChevronLeft className="w-4 h-4" style={{ color: '#ffffff', stroke: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>Return to Leaderboard</span>
            </button>
            <button onClick={() => {
              if (activeChallenge?.id) setDismissedIds(prev => [...prev, activeChallenge.id]);
              setView('leaderboard');
              setActiveChallenge(null);
              setMySubmission(null);
              setMatchResult(null);
              setChallengeCode(STARTER_TEMPLATES[language]);
              fetchProfile();
              fetchLeaderboard();
            }}
              className="px-5 py-3.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-2"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
              <Swords className="w-4 h-4" /> New Arena
            </button>
          </div>
        </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          VIEW: WAITING — I submitted, waiting for opponent
      ───────────────────────────────────────────────────────────── */}
      {view === 'waiting' && mySubmission && !matchResult && (
        <div className="p-8 rounded-2xl border text-center space-y-5 max-w-xl mx-auto shadow-xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--brand)' }}>
          <div className="w-16 h-16 rounded-3xl border flex items-center justify-center mx-auto" style={{ background: 'rgba(37,99,235,0.1)', borderColor: 'rgba(37,99,235,0.3)', color: 'var(--brand)' }}>
            <Eye className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Waiting for Opponent...</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>You scored <strong className="text-2xl font-mono" style={{ color: '#10b981' }}>{mySubmission.score}/100</strong></p>
            {activeChallenge?.opponentHasSubmitted && (
              <p className="text-xs mt-2 font-bold" style={{ color: '#f59e0b' }}>
                Opponent has submitted! Calculating winner points...
              </p>
            )}
          </div>
          <button onClick={goToLeaderboard}
            className="force-white w-full py-3.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
            style={{ background: 'var(--brand)', color: '#ffffff' }}>
            <ChevronLeft className="w-4 h-4" style={{ color: '#ffffff', stroke: '#ffffff' }} />
            <span style={{ color: '#ffffff' }}>Return to Leaderboard</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEWS: LEADERBOARD / FRIENDS
      ───────────────────────────────────────────────────────────── */}

      {/* TAB: Leaderboard */}
      {view === 'leaderboard' && (
        <div className="p-6 rounded-2xl border space-y-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Trophy className="w-5 h-5" style={{ color: '#f59e0b' }} /> Global Student Leaderboard
            </h3>
            <button onClick={fetchLeaderboard} className="text-xs font-bold flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
          {loadingLeaderboard ? (
            <div className="space-y-3 py-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />)}
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden shadow-sm flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-secondary)' }}>
                    <tr className="border-b font-bold uppercase text-[10px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Points</th>
                      <th className="py-3 px-4 text-center">Wins</th>
                      <th className="py-3 px-4 text-center">Battles</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {leaderboard.map(st => (
                      <tr key={st.userId} className="transition-colors" style={{ background: st.userId === profile?.userId ? 'rgba(37,99,235,0.06)' : 'transparent' }}>
                        <td className="py-3.5 px-4 font-black">
                          {st.rank === 1 ? <span className="font-mono text-sm" style={{ color: '#f59e0b' }}>🥇 #1</span>
                            : st.rank === 2 ? <span className="font-mono text-sm" style={{ color: '#94a3b8' }}>🥈 #2</span>
                            : st.rank === 3 ? <span className="font-mono text-sm" style={{ color: '#d97706' }}>🥉 #3</span>
                            : <span className="font-mono" style={{ color: 'var(--text-muted)' }}>#{st.rank}</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-white text-xs" style={{ background: 'var(--brand)' }}>
                              {st.avatarUrl ? <img src={st.avatarUrl} alt={st.name} className="w-full h-full object-cover" /> : st.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                {st.name}
                                {st.userId === profile?.userId && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--brand)' }}>YOU</span>}
                              </p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{st.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border" style={{
                            background: st.isOnline ? 'rgba(16,185,129,0.1)' : 'var(--bg-secondary)',
                            color: st.isOnline ? '#10b981' : 'var(--text-muted)',
                            borderColor: st.isOnline ? 'rgba(16,185,129,0.3)' : 'var(--border)',
                          }}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {st.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-black font-mono text-sm" style={{ color: '#f59e0b' }}>{st.points} pts</td>
                        <td className="py-3.5 px-4 text-center font-bold" style={{ color: '#10b981' }}>{st.totalWins}</td>
                        <td className="py-3.5 px-4 text-center font-semibold" style={{ color: 'var(--text-muted)' }}>{st.totalChallenges}</td>
                        <td className="py-3.5 px-4 text-right">
                          {st.userId !== profile?.userId && (
                            <button onClick={() => handleStartChallenge(st.userId)}
                              className="force-white px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 ml-auto shadow-sm"
                              style={{ background: 'var(--brand)', color: '#ffffff' }}>
                              <Swords className="w-3.5 h-3.5" style={{ color: '#ffffff', stroke: '#ffffff' }} />
                              <span style={{ color: '#ffffff' }}>Challenge</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Friends & Directory */}
      {view === 'friends' && (() => {
        const pageSize = 6;
        const totalPages = Math.ceil(students.length / pageSize) || 1;
        const currentPage = Math.min(friendsPage, totalPages);
        const paginatedStudents = students.slice((currentPage - 1) * pageSize, currentPage * pageSize);

        return (
          <div className="space-y-6">
            {pendingRequests.length > 0 && (
              <div className="p-5 rounded-2xl border space-y-3" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)' }}>
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2" style={{ color: '#f59e0b' }}>
                  <UserPlus className="w-4 h-4" /> Pending Friend Requests ({pendingRequests.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {pendingRequests.map(req => (
                    <div key={req.friendshipId} className="p-3 rounded-xl border flex justify-between items-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      <div>
                        <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{req.sender.name}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{req.sender.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleRespondFriendRequest(req.friendshipId, 'ACCEPTED')} className="force-white p-1.5 rounded-lg" style={{ background: '#10b981', color: '#ffffff' }} title="Accept"><Check className="w-3.5 h-3.5" style={{ color: '#ffffff', stroke: '#ffffff' }} /></button>
                        <button onClick={() => handleRespondFriendRequest(req.friendshipId, 'REJECTED')} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }} title="Decline"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Toolbar: Search + Add Random Friend + Page Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Search students by name or email..."
                  value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setFriendsPage(1); }}
                  className="bg-transparent border-none outline-none text-xs w-full" style={{ color: 'var(--text-primary)' }} />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button onClick={handleAddRandomFriend}
                  className="force-white px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff' }}>
                  <UserPlus className="w-3.5 h-3.5" style={{ color: '#ffffff', stroke: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>Add Random Friend</span>
                </button>

                {/* Page Navigation (> symbol pagination, 6 people per page) */}
                <div className="flex items-center gap-2 border-l pl-3" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setFriendsPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg border text-xs font-bold disabled:opacity-30 transition-all cursor-pointer"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    title="Previous 6 people (<)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setFriendsPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="force-white p-1.5 rounded-lg border text-xs font-black disabled:opacity-30 transition-all cursor-pointer"
                    style={{ background: 'var(--brand)', borderColor: 'var(--brand)', color: '#ffffff' }}
                    title="Next 6 people (>)"
                  >
                    <ChevronRight className="w-4 h-4" style={{ color: '#ffffff', stroke: '#ffffff' }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Paginated Cards (6 per page) */}
            {students.length === 0 ? (
              <div className="p-12 text-center border rounded-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <Users className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p className="font-bold text-sm">No students found matching search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedStudents.map(st => {
                  const isFriend = st.friendship?.status === 'ACCEPTED';
                  const isPending = st.friendship?.status === 'PENDING';
                  const isFollowed = !!followedUsers[st.userId];
                  const userCommList = friendComments[st.userId] || [];

                  return (
                    <div key={st.userId} className="p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-sm relative transition-all hover:shadow-md" style={{ background: 'var(--bg-card)', borderColor: isFollowed ? 'rgba(37,99,235,0.4)' : 'var(--border)' }}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-white text-sm" style={{ background: 'var(--brand)' }}>
                            {st.avatarUrl ? <img src={st.avatarUrl} alt={st.name} className="w-full h-full object-cover" /> : st.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                              {st.name}
                              {isFollowed && <span className="text-[9px] px-1.5 py-0.5 rounded font-black" style={{ background: 'rgba(37,99,235,0.15)', color: '#2563eb' }}>Following</span>}
                            </p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{st.email}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0" style={{
                          background: st.isOnline ? 'rgba(16,185,129,0.1)' : 'var(--bg-secondary)',
                          color: st.isOnline ? '#10b981' : 'var(--text-muted)',
                          borderColor: st.isOnline ? 'rgba(16,185,129,0.3)' : 'var(--border)',
                        }}>{st.isOnline ? '🟢 Online' : 'Offline'}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        <span className="font-bold font-mono" style={{ color: '#f59e0b' }}>🏆 {st.points} pts</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{st.totalWins} Wins</span>
                        {userCommList.length > 0 && (
                          <span className="text-[10px] font-bold text-blue-500">💬 {userCommList.length} notes</span>
                        )}
                      </div>

                      {/* Action Row: Add Friend / Battle / Follow / Comment */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {isFriend
                          ? <span className="text-[11px] font-bold flex items-center gap-1 justify-center py-1.5 rounded-xl border" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}><Check className="w-3.5 h-3.5" /> Friends</span>
                          : isPending
                          ? <span className="text-[11px] font-bold text-center py-1.5 rounded-xl border" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}>Pending</span>
                          : <button onClick={() => handleSendFriendRequest(st.userId)}
                              className="py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1"
                              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                              <UserPlus className="w-3.5 h-3.5" /> Add Friend
                            </button>
                        }

                        <button onClick={() => handleStartChallenge(st.userId)}
                          className="force-white py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 shadow-sm"
                          style={{ background: 'var(--brand)', color: '#ffffff' }}>
                          <Swords className="w-3.5 h-3.5" style={{ color: '#ffffff', stroke: '#ffffff' }} />
                          <span style={{ color: '#ffffff' }}>Battle</span>
                        </button>

                        {/* Follow Button */}
                        <button
                          onClick={() => toggleFollow(st.userId)}
                          className="py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1"
                          style={{
                            background: isFollowed ? 'rgba(37,99,235,0.12)' : 'var(--bg-secondary)',
                            borderColor: isFollowed ? '#2563eb' : 'var(--border)',
                            color: isFollowed ? '#2563eb' : 'var(--text-primary)',
                          }}
                        >
                          {isFollowed ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                          {isFollowed ? 'Following' : 'Follow'}
                        </button>

                        {/* Comment/Text Button */}
                        <button
                          onClick={() => setActiveCommentUser(st)}
                          className="py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1"
                          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                          title="Write comment or note to person"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Comment
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Footer */}
            <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                Showing 6 people per page ({paginatedStudents.length} displayed of {students.length} total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFriendsPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-30 flex items-center gap-1"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <span className="text-xs font-extrabold px-2" style={{ color: 'var(--text-primary)' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setFriendsPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="force-white px-3 py-1.5 rounded-lg border text-xs font-black disabled:opacity-30 flex items-center gap-1"
                  style={{ background: 'var(--brand)', borderColor: 'var(--brand)', color: '#ffffff' }}
                >
                  <span style={{ color: '#ffffff' }}>Next (&gt;)</span> <ChevronRight className="w-3.5 h-3.5" style={{ color: '#ffffff', stroke: '#ffffff' }} />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Comment / Text Modal Popup ── */}
      {activeCommentUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl border max-w-lg w-full space-y-4 shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-white text-sm" style={{ background: 'var(--brand)', color: '#ffffff' }}>
                  {activeCommentUser.avatarUrl ? <img src={activeCommentUser.avatarUrl} alt={activeCommentUser.name} className="w-full h-full object-cover" /> : <span style={{ color: '#ffffff' }}>{activeCommentUser.name.charAt(0)}</span>}
                </div>
                <div>
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                    Comment / Note for {activeCommentUser.name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{activeCommentUser.email}</p>
                </div>
              </div>
              <button onClick={() => setActiveCommentUser(null)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>

            {/* Send Comment Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>Write a message / comment:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Great battle yesterday! Let's practice DP problems together."
                  value={newCommentInput}
                  onChange={e => setNewCommentInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                  className="flex-1 p-2.5 rounded-xl border text-xs outline-none"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
                <button
                  onClick={handleAddComment}
                  className="force-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0"
                  style={{ background: 'var(--brand)', color: '#ffffff' }}
                >
                  <Send className="w-3.5 h-3.5" style={{ color: '#ffffff', stroke: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>Send</span>
                </button>
              </div>
            </div>

            {/* Comment History List */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Comment History ({(friendComments[activeCommentUser.userId] || []).length})
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {(friendComments[activeCommentUser.userId] || []).length === 0 ? (
                  <p className="text-xs italic text-center py-4" style={{ color: 'var(--text-muted)' }}>No comments written yet for this person.</p>
                ) : (
                  (friendComments[activeCommentUser.userId] || []).map(c => (
                    <div key={c.id} className="p-3 rounded-xl border text-xs space-y-1" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                      <div className="flex justify-between items-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        <span className="font-bold text-brand">YOU</span>
                        <span>{c.date}</span>
                      </div>
                      <p style={{ color: 'var(--text-primary)' }}>{c.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setActiveCommentUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
