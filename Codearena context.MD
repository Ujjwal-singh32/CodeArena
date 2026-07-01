# CODEARENA — FULL SYSTEM CONTEXT (MASTER FILE)

> Paste this entire file at the start of any new AI chat (Claude, GPT, Cursor, etc.)
> so it instantly understands the full project without re-explaining anything.

---

## 1. PROJECT OVERVIEW

CodeArena is a full-stack, production-grade competitive programming and
coding practice platform — inspired by LeetCode, Codeforces, HackerRank,
and the VS Code editor experience.

This is NOT a tutorial project. It is built with real system design
concepts (queues, caching, event streaming, sandboxed execution,
real-time communication) to demonstrate backend engineering depth.

Core user value:
- Practice DSA problems with AI assistance
- Compete 1v1 against another live user
- Code together in real time with friends (collaborative editor)
- Track personal progress, ratings, and submission history

Contest/admin-hosted-contest features are OPTIONAL and deprioritized.
Main goal is NOT building a contest platform — it's practice + 1v1 duel
+ collaborative coding.
---

## 2. THE THREE CORE FEATURES (PRIORITY ORDER)

### Feature 1 — Practice Section (Build First)
- Browse problems, filter by difficulty/tags
- Select a problem → Monaco Editor opens
- AI assistant available inside editor for doubts/syntax help
- Click Run → quick test against sample input
- Click Submit → full judge pipeline runs (see Section 5)
- After verdict, AI automatically reviews the code:
  time complexity, space complexity, unnecessary logic,
  optimization suggestions
- Submission history saved per user

### Feature 2 — 1v1 Coding Duel (Build Second)
- User clicks "Find Opponent" → joins matchmaking queue
- Matched automatically with another searching user → pushed into a
  private room
- Real-time chat in the room (Socket.IO)
- Both players fill a shared, editable form: topic, difficulty,
  number of questions, time limit
- On mutual submit, AI selects a suitable question from the DB based
  on both players' preferences (limited AI features here vs practice
  mode, since it's competitive)
- Timer starts simultaneously for both
- Both code in their own Monaco Editor, same problem, same timer
- First player with a fully correct submission wins
- Timer stops for both instantly on a win
- Result email sent to both players (win/lose + points changed)
- ELO-style rating system updates both players
- Match saved to profile history

### Feature 3 — Collaborative Live Editor (Build Third / Optional polish)
- User creates a room, shares room code
- Up to 4-5 friends join with the code
- Everyone edits the same file simultaneously, like Google Docs
- All cursors visible in real time
- No judge/submission flow here — pure pair/team programming
- Powered by CRDT (Yjs) over Socket.IO, no Docker/queue involvement

### Contest Feature (Optional, Low Priority, Build Last If At All)
- Admin creates a contest: name, problems, topics, time window
- Users join, compete, live leaderboard via Socket.IO
- Final ranking saved after contest ends
- Same submission pipeline as Practice, but also emits leaderboard
  update events

---

## 3. HIGH-LEVEL ARCHITECTURE

```
Frontend (Client)
→ Next Js + JavaScript (NO TypeScript)
→ Tailwind CSS + Framer Motion
→ Monaco Editor
→ Socket.IO client

Backend (Server)
→ Node.js + Express (JavaScript, NOT TypeScript)
→ PostgreSQL (hosted on Neon) + Prisma ORM
→ JWT Auth (access + refresh tokens, HTTP-only cookies)
→ Redis (cache + BullMQ queues + rate limiting)
→ Socket.IO (real-time: verdicts, duels, contests, collab editor)
→ Kafka (event streaming across services — analytics, notifications)

Execution Engine (MOST IMPORTANT — CUSTOM, NOT JUDGE0)
→ Custom Docker-based sandbox system, fully self-built
→ Isolated containers, no network, CPU/memory/time limited
→ Will swap to Judge0/Piston ONLY if self-hosted Docker causes
  deployment problems — current plan is to build it ourselves
```

