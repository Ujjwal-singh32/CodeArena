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

All pages and components are built with JavaScript, Tailwind CSS v4,
Framer Motion, Monaco Editor, and Lucide icons. The visual system and
core routes are in place, but most data remains mock-driven.

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

#### Theme (`client/app/globals.css`)

- Background: #070707, Cards: #111111, Borders: #242424, Primary: #00ff88
- Glassmorphism, neon green glow, grid background, custom scrollbars

---

### Phase 2 — Backend API: IMPLEMENTED (Auth + Problems)

The backend foundation is now in place.

- Auth routes and services exist for register, login, logout, profile fetch,
  and email verification.
- Problem listing and slug-based problem retrieval are implemented.
- Prisma schema, DB config, middleware, and API routing are wired up.
- The frontend now has a dedicated API client layer for auth and problem APIs.

Status: Mostly implemented, with some production hardening still needed.

---

### Phase 3 — Execution Engine: IMPLEMENTED (sandbox-ready)

The execution layer is implemented and supports both local execution and
Docker-backed sandbox execution.

- The sandbox service handles JS, Python, C, C++, and Java code.
- It returns judge-style statuses such as ACCEPTED, WRONG_ANSWER,
  COMPILATION_ERROR, RUNTIME_ERROR, and TIME_LIMIT_EXCEEDED.
- Docker-based execution is wired through the environment configuration and
  is ready for further hardening.

Status: Core engine implemented.

---

### Phase 4 — Practice Submission Pipeline: IMPLEMENTED (backend flow)

The practice submission workflow is now operational end-to-end at the backend level.

- Submissions can be created and processed through the execution pipeline.
- BullMQ-style job queueing and worker registration are implemented with
  inline fallback support when Redis is unavailable.
- Verdicts are persisted to the database and published as events.
- Socket.IO-style notification hooks are registered for submission verdicts
  and AI review readiness.

Status: Backend pipeline implemented; frontend wiring still needs polish.

---

### Phase 5 — 1v1 Duel: IMPLEMENTED (core backend flow)

The duel system is implemented at the backend service level.

- Match creation, joining, config submission, lock/start, and finish logic exist.
- Match participants, ELO rating updates, chat messages, and duel result email
  jobs are wired.
- AI-based duel problem selection is integrated into the match start flow.

Status: Core duel backend is implemented.

---

### Phase 6 — Collaborative Editor: IMPLEMENTED (room-based backend)

The collaborative editor feature has its backend foundation implemented.

- Room creation, joining, room lookup, and member management are implemented.
- The app is set up for room-based collaborative coding sessions.
- Full real-time CRDT/Yjs sync is not yet integrated, so this remains a
  strong backend foundation rather than a fully production-grade live sync system.

Status: Room backend implemented; real-time sync still pending.

---

### Phase 7 — AI Integration: IMPLEMENTED (assistant + review + duel selection)

AI integration is now present in multiple parts of the system.

- AI assistant routes support hints, syntax help, and doubt answering.
- Accepted submissions can trigger AI review generation.
- The duel flow uses AI to choose a suitable problem based on the shared config.
- If no API key is configured, the system falls back to mock responses.

Status: Implemented and wired; production-quality AI behavior depends on
runtime API configuration and tuning.

---

### Overall project state

- Phases 1 through 7 now have substantial implementation coverage.
- The project has moved beyond a purely mock UI stage into a real backend-driven
  application foundation.
- Remaining work is mainly UI integration, real-time production hardening,
  and deployment readiness.

---

> Update this section after every work session so the next AI chat
> knows exactly where the project stands.

---

# CODEARENA — FULL SYSTEM CONTEXT (MASTER FILE)

> Paste this entire file at the start of any new AI chat so it instantly understands the full project.

---

## 1. PROJECT OVERVIEW

CodeArena is a full-stack competitive programming platform — practice DSA, 1v1 duels, collaborative editor, AI assistance, and a custom judge pipeline (stdin/stdout, Codeforces-style).

**Priority features:** Practice → 1v1 Duel → Collab Editor. Contests are optional.

---

## 2. ARCHITECTURE

```
Frontend (client/)     → Next.js + JavaScript + Tailwind + Monaco + Socket.IO
Admin UI (admin/)      → Separate Express server + static upload UI (port 5001)
Backend (server/)      → Express + Prisma + PostgreSQL (Neon)
Redis                  → ioredis (BullMQ queues, cache, rate limiting)
Kafka                  → Event streaming (submission.completed, duel.ended)
Execution              → Custom sandbox (local spawn or Docker)
AI                     → Cohere API (command-a-plus-05-2026)
Auth                   → JWT in httpOnly cookies + email verification required
```

---

## 3. CODE EXECUTION (JUDGE)

- **Run** (`POST /api/v1/submissions/run`) — tests against **sample** test cases only, compares stdout to `expectedOutput`
- **Submit** (`POST /api/v1/submissions`) — runs **all** test cases (sample + hidden) via BullMQ worker
- Languages: JavaScript, Python, C, C++, Java
- Input/output: **stdin/stdout** format (not LeetCode function style)
- Local mode: `EXECUTION_ENABLED=false` (default) — runs on host via `child_process`
- Docker mode: `EXECUTION_ENABLED=true` — compiles + runs inside `codearena-sandbox:latest`

