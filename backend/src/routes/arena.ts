import { Router, Response } from 'express';
import { prisma } from '../services/db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { evaluateAnswer } from '../services/ai';
import {
  fetchCombinedCatalog,
  fetchAllProblems,
  fetchCPProblems,
  enrichProblem,
  enrichCPProblem,
  fetchProblemDetails,
  titleToSlug,
  RICH_LEETCODE_CATALOG,
  RICH_CP_CATALOG
} from './leetcode';

const router = Router();

export type ArenaMode = 'EASY' | 'MEDIUM' | 'HARD' | 'BLINDFOLD';

// Helper to pick a non-repeating rich question from LeetCode catalog based on selected Arena level
async function pickUnusedQuestion(userA: string, userB: string, mode: ArenaMode = 'MEDIUM') {
  try {
    const richLCList = Object.entries(RICH_LEETCODE_CATALOG).map(([k, v]) => ({
      ...v,
      questionFrontendId: k,
      source: 'LEETCODE',
    }));
    const fetched = await fetchAllProblems();
    let catalog = [...richLCList, ...fetched];

    if (!catalog || catalog.length === 0) {
      catalog = await fetchCombinedCatalog();
    }

    // Filter by selected level
    let targetPool = catalog;
    if (mode === 'EASY') {
      targetPool = catalog.filter(q => (q.difficulty || '').toUpperCase() === 'EASY');
    } else if (mode === 'MEDIUM') {
      targetPool = catalog.filter(q => (q.difficulty || '').toUpperCase() === 'MEDIUM');
    } else if (mode === 'HARD') {
      targetPool = catalog.filter(q => (q.difficulty || '').toUpperCase() === 'HARD');
    } else if (mode === 'BLINDFOLD') {
      // Blindfold Arena: Any level question can come (Easy, Medium, or Hard)!
      targetPool = catalog;
    }

    if (!targetPool || targetPool.length === 0) {
      targetPool = catalog;
    }

    const recent = await prisma.challenge.findMany({
      where: {
        OR: [
          { challengerId: userA },
          { challengedId: userA },
          { challengerId: userB },
          { challengedId: userB },
        ],
      },
      select: { questionTitle: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const recentTitles = new Set(recent.map(c => c.questionTitle));
    const available = targetPool.filter(q => !recentTitles.has(q.title) && !recentTitles.has(q.name));
    const pool = available.length > 0 ? available : targetPool;
    const p = pool[Math.floor(Math.random() * pool.length)];

    const enriched = enrichProblem(p);
    const slug = p.titleSlug || p.slug || titleToSlug(p.title);
    if (slug) {
      try {
        const liveDetails = await fetchProblemDetails(slug);
        if (liveDetails && liveDetails.text && liveDetails.text.length > 40) {
          enriched.text = liveDetails.text;
        }
      } catch {}
    }

    const cleanTitle = (enriched.title || p.title || p.name || 'Problem')
      .replace(/^\[(LeetCode|Codeforces|CP)[^\]]*\]\s*/i, '')
      .replace(/^#\S+\s*·\s*/, '')
      .trim();

    const qFrontendId = p.questionFrontendId || (p.contestId && p.index ? `${p.contestId}${p.index}` : p.id || '');
    const tagLabel = mode === 'BLINDFOLD' ? '🕶️ Blindfold Arena' : `LeetCode #${qFrontendId || 'LC'}`;
    const sourceTag = `[${tagLabel}]`;

    return {
      title: `${sourceTag} ${cleanTitle}`,
      text: enriched.text || `Problem description for ${cleanTitle}`,
      inputFormat: 'Function parameters or standard input',
      outputFormat: 'Returned value or standard output',
      examples: typeof enriched.examples === 'string' ? enriched.examples : JSON.stringify(enriched.examples || []),
      constraints: typeof enriched.constraints === 'string' ? enriched.constraints : JSON.stringify(enriched.constraints || []),
      code: enriched.codeSnippet || `// ${tagLabel}: ${cleanTitle}\n\nfunction solution() {\n  // Write your optimal solution below\n}\n`,
      expected: 'Optimal Output',
      difficulty: (enriched.difficulty || p.difficulty || (mode === 'HARD' ? 'HARD' : mode === 'EASY' ? 'EASY' : 'MEDIUM')).toUpperCase(),
    };
  } catch {
    const q = CODING_QUESTIONS[Math.floor(Math.random() * CODING_QUESTIONS.length)];
    return q;
  }
}

// In-memory queue for random 1v1 matchmaking
// Tracks { userId, joinedAt, mode: ArenaMode }
const matchmakingQueue: { userId: string; joinedAt: number; mode: ArenaMode }[] = [];

// ── Helpers ─────────────────────────────────────────────────────────

async function getOrCreateProfile(userId: string) {
  let profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.studentProfile.create({ data: { userId } });
  }
  return profile;
}

function toSafeUser(userId: string, name: string, email: string, profile: any, rank: number) {
  return {
    userId,
    name,
    email,
    avatarUrl: profile?.avatarUrl || null,
    points: profile?.points ?? 0,
    totalWins: profile?.totalWins ?? 0,
    totalLosses: profile?.totalLosses ?? 0,
    totalChallenges: profile?.totalChallenges ?? 0,
    totalSolved: profile?.totalSolved ?? 0,
    streak: profile?.streak ?? 0,
    lastSeen: profile?.lastSeen ?? null,
    rank,
    isOnline: profile?.lastSeen
      ? Date.now() - new Date(profile.lastSeen).getTime() < 5 * 60 * 1000 // 5 min
      : false,
  };
}

// Update lastSeen on every arena request
router.use(authenticateToken, async (req: AuthRequest, _res, next) => {
  const userId = req.user?.id;
  if (userId && req.user?.role === 'STUDENT') {
    prisma.studentProfile.upsert({
      where: { userId },
      update: { lastSeen: new Date() },
      create: { userId, lastSeen: new Date() },
    }).catch(() => {});
  }
  next();
});

// ── Update Profile Avatar ────────────────────────────────────────────
router.post('/profile/avatar', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { avatarUrl } = req.body;
  try {
    const profile = await prisma.studentProfile.upsert({
      where: { userId },
      create: { userId, avatarUrl },
      update: { avatarUrl },
    });
    return res.json({ success: true, profile });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 1. Global Leaderboard ────────────────────────────────────────────
router.get('/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    const profiles = await prisma.studentProfile.findMany({
      orderBy: { points: 'desc' },
      take: 100,
    });

    const userIds = profiles.map(p => p.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const leaderboard = profiles.map((p, i) => {
      const u = userMap[p.userId] || { name: 'Unknown', email: '' };
      return toSafeUser(p.userId, u.name, u.email, p, i + 1);
    });

    return res.json({ leaderboard });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 2. Own Profile ───────────────────────────────────────────────────
router.get('/profile', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const profile = await getOrCreateProfile(userId);
    const allProfiles = await prisma.studentProfile.findMany({ orderBy: { points: 'desc' } });
    const rank = allProfiles.findIndex(p => p.userId === userId) + 1;
    return res.json({ profile, rank });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 3. Search Students ───────────────────────────────────────────────
router.get('/students', async (req: AuthRequest, res: Response) => {
  const search = (req.query.search as string) || '';
  const userId = req.user!.id;
  try {
    const users = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        id: { not: userId },
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, email: true },
      take: 50,
    });

    const userIds = users.map(u => u.id);
    const profiles = await prisma.studentProfile.findMany({
      where: { userId: { in: userIds } },
    });
    const profileMap = Object.fromEntries(profiles.map(p => [p.userId, p]));

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: { in: userIds } },
          { receiverId: userId, senderId: { in: userIds } },
        ],
      },
    });

    const friendshipMap: Record<string, any> = {};
    for (const f of friendships) {
      const otherId = f.senderId === userId ? f.receiverId : f.senderId;
      friendshipMap[otherId] = {
        friendshipId: f.id,
        status: f.status,
        isSender: f.senderId === userId,
      };
    }

    const students = users.map((u, i) => ({
      ...toSafeUser(u.id, u.name, u.email, profileMap[u.id], i + 1),
      friendship: friendshipMap[u.id] || null,
    }));

    return res.json({ students });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 4. Send Friend Request ───────────────────────────────────────────