---

## 4. WHY EACH TECHNOLOGY EXISTS

**PostgreSQL (via Neon) + Prisma** — main database. Neon's free tier
never pauses on inactivity (unlike Supabase), serverless, and branches
instantly for testing. Prisma gives type-safe queries, migrations, and
a single source of truth for the schema (see Section 8). Relational
structure fits this project well — submissions, matches, rooms, and
users all have strict foreign-key relationships that benefit from real
joins and referential integrity (e.g. cascade deletes on room/match
cleanup).

**Redis** — four jobs:
1. Backs the BullMQ job queue
2. Caches problem lists / user profiles (avoid hitting PostgreSQL
   repeatedly)
3. Stores live contest/duel leaderboard as a sorted structure
4. Rate limiting counters + refresh token storage

**BullMQ** — background job runner. Used for:
- Code execution jobs (core judge pipeline)
- AI code review jobs (after a verdict is ready)
- Email jobs (1v1 duel results)
Rule of thumb: anything taking more than ~200ms goes into BullMQ.

**Kafka** — event bus. One event, multiple independent listeners.
Example: `submission.completed` event is consumed separately by
Analytics Service, Notification Service, and AI Review trigger —
fully decoupled, one service failing doesn't break the others.

**Docker (custom execution engine)** — runs untrusted user code in an
isolated container: no internet access, CPU limit, memory limit, time
limit, auto-destroyed immediately after execution. This is being
hand-built rather than using Judge0, to show real sandboxing system
design on the resume. Judge0/Piston is the fallback plan only if
deployment of the custom engine becomes too difficult.

**Socket.IO** — real-time layer for: submission verdict push, 1v1 duel
room (chat + sync + timer), collaborative editor sync, live leaderboard.

**JWT + Refresh Tokens** — access token short-lived, refresh token
long-lived, both stored in HTTP-only cookies, validated via middleware
on every protected request.

**Yjs (CRDT)** — conflict-free real-time collaborative text editing for
the Live Editor feature.

**AI Integration** — three use cases: in-editor {1 : give hints  , 2 : fix the syntax , 3: doubts or genral query},
post-submission code review, question selection for 1v1 duels.
---

## 5. CODE EXECUTION FLOW (CRITICAL — CORE OF THE APP)

```
Step 1 — Frontend sends code to backend
POST /api/v1/execute
Payload: { code, language, input, problemId }

Step 2 — Backend pushes job to BullMQ queue (Execution Service)

Step 3 — Execution Worker processes the job:
  1. Create a fresh Docker container
  2. Inject user code into the container
  3. Compile code if needed (C++/Java)
  4. Run with: CPU limit, memory limit, time limit, no network access
  5. Capture stdout/stderr
  6. Destroy the container immediately after execution

Step 4 — Worker returns result:
  output, runtime, memory usage, status
  (Accepted / Wrong Answer / TLE / Runtime Error / Compile Error)

Step 5 — Backend stores submission in Neon Db:
  userId, problemId, code, result, runtime, memory, timestamp

Step 6 — Kafka event "submission.completed" published

Step 7 — Kafka consumers react independently:
  - Notification Service → Socket.IO push of verdict to user's screen
  - Analytics Service → updates solved count, topic progress, heatmap
  - AI Review trigger → adds a new BullMQ job for AI code review

Step 8 — AI Review Worker:
  calls AI API with the code → gets complexity + suggestions →
  saves to NeonDB → Socket.IO pushes "AI review ready" to frontend
```

---

## 6. 1v1 DUEL FLOW