**Docker sandbox build:**
```bash
cd server/docker/sandbox
docker build -t codearena-sandbox:latest .
```

---

## 4. AUTH & EMAIL VERIFICATION

- Register → verification email sent → user must verify before login
- Unverified users get **403** on login and on run/submit endpoints
- Verify link: `{CLIENT_URL}/verify-email?token=...`
- Frontend auth: `AuthContext` + httpOnly cookies; Navbar shows **Logout** when logged in

---

## 5. ADMIN — PROBLEM UPLOAD

Separate admin app at `admin/` (port **5001**).

**Configure:**
- Main server `.env`: `ADMIN_API_KEY=your-secret`
- Admin `.env`: copy from `admin/.env.example`, same `ADMIN_API_KEY`

**Run admin:**
```bash
npm run dev:admin
# or
npm run dev:all   # client + server + admin
```

**Upload UI:** http://localhost:5001  
**Template:** `admin/templates/problem-template.json`

**API:** `POST /api/v1/admin/problems` with header `X-Admin-Key: {ADMIN_API_KEY}`

**Required JSON fields:**
```json
{
  "title", "slug", "statement", "inputFormat", "outputFormat", "constraints",
  "difficulty": "EASY|MEDIUM|HARD",
  "testCases": [{ "input", "expectedOutput", "isSample" }],
  "examples", "tags", "categories", "boilerplates", "timeLimit", "memoryLimit", "isPublished"
}
```

---

## 6. COHERE AI

```env
COHERE_API_KEY=your-key
COHERE_API_URL=https://api.cohere.ai/v2/chat
COHERE_MODEL=command-a-plus-05-2026
```

Used for: in-editor hints/syntax/doubt, post-submission AI review, duel problem selection.

---

## 7. REDIS (ioredis)

- Package: `ioredis` (not `redis` npm package)
- Config: `server/src/config/redis.js`
- BullMQ uses dedicated ioredis connection in `server/src/queues/index.js`
- Fallback: inline job processing when Redis unavailable

---

## 8. FRONTEND PAGES (real API data)

| Route | Data source |
|-------|-------------|
| `/` | `GET /users/stats` |
| `/practice` | `GET /problems` |
| `/practice/[slug]` | `GET /problems/:slug`, run/submit APIs |
| `/dashboard` | `GET /users/dashboard` |
| `/profile` | `GET /users/profile` |
| `/login`, `/register`, `/verify-email` | Auth APIs |
| `/duel`, `/collab` | Duel/Collab APIs + user context |
| `/contest` | Placeholder (optional feature) |

**No mock data** in production pages — `client/lib/mockData.js` is legacy/unused.

---

## 9. HOW TO RUN (FULL SETUP)

### Prerequisites
- Node.js 20+
- PostgreSQL (Neon) — `DATABASE_URL`
- Redis running locally or remote — `REDIS_URL`
- (Optional) Kafka — `KAFKA_ENABLED=true`
- (Optional) Docker for sandbox execution
- Cohere API key, SMTP for email, Admin API key

### 1. Clone & install
```bash
npm install
cd admin && npm install && cd ..
```

### 2. Environment
```bash
cp .env.example .env
# Fill in: DATABASE_URL, JWT_SECRET, REDIS_URL, COHERE_API_KEY, SMTP_*, ADMIN_API_KEY

cp admin/.env.example admin/.env
# Set ADMIN_API_KEY to match main .env
```

### 3. Database
```bash
cd server
npx prisma migrate deploy
npx prisma db seed
```

### 4. (Optional) Docker sandbox
```bash
cd server/docker/sandbox
docker build -t codearena-sandbox:latest .
# Then set EXECUTION_ENABLED=true in .env
```

### 5. Start development
```bash
# From project root — client (3000) + server (5000)
npm run dev

# With admin panel (5001)
npm run dev:all
```

### 6. URLs
| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:5000/api/v1 |
| Health | http://localhost:5000/health |
| Admin upload | http://localhost:5001 |

### 7. Demo account (after seed)
- Email: `demo@codearena.dev`
- Password: `password123`
- Problem: `/practice/two-sum`

---

## 10. CURRENT STATUS (July 2026)

### Completed
- Auth with email verification gate on login + run/submit
- ioredis for cache, rate limit, BullMQ
- Admin panel for problem upload with JSON template
- Frontend wired to real APIs (no dummy data on core pages)
- AuthContext — Navbar/Profile show logout when logged in
- Users API: dashboard, profile, leaderboard, platform stats

### Optional / partial
- Contest feature (UI placeholder only)
- Duel room full Socket.IO sync (backend exists, room UI basic)
- Yjs collab editor (partial)
- Docker sandbox deployment on VPS

---

## 11. RULES FOR AI CODERS

- JavaScript only (no TypeScript)
- Modular: controller → service → routes → validator
- stdin/stdout problems only — document inputFormat/outputFormat clearly
- No dummy/mock data in user-facing pages
- Email must be verified before judge access
- Use ioredis, not `redis` package

---

> Update this section after every work session.