router.post('/friends/request', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });
  try {
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
    });
    if (existing) return res.status(409).json({ error: 'Request already exists', friendship: existing });

    const friendship = await prisma.friendship.create({
      data: { senderId: userId, receiverId: targetUserId, status: 'PENDING' },
    });
    return res.json({ success: true, friendship });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 5. Respond to Friend Request ─────────────────────────────────────
router.post('/friends/respond', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { friendshipId, action } = req.body;
  try {
    const friendship = await prisma.friendship.findFirst({
      where: { id: friendshipId, receiverId: userId },
    });
    if (!friendship) return res.status(404).json({ error: 'Request not found' });

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: action },
    });
    return res.json({ success: true, friendship: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 6. Get Friends ───────────────────────────────────────────────────
router.get('/friends', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    });

    const friendIds = friendships.map(f => f.senderId === userId ? f.receiverId : f.senderId);
    const users = await prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: { id: true, name: true, email: true },
    });
    const profiles = await prisma.studentProfile.findMany({ where: { userId: { in: friendIds } } });
    const profileMap = Object.fromEntries(profiles.map(p => [p.userId, p]));

    const friends = users.map((u, i) => toSafeUser(u.id, u.name, u.email, profileMap[u.id], i + 1));
    return res.json({ friends });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 7. Pending Requests ──────────────────────────────────────────────