```
User clicks "Find Opponent"
→ Added to a Redis-backed matchmaking queue
→ Server matches two waiting users → creates a Match row (status: WAITING)
  with an associated MatchConfig and two MatchParticipant rows
  (ratingBefore captured from each user's current rating)
→ Both pushed into the room (Socket.IO)

Inside the room:
→ Real-time chat (Socket.IO, persisted as ChatMessage rows tied to matchId)
→ Shared editable MatchConfig (topic, difficulty, questionCount, duration)
→ On mutual submit → isLocked flips true on MatchConfig, AI selects a
  question from DB matching prefs → MatchConfig.problemId set
→ Match.status moves to RUNNING, Match.startedAt set, timer starts for
  both simultaneously

Both code independently in Monaco Editor on the same problem
→ Submission goes through the same execution pipeline (Section 5),
  each Submission row links back via matchId
→ First fully Accepted submission ends the match for both:
  Match.status → FINISHED, Match.endedAt set, Match.winnerId set
→ Kafka event "duel.ended" published
→ Consumers: Rating Service (updates MatchParticipant.ratingAfter via
  ELO calc + User.rating), Email Service (BullMQ job), Profile Service
  (match already in history via MatchParticipant relation — no extra
  write needed beyond the rating update)
```

---

## 7. BACKEND MODULE STRUCTURE

```
server/src/
├── auth/              ← register/login, JWT, refresh/verification tokens
├── users/              ← User + UserProfile
├── problems/            ← Problem, ProblemExample, TestCase,
│                          BoilerplateCode, Category, Tag
├── submissions/          ← Submission + AIReview trigger
├── execution/             ← Docker sandbox engine
├── duel/                   ← Match, MatchConfig, MatchParticipant,
│                             ChatMessage, matchmaking queue
├── collab/                  ← Room, RoomMember (live editor, Yjs sync)
├── contests/                 ← optional / lower priority
├── leaderboard/
├── ai/                         ← doubt assistant, code review, question pick
└── notifications/               ← Notification model, Socket.IO push

Each module follows:
controller → service → routes → model/prisma-query → validator
```

---

## 8. DATABASE DESIGN (PostgreSQL via Neon + Prisma)

Full schema lives in `schema.prisma`. Summary of models and relations:

```
User
  username, email, passwordHash, emailVerified, rating (default 1500),
  solvedCount
  → has one UserProfile
  → has many RefreshToken, VerificationToken
  → has many Submission, Notification, ChatMessage
  → has many MatchParticipant, RoomMember (membership join tables)
  → owns many Room (as owner)
  → can be winner of many Match (relation "Winner")

UserProfile
  bio, avatar, github, linkedin, leetcode, codeforces, codechef
  → belongs to one User (1:1, cascade delete)

RefreshToken / VerificationToken
  token, expiresAt, revoked (refresh only)
  → belongs to User (cascade delete)

Problem
  title, slug, statement, inputFormat, outputFormat, constraints,
  difficulty (EASY/MEDIUM/HARD), isPublished, timeLimit (sec),
  memoryLimit (MB), submissionCount, acceptedCount
  → has many ProblemExample, TestCase, BoilerplateCode
  → many-to-many Category (via ProblemCategory), Tag (via ProblemTag)
  → has many Submission, MatchConfig, Room (optional problem on room)

ProblemExample        — sample input/output/explanation, ordered
TestCase               — input/expectedOutput, isSample flag (hidden vs visible)
BoilerplateCode        — starter code per language, unique per (problem, language)
Category / ProblemCategory   — many-to-many join, problem tagging by category
Tag / ProblemTag             — many-to-many join, problem tagging by tag

Submission
  language (enum: CPP/C/JAVA/PYTHON/JAVASCRIPT/TYPESCRIPT), code,
  status (PENDING/ACCEPTED/WRONG_ANSWER/COMPILATION_ERROR/
  RUNTIME_ERROR/TIME_LIMIT_EXCEEDED/MEMORY_LIMIT_EXCEEDED),
  runtime (ms), memory (MB), compileOutput, stdout, stderr,
  passedTestCases, totalTestCases
  → belongs to User, Problem, optionally a Match
  → has one optional AIReview (1:1)

AIReview
  feedback, timeComplexity, spaceComplexity, betterApproach,
  unnecessaryCode, optimizationTips
  → belongs to one Submission (1:1, cascade delete)

Notification
  title, message, type (SUBMISSION/MATCH/SYSTEM/AI_REVIEW), isRead
  → belongs to User (cascade delete)

Match                              ← powers the 1v1 Duel feature
  status (WAITING/RUNNING/FINISHED/CANCELLED), startedAt, endedAt,
  winnerId
  → has one MatchConfig (1:1)
  → has many MatchParticipant, Submission, ChatMessage
  → optional winner relation to User

MatchConfig                        ← the shared, editable duel-setup form
  difficulty, duration, questionCount, topic, isLocked
  → belongs to one Match (1:1, cascade delete)
  → optionally points to a chosen Problem (AI-selected)

MatchParticipant                   ← join table, one row per player per match
  score, ratingBefore, ratingAfter
  → belongs to User and Match
  → unique on (matchId, userId) — a user can only join a match once

ChatMessage                        ← duel room chat
  message, createdAt
  → belongs to sender (User) and Match (cascade delete)

Room                                ← powers the Collaborative Live Editor
  roomCode (unique), title, language, isPrivate, maxMembers (default 5)
  → belongs to owner (User)
  → optionally linked to a Problem (if coding on a specific problem)
  → has many RoomMember

RoomMember                          ← join table, one row per user per room
  joinedAt, isOnline, role (OWNER/MEMBER)
  → belongs to Room (cascade delete) and User (cascade delete)
  → unique on (roomId, userId)
```

Key design notes:
- `Match` + `MatchConfig` + `MatchParticipant` together model the full
  1v1 duel lifecycle described in Section 6 — the shared editable form
  maps directly to `MatchConfig`, and `isLocked` flips true once both
  players submit it.
- `Room` + `RoomMember` model the Collaborative Live Editor (Section 2,
  Feature 3) — `roomCode` is what gets shared to invite the 4-5 friends,
  `role` distinguishes the owner from members.
- `AIReview` is intentionally a separate 1:1 model off `Submission`
  rather than columns on `Submission` itself, keeping the judge result
  and the AI analysis cleanly decoupled (judge writes first, AI worker
  writes second, asynchronously).
- All cascade deletes are set so deleting a `User`, `Problem`, `Match`,
  or `Room` cleans up its dependent rows automatically.

---

## 9. FRONTEND PAGES & LAYOUT

```
Pages:
- Home (marketing + stats)
- Problems (list + filters)
- Problem Page (editor + description)
- Duel Lobby / Duel Room
- Collaborative Room
- Contest Page (optional)
- Dashboard
- Profile
- Login / Register

Problem Page Layout:
LEFT  → problem statement, examples, constraints
RIGHT → Monaco Editor, Run/Submit buttons, output console
```

---

## 10. UI STYLE SYSTEM

```
Theme:
  Background : #070707
  Primary    : #00ff88
  Cards      : #111111
  Borders    : #242424
  Style      : Glassmorphism + neon green glow

Animations:
  Framer Motion — hover glow, smooth transitions
```
---

## 11. DEVELOPMENT PHASES

```
Phase 1 — Frontend UI (React + Tailwind)
Phase 2 — Backend API (Auth + Problems)
Phase 3 — Execution Engine (custom Docker sandbox)
Phase 4 — Practice submission pipeline end-to-end
            (BullMQ + Kafka + Socket.IO verdict push)
Phase 5 — 1v1 Duel (matchmaking + rooms + rating)
Phase 6 — Collaborative Editor (Yjs)
Phase 7 — AI integration (doubts, review, duel question pick)
Phase 8 — Contests + Leaderboard (optional, only if time allows)
Phase 9 — Deployment (Docker + NGINX, or managed hosting — see below)
```
---

## 12. DEPLOYMENT PLAN