router.get('/friends/pending', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const pending = await prisma.friendship.findMany({
      where: { receiverId: userId, status: 'PENDING' },
    });
    const senderIds = pending.map(f => f.senderId);
    const users = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const requests = pending.map(f => ({
      friendshipId: f.id,
      createdAt: f.createdAt,
      sender: userMap[f.senderId] || { id: f.senderId, name: 'Unknown', email: '' },
    }));
    return res.json({ requests });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 8. Expanded Non-Repeating Coding Questions Bank (16 Questions) ────
const CODING_QUESTIONS = [
  { 
    title: 'Two Sum',
    text: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
    inputFormat: 'Line 1: Array of integers nums\nLine 2: Target integer',
    outputFormat: 'Return array of 2 indices [i, j]',
    examples: JSON.stringify([
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]', explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].' }
    ]),
    constraints: JSON.stringify(['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Only one valid answer exists.']),
    code: '// Write your solution from scratch below...\n',
    expected: '[0,1]',
    difficulty: 'EASY'
  },
  { 
    title: 'Valid Palindrome',
    text: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Return true if it is a palindrome, or false otherwise.',
    inputFormat: 'Single string s containing ASCII characters',
    outputFormat: 'Return boolean true or false',
    examples: JSON.stringify([
      { input: 's = "A man, a plan, a canal: Panama"', output: 'true', explanation: '"amanaplanacanalpanama" is a palindrome.' },
      { input: 's = "race a car"', output: 'false', explanation: '"raceacar" is not a palindrome.' }
    ]),
    constraints: JSON.stringify(['1 <= s.length <= 2 * 10^5', 's consists only of printable ASCII characters.']),
    code: '// Write your solution from scratch below...\n',
    expected: 'true',
    difficulty: 'EASY'
  },
  { 
    title: 'Maximum Subarray (Kadane)',
    text: 'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
    inputFormat: 'Array of integers nums',
    outputFormat: 'Return single integer representing max sum',
    examples: JSON.stringify([
      { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'Subarray [4,-1,2,1] has the largest sum 6.' },
      { input: 'nums = [5,4,-1,7,8]', output: '23', explanation: 'Subarray [5,4,-1,7,8] has the largest sum 23.' }
    ]),
    constraints: JSON.stringify(['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4']),
    code: '// Write your solution from scratch below...\n',
    expected: '6',
    difficulty: 'MEDIUM'
  },
  { 
    title: 'Valid Parentheses',
    text: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid. Open brackets must be closed by the same type of brackets and in correct order.',
    inputFormat: 'Single string s',
    outputFormat: 'Return boolean true or false',
    examples: JSON.stringify([
      { input: 's = "()[]{}"', output: 'true', explanation: 'All brackets closed in correct order.' },
      { input: 's = "(]"', output: 'false', explanation: 'Mismatched bracket types.' }
    ]),
    constraints: JSON.stringify(['1 <= s.length <= 10^4', 's consists of brackets only: ()[]{}']),
    code: '// Write your solution from scratch below...\n',
    expected: 'true',
    difficulty: 'EASY'
  },
  { 
    title: 'Best Time to Buy and Sell Stock',
    text: 'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.',
    inputFormat: 'Array of integer prices',
    outputFormat: 'Return single integer max profit',
    examples: JSON.stringify([
      { input: 'prices = [7,1,5,3,6,4]', output: '5', explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.' }
    ]),
    constraints: JSON.stringify(['1 <= prices.length <= 10^5', '0 <= prices[i] <= 10^4']),
    code: '// Write your solution from scratch below...\n',
    expected: '5',
    difficulty: 'EASY'
  },
  {
    title: 'Container With Most Water',
    text: 'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.',
    inputFormat: 'Array of integer heights',
    outputFormat: 'Return single integer max area',
    examples: JSON.stringify([
      { input: 'height = [1,8,6,2,5,4,8,3,7]', output: '49', explanation: 'The vertical lines are [1,8,6,2,5,4,8,3,7]. In this case, max area of water is 49.' }
    ]),
    constraints: JSON.stringify(['n == height.length', '2 <= n <= 10^5', '0 <= height[i] <= 10^4']),
    code: '// Write your solution from scratch below...\n',
    expected: '49',
    difficulty: 'MEDIUM'
  },
  {
    title: '3Sum',
    text: 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0. Notice that the solution set must not contain duplicate triplets.',
    inputFormat: 'Array of integers nums',
    outputFormat: 'Return array of triplet arrays',
    examples: JSON.stringify([
      { input: 'nums = [-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]', explanation: 'The distinct triplets that sum to 0 are [-1,0,1] and [-1,-1,2].' }
    ]),
    constraints: JSON.stringify(['3 <= nums.length <= 3000', '-10^5 <= nums[i] <= 10^5']),
    code: '// Write your solution from scratch below...\n',
    expected: '[[-1,-1,2],[-1,0,1]]',
    difficulty: 'MEDIUM'
  },
  {
    title: 'Reverse Linked List',
    text: 'Given the head of a singly linked list, reverse the list, and return the reversed list head.',
    inputFormat: 'Head of a singly linked list',
    outputFormat: 'Reversed head node',
    examples: JSON.stringify([
      { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]', explanation: 'Nodes reversed in backwards sequence.' }
    ]),
    constraints: JSON.stringify(['Number of nodes in the list is in range [0, 5000]', '-5000 <= Node.val <= 5000']),
    code: '// Write your solution from scratch below...\n',
    expected: '[5,4,3,2,1]',
    difficulty: 'EASY'
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    text: 'Given a string s, find the length of the longest substring without repeating characters.',
    inputFormat: 'Single string s',
    outputFormat: 'Return integer length',
    examples: JSON.stringify([
      { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
      { input: 's = "bbbbb"', output: '1', explanation: 'The answer is "b", with the length of 1.' }
    ]),
    constraints: JSON.stringify(['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces.']),
    code: '// Write your solution from scratch below...\n',
    expected: '3',
    difficulty: 'MEDIUM'
  },
  {
    title: 'Climbing Stairs',
    text: 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    inputFormat: 'Single integer n steps',
    outputFormat: 'Return integer distinct ways',
    examples: JSON.stringify([
      { input: 'n = 3', output: '3', explanation: '1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step' }
    ]),
    constraints: JSON.stringify(['1 <= n <= 45']),
    code: '// Write your solution from scratch below...\n',
    expected: '3',
    difficulty: 'EASY'
  },
  {
    title: 'Group Anagrams',
    text: 'Given an array of strings strs, group the anagrams together. You can return the answer in any order.',
    inputFormat: 'Array of strings strs',
    outputFormat: 'Grouped array of string arrays',
    examples: JSON.stringify([
      { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]', explanation: 'Anagrams grouped by sorted character frequencies.' }
    ]),
    constraints: JSON.stringify(['1 <= strs.length <= 10^4', '0 <= strs[i].length <= 100']),
    code: '// Write your solution from scratch below...\n',
    expected: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
    difficulty: 'MEDIUM'
  },
  {
    title: 'Search in Rotated Sorted Array',
    text: 'Given the array nums after the possible rotation and an integer target, return the index of target if it is in nums, or -1 if it is not in nums. You must write an algorithm with O(log n) runtime complexity.',
    inputFormat: 'Rotated sorted array nums and target integer',
    outputFormat: 'Return index integer (-1 if not found)',
    examples: JSON.stringify([
      { input: 'nums = [4,5,6,7,0,1,2], target = 0', output: '4', explanation: 'Target 0 is located at index 4.' }
    ]),
    constraints: JSON.stringify(['1 <= nums.length <= 5000', '-10^4 <= nums[i] <= 10^4', 'O(log n) time requirement']),
    code: '// Write your solution from scratch below...\n',
    expected: '4',
    difficulty: 'MEDIUM'
  },
  {
    title: 'Product of Array Except Self',
    text: 'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. Must run in O(n) time without division.',
    inputFormat: 'Array of integers nums',
    outputFormat: 'Return product array answer',
    examples: JSON.stringify([
      { input: 'nums = [1,2,3,4]', output: '[24,12,8,6]', explanation: '24 = 2*3*4, 12 = 1*3*4, 8 = 1*2*4, 6 = 1*2*3' }
    ]),
    constraints: JSON.stringify(['2 <= nums.length <= 10^5', '-30 <= nums[i] <= 30']),
    code: '// Write your solution from scratch below...\n',
    expected: '[24,12,8,6]',
    difficulty: 'MEDIUM'
  },
  {
    title: 'Find Minimum in Rotated Sorted Array',
    text: 'Suppose an array of length n sorted in ascending order is rotated between 1 and n times. Given the sorted rotated array nums of unique elements, return the minimum element of this array in O(log n) time.',
    inputFormat: 'Array of rotated sorted integers nums',
    outputFormat: 'Return minimum integer value',
    examples: JSON.stringify([
      { input: 'nums = [3,4,5,1,2]', output: '1', explanation: 'Original array was [1,2,3,4,5] rotated 3 times.' }
    ]),
    constraints: JSON.stringify(['1 <= n <= 5000', '-5000 <= nums[i] <= 5000']),
    code: '// Write your solution from scratch below...\n',
    expected: '1',
    difficulty: 'MEDIUM'
  }
];

// ── 9. Matchmaking Queue ─────────────────────────────────────────────
// ONLY matches when BOTH parties have clicked "Find Random Opponent"
router.post('/matchmaking/join', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const rawMode = req.body?.mode;
  const mode: ArenaMode = ['EASY', 'MEDIUM', 'HARD', 'BLINDFOLD'].includes(rawMode) ? rawMode : 'MEDIUM';

  try {
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000);
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    // 1. Expire old pending challenges
    await prisma.challenge.updateMany({
      where: {
        OR: [{ challengerId: userId }, { challengedId: userId }],
        status: 'PENDING',
      },
      data: { status: 'EXPIRED' },
    }).catch(() => {});

    // 2. Auto-complete old active challenges (>30m)
    await prisma.challenge.updateMany({
      where: {
        OR: [{ challengerId: userId }, { challengedId: userId }],
        status: 'ACTIVE',
        startedAt: { lt: thirtyMinsAgo },
      },
      data: { status: 'COMPLETED', endedAt: new Date() },
    }).catch(() => {});

    const existingIdx = matchmakingQueue.findIndex(q => q.userId === userId);
    if (existingIdx !== -1) matchmakingQueue.splice(existingIdx, 1);
    matchmakingQueue.push({ userId, joinedAt: Date.now(), mode });
    return res.json({ success: true, mode, queuePosition: matchmakingQueue.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/matchmaking/leave', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const idx = matchmakingQueue.findIndex(q => q.userId === userId);
  if (idx !== -1) matchmakingQueue.splice(idx, 1);
  return res.json({ success: true });
});

router.get('/matchmaking/status', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000);
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Auto-expire old pending challenges (>30s)
    await prisma.challenge.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: thirtySecsAgo },
      },
      data: { status: 'EXPIRED' },
    }).catch(() => {});

    // Auto-complete old active challenges (>30m)
    await prisma.challenge.updateMany({
      where: {
        status: 'ACTIVE',
        startedAt: { lt: thirtyMinsAgo },
      },
      data: { status: 'COMPLETED', endedAt: new Date() },
    }).catch(() => {});

    // Only ACTIVE challenges created <30m ago where user has not yet submitted count as active matches
    const active = await prisma.challenge.findFirst({
      where: {
        status: 'ACTIVE',
        startedAt: { gte: thirtyMinsAgo },
        OR: [
          { challengerId: userId, challengerScore: null },
          { challengedId: userId, challengedScore: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (active) {
      const idx = matchmakingQueue.findIndex(q => q.userId === userId);
      if (idx !== -1) matchmakingQueue.splice(idx, 1);
      return res.json({ matched: true, challengeId: active.id });
    }

    const queueIdx = matchmakingQueue.findIndex(q => q.userId === userId);
    if (queueIdx === -1) {
      return res.json({ matched: false, inQueue: false });
    }

    const myQueueItem = matchmakingQueue[queueIdx];
    const otherEntry = matchmakingQueue.find(q => q.userId !== userId);

    if (otherEntry) {
      const idx1 = matchmakingQueue.findIndex(q => q.userId === userId);
      if (idx1 !== -1) matchmakingQueue.splice(idx1, 1);
      const idx2 = matchmakingQueue.findIndex(q => q.userId === otherEntry.userId);
      if (idx2 !== -1) matchmakingQueue.splice(idx2, 1);

      // Selected mode priority
      const battleMode: ArenaMode = myQueueItem.mode || otherEntry.mode || 'MEDIUM';

      const q: any = await pickUnusedQuestion(userId, otherEntry.userId, battleMode);

      const questionPayload = JSON.stringify({
        text: q.text,
        examples: q.examples,
        constraints: q.constraints,
        inputFormat: q.inputFormat,
        outputFormat: q.outputFormat,
        optimalTime: q.optimalTime || 'O(N)',
        optimalSpace: q.optimalSpace || 'O(1)',
        optimalApproach: q.optimalApproach || 'Optimal Greedy / Two Pointers Approach',
        referenceSolution: q.referenceSolution || null,
      });

      const challenge = await prisma.challenge.create({
        data: {
          challengerId: userId,
          challengedId: otherEntry.userId,
          questionTitle: q.title,
          questionText: questionPayload,
          questionCode: q.code,
          expectedOutput: q.expected,
          difficulty: q.difficulty,
          timeLimitSecs: 1800,
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      });
      return res.json({ matched: true, challengeId: challenge.id });
    }

    // Check 60-second timeout if no other real player has joined queue
    const elapsedMs = Date.now() - (myQueueItem.joinedAt || Date.now());
    if (elapsedMs >= 60000) {
      matchmakingQueue.splice(queueIdx, 1);
      return res.json({ matched: false, timedOut: true, message: 'No matchmaking possible right now' });
    }

    return res.json({ matched: false, inQueue: true, queueSize: matchmakingQueue.length, elapsedSecs: Math.floor(elapsedMs / 1000) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 10. Direct Challenge Creation (Friend challenge with 30s accept timeout) ────────────────
router.post('/challenge/create', async (req: AuthRequest, res: Response) => {
  const challengerId = req.user!.id;
  const { targetUserId, mode } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });

  const battleMode: ArenaMode = ['EASY', 'MEDIUM', 'HARD', 'BLINDFOLD'].includes(mode) ? mode : 'MEDIUM';

  try {
    const existing = await prisma.challenge.findFirst({
      where: {
        status: { in: ['PENDING', 'ACTIVE'] },
        OR: [
          { challengerId, challengedId: targetUserId },
          { challengerId: targetUserId, challengedId: challengerId },
        ],
      },
    });
    if (existing) return res.status(409).json({ error: 'Challenge already active', challenge: existing });

    const q: any = await pickUnusedQuestion(challengerId, targetUserId, battleMode);

    const questionPayload = JSON.stringify({
      text: q.text,
      examples: q.examples,
      constraints: q.constraints,
      inputFormat: q.inputFormat,
      outputFormat: q.outputFormat,
      optimalTime: q.optimalTime || 'O(N)',
      optimalSpace: q.optimalSpace || 'O(1)',
      optimalApproach: q.optimalApproach || 'Optimal Greedy / Two Pointers Approach',
      referenceSolution: q.referenceSolution || null,
    });

    const challenge = await prisma.challenge.create({
      data: {
        challengerId,
        challengedId: targetUserId,
        questionTitle: q.title,
        questionText: questionPayload,
        questionCode: q.code,
        expectedOutput: q.expected,
        difficulty: q.difficulty,
        timeLimitSecs: 1800,
        status: 'PENDING',
      },
    });

    return res.json({ challenge });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 11. Respond to Challenge (ACCEPT or DECLINE) ─────────────────────
router.post('/challenge/respond', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { challengeId, action } = req.body; // "ACCEPT" or "DECLINE"

  try {
    const challenge = await prisma.challenge.findFirst({
      where: { id: challengeId, challengedId: userId, status: 'PENDING' },
    });
    if (!challenge) return res.status(404).json({ error: 'Pending challenge not found' });

    if (action === 'DECLINE') {
      const updated = await prisma.challenge.update({
        where: { id: challengeId },
        data: { status: 'DECLINED' },
      });
      return res.json({ challenge: updated });
    }

    // ACCEPT: mark ACTIVE, start timer
    const updated = await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });

    return res.json({ challenge: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 12. Abort Active Challenge (−10 pts penalty) ─────────────────────
router.post('/challenge/abort', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { challengeId } = req.body;

  try {
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: challengeId,
        status: 'ACTIVE',
        OR: [{ challengerId: userId }, { challengedId: userId }],
      },
    });
    if (!challenge) return res.status(404).json({ error: 'Active challenge not found' });

    const opponentId = challenge.challengerId === userId ? challenge.challengedId : challenge.challengerId;

    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        status: 'ABORTED',
        endedAt: new Date(),
        winnerId: opponentId,
      },
    });

    // Apply points: −10 for aborter, +10 for opponent
    const [userProfile, oppProfile] = await Promise.all([
      getOrCreateProfile(userId),
      getOrCreateProfile(opponentId),
    ]);

    const newUserPoints = Math.max(0, userProfile.points - 10);
    const newOppPoints = oppProfile.points + 10;

    await Promise.all([
      prisma.studentProfile.update({
        where: { userId },
        data: { points: newUserPoints, totalLosses: { increment: 1 }, totalChallenges: { increment: 1 } },
      }),
      prisma.studentProfile.update({
        where: { userId: opponentId },
        data: { points: newOppPoints, totalWins: { increment: 1 }, totalChallenges: { increment: 1 } },
      }),
    ]);

    return res.json({ success: true, newPoints: newUserPoints });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 13. Poll Active Challenge ────────────────────────────────────────
router.get('/challenge/active', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000);
    // Expire old pending friend challenges (> 30s)
    await prisma.challenge.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: thirtySecsAgo },
      },
      data: { status: 'EXPIRED' },
    });

    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const challenge = await prisma.challenge.findFirst({
      where: {
        OR: [
          { status: { in: ['PENDING', 'ACTIVE'] }, challengerId: userId },
          { status: { in: ['PENDING', 'ACTIVE'] }, challengedId: userId },
          { status: { in: ['COMPLETED', 'ABORTED'] }, challengerId: userId, endedAt: { gte: fifteenMinsAgo } },
          { status: { in: ['COMPLETED', 'ABORTED'] }, challengedId: userId, endedAt: { gte: fifteenMinsAgo } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) return res.json({ challenge: null });

    // Auto-expire if time limit exceeded
    if (challenge.status === 'ACTIVE' && challenge.startedAt) {
      const elapsed = (Date.now() - new Date(challenge.startedAt).getTime()) / 1000;
      if (elapsed > challenge.timeLimitSecs) {
        await prisma.challenge.update({
          where: { id: challenge.id },
          data: { status: 'COMPLETED', endedAt: new Date() },
        });
        return res.json({ challenge: { ...challenge, status: 'COMPLETED' } });
      }
    }

    const [challengerUser, challengedUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: challenge.challengerId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: challenge.challengedId }, select: { name: true } }),
    ]);

    // Parse rich problem data (Statement, Examples, Constraints)
    let fullText = challenge.questionText;
    let examplesJson: string | null = null;
    let constraintsJson: string | null = null;

    try {
      const parsed = JSON.parse(challenge.questionText);
      if (parsed && typeof parsed === 'object') {
        fullText = parsed.text || fullText;
        examplesJson = typeof parsed.examples === 'string' ? parsed.examples : JSON.stringify(parsed.examples || []);
        constraintsJson = typeof parsed.constraints === 'string' ? parsed.constraints : JSON.stringify(parsed.constraints || []);
      }
    } catch {
      // Plain text fallback — dynamically enrich from catalogs
      const cleanTitle = challenge.questionTitle.replace(/^\[(LeetCode|Codeforces|CP)[^\]]*\]\s*/i, '').replace(/^#\S+\s*·\s*/, '').trim();
      const slug = titleToSlug(cleanTitle);
      const isCP = challenge.questionTitle.toLowerCase().includes('codeforces') || challenge.questionTitle.toLowerCase().includes('[cp');
      const enriched = isCP
        ? enrichCPProblem({ title: cleanTitle, titleSlug: slug })
        : enrichProblem({ title: cleanTitle, titleSlug: slug });
      fullText = enriched.text || fullText;
      examplesJson = enriched.examples;
      constraintsJson = enriched.constraints;
    }

    if (!examplesJson || examplesJson === '[]') {
      const cleanTitle = challenge.questionTitle.replace(/^\[(LeetCode|Codeforces|CP)[^\]]*\]\s*/i, '').replace(/^#\S+\s*·\s*/, '').trim();
      const slug = titleToSlug(cleanTitle);
      const isCP = challenge.questionTitle.toLowerCase().includes('codeforces') || challenge.questionTitle.toLowerCase().includes('[cp');
      const enriched = isCP
        ? enrichCPProblem({ title: cleanTitle, titleSlug: slug })
        : enrichProblem({ title: cleanTitle, titleSlug: slug });
      examplesJson = enriched.examples;
      constraintsJson = enriched.constraints;
    }

    const isChallenger = challenge.challengerId === userId;

    const opponentHasSubmitted = isChallenger
      ? challenge.challengedScore !== null
      : challenge.challengerScore !== null;

    const opponentScore = isChallenger
      ? challenge.challengedScore
      : challenge.challengerScore;

    const iHaveSubmitted = isChallenger
      ? challenge.challengerScore !== null
      : challenge.challengedScore !== null;

    const myScore = isChallenger
      ? challenge.challengerScore
      : challenge.challengedScore;

    // Remaining seconds for PENDING challenge accept timer
    const createdAtMs = new Date(challenge.createdAt).getTime();
    const elapsedSecs = Math.floor((Date.now() - createdAtMs) / 1000);
    const pendingTimerRemaining = Math.max(0, 30 - elapsedSecs);

    return res.json({
      challenge: {
        ...challenge,
        questionText: fullText,
        examples: examplesJson,
        constraints: constraintsJson,
        challengerName: challengerUser?.name || 'Unknown',
        challengedName: challengedUser?.name || 'Unknown',
        isChallenger,
        opponentHasSubmitted,
        opponentScore,
        iHaveSubmitted,
        myScore,
        pendingTimerRemaining,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 14. Submit Solution & Language-Aware AI Evaluation ──────────────
router.post('/challenge/submit', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { challengeId, code, language, isCheating } = req.body;

  try {
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: challengeId,
        status: 'ACTIVE',
        OR: [{ challengerId: userId }, { challengedId: userId }],
      },
    });
    if (!challenge) return res.status(404).json({ error: 'Active challenge not found' });

    const isChallenger = challenge.challengerId === userId;
    const langName = language || 'cpp';

    let aiEval: any = {
      score: isCheating ? 0 : 75,
      feedback: isCheating ? 'Cheating detected: Tab switched or copy-pasted. Score set to 0.' : `Code evaluated for ${langName}.`,
      strengths: isCheating ? 'None — integrity violation.' : `Valid ${langName} syntax and logic structures.`,
      weaknesses: isCheating ? 'Cheating violation.' : 'Consider adding explicit null/boundary input validations.',
      improvements: isCheating ? 'Maintain academic integrity.' : 'Refactor loop logic to optimize time complexity benchmark.',
    };

    if (!isCheating) {
      try {
        let rawText = challenge.questionText;
        let rawExamples = undefined;
        let rawConstraints = undefined;
        let optTime = undefined;
        let optSpace = undefined;
        let optApproach = undefined;
        let refSol = undefined;
        try {
          const parsed = JSON.parse(challenge.questionText);
          if (parsed && typeof parsed === 'object') {
            rawText = parsed.text || rawText;
            rawExamples = parsed.examples;
            rawConstraints = parsed.constraints;
            optTime = parsed.optimalTime;
            optSpace = parsed.optimalSpace;
            optApproach = parsed.optimalApproach;
            refSol = parsed.referenceSolution;
          }
        } catch {}

        const result = await evaluateAnswer({
          questionTitle: challenge.questionTitle,
          questionText: rawText,
          questionType: 'CODING',
          codeContent: code,
          language: langName,
          examples: rawExamples,
          constraints: rawConstraints,
          expectedOutput: challenge.expectedOutput || undefined,
          optimalTime: optTime,
          optimalSpace: optSpace,
          optimalApproach: optApproach,
          referenceSolution: refSol,
        });
        if (result) {
          aiEval = {
            score: result.score,
            feedback: result.feedback,
            strengths: result.strengths || aiEval.strengths,
            weaknesses: result.weaknesses || aiEval.weaknesses,
            improvements: result.improvements || aiEval.improvements,
            optimalTime: result.optimalTime || 'O(N)',
            optimalSpace: result.optimalSpace || 'O(1)',
            optimalApproach: result.optimalApproach || 'Optimal Greedy / Two Pointers Approach',
            referenceSolution: result.referenceSolution || null,
            testCaseResults: result.testCaseResults || [],
            comparisonSummary: result.comparisonSummary || null,
          };
        }
      } catch (e) {
        aiEval.score = 0;
        aiEval.feedback = 'Evaluation failed due to runtime error.';
      }
    }

    const updateData: any = isChallenger
      ? { challengerCode: code, challengerScore: aiEval.score, challengerLang: langName }
      : { challengedCode: code, challengedScore: aiEval.score, challengedLang: langName };

    await prisma.challenge.update({ where: { id: challengeId }, data: updateData });

    if (aiEval.score >= 70) {
      try {
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'ARENA_CHALLENGE',
            details: JSON.stringify({
              problemId: `arena-${challengeId}`,
              questionTitle: challenge.questionTitle,
              platform: '1v1 Arena',
              difficulty: challenge.difficulty || 'MEDIUM',
              score: aiEval.score,
              passed: true,
              isAccepted: true,
            }),
          },
        });
      } catch (logErr) {
        console.error('Failed to log arena audit submission', logErr);
      }
    }

    const refetch = await prisma.challenge.findUnique({ where: { id: challengeId } });

    let matchCompleted = false;
    let winnerId: string | null = null;
    let winnerPoints = 0;

    if (refetch && refetch.challengerScore !== null && refetch.challengedScore !== null) {
      matchCompleted = true;
      winnerId =
        refetch.challengerScore > refetch.challengedScore
          ? refetch.challengerId
          : refetch.challengedScore > refetch.challengerScore
          ? refetch.challengedId
          : null;

      await prisma.challenge.update({
        where: { id: challengeId },
        data: { status: 'COMPLETED', endedAt: new Date(), winnerId },
      });

      const diffScore = Math.abs(refetch.challengerScore - refetch.challengedScore);
      winnerPoints = Math.max(25, diffScore);

      if (winnerId) {
        const loserId = winnerId === refetch.challengerId ? refetch.challengedId : refetch.challengerId;
        const [winProf, loseProf] = await Promise.all([
          getOrCreateProfile(winnerId),
          getOrCreateProfile(loserId),
        ]);
        await Promise.all([
          prisma.studentProfile.update({
            where: { userId: winnerId },
            data: { points: winProf.points + winnerPoints, totalWins: { increment: 1 }, totalChallenges: { increment: 1 } },
          }),
          prisma.studentProfile.update({
            where: { userId: loserId },
            data: { points: loseProf.points + 5, totalLosses: { increment: 1 }, totalChallenges: { increment: 1 } },
          }),
        ]);
      } else {
        await Promise.all([refetch.challengerId, refetch.challengedId].map(async uid => {
          const prof = await getOrCreateProfile(uid);
          await prisma.studentProfile.update({
            where: { userId: uid },
            data: { points: prof.points + 15, totalChallenges: { increment: 1 } },
          });
        }));
        winnerPoints = 15;
      }
    }

    return res.json({
      success: true,
      eval: aiEval,
      score: aiEval.score,
      matchCompleted,
      challenge: refetch,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── 15. Challenge Result ─────────────────────────────────────────────
router.get('/challenge/result/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  try {
    const challenge = await prisma.challenge.findUnique({ where: { id } });
    if (!challenge) return res.status(404).json({ error: 'Not found' });

    const [challenger, challenged] = await Promise.all([
      prisma.user.findUnique({ where: { id: challenge.challengerId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: challenge.challengedId }, select: { name: true } }),
    ]);

    const pointDiff = Math.abs((challenge.challengerScore || 0) - (challenge.challengedScore || 0));

    const myCode = challenge.challengerId === userId ? challenge.challengerCode : challenge.challengedCode;
    const myLang = challenge.challengerId === userId ? challenge.challengerLang : challenge.challengedLang;

    let evalObj = null;
    if (myCode) {
      try {
        let rawText = challenge.questionText;
        let rawExamples = undefined;
        let rawConstraints = undefined;
        let optTime = undefined;
        let optSpace = undefined;
        let optApproach = undefined;
        let refSol = undefined;
        try {
          const parsed = JSON.parse(challenge.questionText);
          if (parsed && typeof parsed === 'object') {
            rawText = parsed.text || rawText;
            rawExamples = parsed.examples;
            rawConstraints = parsed.constraints;
            optTime = parsed.optimalTime;
            optSpace = parsed.optimalSpace;
            optApproach = parsed.optimalApproach;
            refSol = parsed.referenceSolution;
          }
        } catch {}

        evalObj = await evaluateAnswer({
          questionTitle: challenge.questionTitle,
          questionText: rawText,
          questionType: 'CODING',
          codeContent: myCode,
          language: myLang || 'cpp',
          examples: rawExamples,
          constraints: rawConstraints,
          expectedOutput: challenge.expectedOutput || undefined,
          optimalTime: optTime,
          optimalSpace: optSpace,
          optimalApproach: optApproach,
          referenceSolution: refSol,
        });
      } catch (e) {}
    }

    return res.json({
      challenge,
      challengerName: challenger?.name || 'Unknown',
      challengedName: challenged?.name || 'Unknown',
      isWinner: challenge.winnerId === userId,
      isAborted: challenge.status === 'ABORTED',
      isDraw: challenge.winnerId === null && challenge.status === 'COMPLETED',
      earnedPoints: Math.max(25, pointDiff),
      eval: evalObj,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