```
Frontend  → Vercel (free, auto-deploy from GitHub)
Backend   → Railway (Express API + BullMQ Worker)
Database  → Neon (PostgreSQL, free tier, never pauses on inactivity)
Redis     → Railway addon or Upstash Redis (free)
Kafka     → Upstash Kafka (free serverless tier)
Execution → Self-hosted custom Docker engine on a small VPS
            (DigitalOcean droplet) once the rest is stable.
            Fallback only if deployment proves too hard:
            Judge0 (hosted) or Piston API (free, no setup).
```

---

## 13. RULES FOR ANY AI CODER WORKING ON THIS PROJECT

- Use JavaScript only — NO TypeScript (backend confirmed JS; Prisma's
  PascalCase enums are just Prisma convention, not a TS signal)
- Use modular architecture — never write monolithic files
- Always separate controller / service / routes / model / validator
- Always assume production-level scale, not tutorial-level
- Avoid dummy/placeholder logic — write real, working code
- Prioritize security, especially in the execution engine
- Follow REST API standards
- Keep frontend reusable and component-based
- Do not re-explain the architecture each time — I already understand it
- Build one feature fully end-to-end before starting the next
- If I am wrong about something in my request, correct me directly

---

## 14. CURRENT STATUS

### Phase 1 — Frontend UI: COMPLETE (UI-only, mock data)

All pages and components built with JavaScript, Tailwind CSS v4,
Framer Motion, Monaco Editor, and Lucide icons. Theme: black (#070707)
background with neon green (#00ff88) accents — HackerRank-style.

#### Pages built (`client/app/`)

| Route | Page | Status |
|-------|------|--------|
| `/` | Home — hero, stats, features, CTA | Done |
| `/practice` | Problems list with search, filters, sort | Done |
| `/practice/[slug]` | Problem page — statement left, Monaco editor right, Run/Submit, output console, AI panel | Done |
| `/duel` | 1v1 Duel lobby — Find Opponent, matchmaking UI, rating sidebar | Done |
| `/duel/room/[id]` | Duel room — shared config form, chat, timer, editor | Done |
| `/collab` | Collab — create/join room flow | Done |
| `/collab/[code]` | Collab room — multi-user editor, member list | Done |
| `/contest` | Contests list (optional feature, UI ready) | Done |
| `/dashboard` | Dashboard — stats, heatmap, submissions, topic progress | Done |
| `/profile` | Profile — user info, submission history, duel history, leaderboard | Done |
| `/login` | Login form | Done |
| `/register` | Register form | Done |

#### Components built (`client/components/`)

```
layout/   → Navbar.js, Footer.js
ui/       → Button.js, Card.js, Badge.js, Input.js, Select.js, Tabs.js
editor/   → CodeEditor.js (Monaco), OutputConsole.js, AIPanel.js
common/   → StatCard.js, ProblemRow.js
```

#### Utilities & mock data (`client/lib/`)

- `utils.js` — cn(), formatDifficulty(), formatRating(), formatDate(), formatTime()
- `mockData.js` — problems, problemDetail, currentUser, submissions, duels, contests, etc.

#### Theme (`client/app/globals.css`)

- Background: #070707, Cards: #111111, Borders: #242424, Primary: #00ff88
- Glassmorphism, neon green glow, grid background, custom scrollbars

#### Not yet connected (next phases)

- No backend API calls — all data is mock/static
- No real auth, Socket.IO, Yjs, or judge pipeline
- Monaco editor is UI-only (Run/Submit simulate with setTimeout)
- AI panel uses mock responses

#### How to run

```bash
cd client
npm install
npm run dev
```

#### Packages installed (client)

```
@monaco-editor/react, monaco-editor, framer-motion, lucide-react
```

(next, react, react-dom, tailwindcss already present)

---

> Update this section after every work session so the next AI chat
> knows exactly where the project stands.

---

## END OF CONTEXT

