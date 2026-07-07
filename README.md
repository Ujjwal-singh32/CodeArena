<div align="center">

# ⚔️ CodeArena
### Architectural Master Blueprint

**A real-time, distributed-systems-grade competitive programming platform**

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-FF4081?style=for-the-badge&logo=redis&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Judge0-EC2%20Sandbox-orange?style=for-the-badge&logo=amazonaws&logoColor=white)

</div>

<br>

> CodeArena solves the hard problems of real-time software: **race conditions**, **distributed locking**, **state synchronization**, **cache invalidation**, and **asynchronous job orchestration** — all wired into one cohesive coding platform.

---

## 🧭 Quick Navigation

| # | Section | What you'll learn |
|:-:|---|---|
| 1 | [System Architecture Overview](#1--system-architecture-overview) | How every service fits together |
| 2 | [Authentication & Security](#2--authentication--security) | Bloom filters, JWT rotation, async email |
| 3 | [The Practice Engine](#3--the-practice-engine-code-execution) | Sync vs. async code execution |
| 4 | [Code Duel](#4--code-duel-distributed-matchmaking) | Matchmaking, locks, Elo, reconnection |
| 5 | [Collaborative Editor](#5--collaborative-editor-crdts) | CRDTs, Yjs, real-time cursors |
| 6 | [High-Performance Dashboard](#6--high-performance-dashboard) | Caching & aggregation strategy |
| 7 | [AI Integrations](#7--ai-integrations) | Prompt engineering with Cohere |
| 8 | [Admin Microservice](#8--decoupled-admin-microservice) | Isolated, zero-trust admin panel |
| 9 | [Database Schema](#9--database-schema) | Full ER diagram |
| 10 | [Scaling & Resiliency](#10--scaling--resiliency) | Redis adapter, dead-letter queues |
| 11 | [Environment Variables](#11--environment-variables) | Full `.env` reference |

---

## 📸 Screenshots

<table>
<tr>
<td width="33%"><img src="./assests/Login.png" alt="Login Screen"/><p align="center">Login</p></td>
<td width="33%"><img src="./assests/Signup.png" alt="Signup Screen"/><p align="center">Signup</p></td>
<td width="33%"><img src="./assests/Dashboard.png" alt="Dashboard"/><p align="center">Dashboard</p></td>
</tr>
<tr>
<td width="33%"><img src="./assests/practice.png" alt="Practice Problems"/><p align="center">Practice</p></td>
<td width="33%"><img src="./assests/Submission.png" alt="Submission Verdict"/><p align="center">Submission</p></td>
<td width="33%"><img src="./assests/1v1_duel.png" alt="Code Duel Arena"/><p align="center">Code Duel</p></td>
</tr>
<tr>
<td width="33%"><img src="./assests/Rooms.png" alt="Collaborative Rooms"/><p align="center">Collaborative Rooms</p></td>
<td width="33%"><img src="./assests/profile.png" alt="User Profile"/><p align="center">Profile</p></td>
<td width="33%"><img src="./assests/ER-Diagram.png" alt="ER Diagram"/><p align="center">ER Diagram</p></td>
</tr>
</table>

---

## 1. 🏗️ System Architecture Overview

CodeArena operates on a **microservices-inspired monolithic architecture**, decoupling heavy workloads via message brokers and isolated instances.

<table>
<tr><td width="50%" valign="top">

**🖥️ Frontend**
Next.js (React Server Components), Tailwind CSS, Monaco Editor (multi-language support)

**⚙️ Backend API**
Node.js / Express.js — HTTP routes + WebSocket connections

**🗄️ Database Layer**
PostgreSQL (via Prisma ORM) — ACID-compliant relational data

</td><td width="50%" valign="top">

**⚡ In-Memory Store**
Redis — caching, rate limiting, Bloom filters, distributed locks

**📬 Message Broker**
BullMQ — background queues for email + code execution

**🧪 Execution Sandbox**
Judge0 on an isolated AWS EC2 instance

**🤖 AI Engine**
Cohere Command-R — reviews & doubt-solving

</td></tr>
</table>

### 🗺️ High-Level Component Map

```mermaid
graph TD
    subgraph Client
        A[Next.js Frontend]
    end

    subgraph Backend
        B[Express.js API]
        C[Socket.IO Gateway]
    end

    subgraph "Data Layer"
        D[(PostgreSQL via Prisma)]
        E[(Redis: Cache / Locks / Bloom / Rate-Limit)]
    end

    subgraph "Async Workers"
        F[BullMQ Queues]
        G[Judge0 Sandbox - EC2]
        H[Cohere AI Engine]
    end

    A -- HTTP/REST --> B
    A -- WebSocket --> C
    B --> D
    B --> E
    B -- Enqueue Jobs --> F
    F --> G
    F --> H
    C --> E
    F -- Emits Results --> C
    C -- Real-time push --> A
```

---

## 2. 🔐 Authentication & Security

> Designed to be **stateless**, resistant to client-side attacks, and optimized to shield PostgreSQL from read-heavy bursts during registration.

<p align="center">
  <img src="./assests/Signup.png" alt="Signup Screen" width="45%"/>
  <img src="./assests/Login.png" alt="Login Screen" width="45%"/>
</p>

### 🌸 The Redis Bloom Filter — O(1) Availability Checks

Querying PostgreSQL on every keystroke during username checks would throttle the database. CodeArena instead leans on a **Redis-backed Bloom Filter**.

| Property | Detail |
|---|---|
| 📦 Storage | 1,000,000-bit Redis bitmap (~122 KB total) |
| 🔑 Hashing | Username normalized → 5× MD5 variants → 5 bit offsets |
| ✅ Lookup | `GETBIT` on all 5 offsets |

> [!TIP]
> If **any** bit is `0` → username is **100% available**, no DB hit needed.
> If **all** bits are `1` → *probably* taken → one fallback query confirms/denies the false positive.

```mermaid
graph TD
    A[User types 'ujjwal123'] --> B{Debounced API Call 500ms}
    B --> C[Redis Bloom Filter 'BF.EXISTS']
    C -- Returns 0 Guaranteed Not Found --> D[Instantly return 'Available' to UI]
    C -- Returns 1 Found / Possible False Positive --> E[PostgreSQL Query]
    E -- Null --> D
    E -- Exists --> F[Return 'Taken' to UI]
    D --> G[User Submits Form]
    G --> H[Check Bloom/DB again to prevent race condition]
    H --> I[Hash Password bcrypt]
    I --> J[Save to DB & Add to Bloom Filter]
```

### 🪪 JWT & Stateless Session Management

A **dual-token strategy** removes the need for server-side session storage.

| Token | Lifetime | Storage | Purpose |
|---|:-:|---|---|
| **Access Token (JWT)** | 15 min | `HttpOnly`, `Secure` cookie | Immune to XSS payload (`UserId`) |
| **Refresh Token** | 7 days | `HttpOnly`, `Secure` cookie | Immune to XSS |

An **Interceptor** catches `401` responses, silently refreshes via `/auth/refresh`, updates memory, and retries the original request — invisibly to the user.

```mermaid
sequenceDiagram
    participant U as Client 
    participant API as Express API
    participant R as Redis/DB

    U->>API: Request with expired Access Token
    API-->>U: 401 Unauthorized
    Note over U: Interceptor pauses original request
    U->>API: POST /auth/refresh (sends HttpOnly cookie)
    API->>R: Validate Refresh Token
    R-->>API: Valid
    API-->>U: New Access Token (in-memory)
    U->>API: Retry original request (invisible to user)
    API-->>U: 200 OK
```

### 📧 Event-Driven Email Verification

Email dispatch is fully decoupled from the HTTP request thread:

1. Generate secure `uuidv4()` token → save to `VerificationToken` table (24hr TTL)
2. Push job to email BullMQ queue → return `201 Created` **instantly**
3. Background worker connects to SMTP and sends the verification link

```mermaid
graph TD
    A[User Registers] --> B[Generate uuidv4 Token]
    B --> C[Save VerificationToken in PostgreSQL - 24hr TTL]
    C --> D[Push Job to Email BullMQ Queue]
    D --> E[Return 201 Created Instantly]
    D --> F((BullMQ Email Worker))
    F --> G[Connect to SMTP]
    G --> H[Send Verification Link]
```

---

## 3. ⚙️ The Practice Engine (Code Execution)

<p align="center">
  <img src="./assests/practice.png" alt="Practice Problem List" width="45%"/>
  <img src="./assests/Submission.png" alt="Submission Verdict" width="45%"/>
</p>

### 🔍 Server-Side Pagination & Debouncing

| Layer | Technique |
|---|---|
| Frontend | Custom `useDebounce` hook (500ms) — no API spam |
| Backend | `skip: (page - 1) * limit` + `take`, cached in Redis |
| Cache Key | `problems:${difficulty}:${tag}:${search}:${page}:${limit}` |

### 🚦 Rate Limiting — Fixed Window Counter

Protects Judge0 from abuse and DDoS.

```mermaid
graph TD
    A[Incoming Execution Request] --> B[Redis INCR on IP Key]
    B --> C{First Increment?}
    C -- Yes --> D[Set EXPIRE TTL 60s]
    C -- No --> E{Count > 5?}
    D --> E
    E -- Yes --> F[Reject 429 Too Many Requests]
    E -- No --> G[Allow Request to Judge0]
```

> [!NOTE]
> Capped at **5 requests / 60 seconds** per IP. TTL auto-resets the window — zero manual cleanup.

### 🏃 Dual Execution Modes — Sync vs. Async

| | ▶️ "Run" Mode | ✅ "Submit" Mode |
|---|---|---|
| **Test cases** | 2-3 public (`isSample: true`) | Up to hundreds (hidden) |
| **Connection** | Synchronous — HTTP stays open | Asynchronous — `202 Accepted` returned instantly |
| **DB Records** | None created | Full `Submission` record created |
| **Protection** | N/A | Idempotency lock: `SET NX EX 86400` |
| **Delivery** | Direct HTTP response | `submission:verdict` via Socket.IO |

```mermaid
graph TD
    A[User double-clicks Submit] --> B[Redis SET NX Lock]
    B -- Key Exists --> C[Drop 2nd Request 409 Conflict]
    B -- Key Acquired --> D[Create DB Record Status PENDING]
    D --> E[Push Job to BullMQ]
    E --> F[Return HTTP 202 to Client]
    F --> G((BullMQ Worker))
    G --> H[Judge0 Sandbox Execution]
    H --> I[Update DB Verdict]
    I --> J[Clear Redis User Dashboard Cache]
    J --> K[Emit Socket.IO Verdict]
    K --> L[If ACCEPTED, trigger AI Review Job]
```

---

## 4. ⚔️ Code Duel (Distributed Matchmaking)

Real-time 1v1 competitive matches with a distributed matchmaking engine, dynamic Elo, and race-condition-proof logic.

<p align="center">
  <img src="./assests/1v1_duel.png" alt="Code Duel Arena" width="30%"/>
  <img src="./assests/1v1_duel_2.png" alt="Code Duel Live Match" width="30%"/>
  <img src="./assests/1v1_duel_3.png" alt="Code Duel Result" width="30%"/>
</p>

### 🎯 Matchmaking Queue (FIFO) & Room Race Guard

```mermaid
graph TD
    A[User clicks 'Find Match'] --> B[RPUSH ID to Redis 'duel:queue']
    B --> C{Check LLEN queue}
    C -- Length < 2 --> D[Wait for opponent]
    C -- Length >= 2 --> E[LPOP two players]
    E --> F[Select Random Problem ID]
    F --> G[Create Match in PostgreSQL]
    G --> H[Socket.IO emit 'duel:match-found']
    H --> I[Redirect both to Arena]

    subgraph "Custom Room Race Condition Guard"
    J[Users click 'Join' simultaneously] --> K{Redis NX Lock 3000ms}
    K -- Lock Acquired --> L[Add to DB & Room]
    K -- Lock Denied --> M[Reject 409: Room Full]
    end
```

### 🔒 Pessimistic vs. Optimistic Locking

| Scenario | Lock Type | Mechanism |
|---|---|---|
| 3 users join a 1-spot room simultaneously | **Pessimistic** (Redis `NX`) | Fastest request locks the room; others get `409` |
| Both players submit correct answer simultaneously | **Optimistic** (Prisma `updateMany`) | Only the first `WHERE status: RUNNING` update succeeds |

```mermaid
sequenceDiagram
    participant A as Player A
    participant B as Player B
    participant DB as PostgreSQL

    A->>DB: updateMany WHERE status = RUNNING → FINISHED
    B->>DB: updateMany WHERE status = RUNNING → FINISHED
    DB-->>A: count = 1 (Success, Winner)
    DB-->>B: count = 0 (No-op, Too Late)
    Note over A,B: Only Player A receives the Elo win boost
```

### 📈 Elo Rating Algorithm

Standard chess Elo system (**K-factor: 32**) adjusts ratings based on expected win probability between competitors.

### 🔌 Socket Resiliency — The Grace Period

```mermaid
graph TD
    A[Socket 'disconnect' Event] --> B[Start 120s setTimeout Grace Period]
    B --> C{User reconnects & emits 'duel:join'?}
    C -- Yes, within 120s --> D[clearTimeout - Match Resumes]
    C -- No, Timer Expires --> E[handlePlayerLeave Executes]
    E --> F[Remaining Player Awarded the Win]
```

---

## 5. 🧑‍🤝‍🧑 Collaborative Editor (CRDTs)

> "Google Docs for Code" — multiple developers editing the same file with sub-millisecond synchronization.

<p align="center">
  <img src="./assests/Rooms.png" alt="Collaborative Room" width="30%"/>
  <img src="./assests/Rooms-2.png" alt="Collaborative Editor" width="30%"/>
  <img src="./assests/Rooms-3.png" alt="Collaborative Chat" width="30%"/>
</p>

### 🧬 Yjs & Conflict-Free Replicated Data Types

Instead of a central arbiter (which causes lag), CodeArena uses **Yjs**: edits happen locally and mathematically converge to the same state regardless of network arrival order. `y-monaco` bridges Monaco directly to the Yjs document.

```mermaid
graph TD
    A[User A types 'const x'] --> B[Local Yjs Document Updates]
    B --> C[Monaco Editor Renders Instantly]
    B --> D[Encode Binary Update]
    D --> E[Socket.IO Emit 'collab:update']
    E --> F((Node.js Server Relay))
    F --> G[Socket.IO Broadcast to Room]
    G --> H[User B receives Binary]
    H --> I[Merge into User B's Yjs Doc]
    I --> J[User B's Monaco updates]
```

### 🔁 Real-Time Sync & Loop Prevention

> [!WARNING]
> Without origin tagging: Server sends update → Client receives it → Client re-broadcasts it → **infinite loop**.

```mermaid
graph TD
    A[Incoming Binary Update] --> B{Check Update Origin Tag}
    B -- Origin = 'network' --> C[Apply Visually Only]
    C --> D[Do NOT Re-emit - Loop Prevented]
    B -- Origin = 'local' --> E[Apply Visually]
    E --> F[Emit 'collab:update' to Server]
```

Cursor positions & selection highlights are broadcast via the **Awareness Protocol** (`collab:awareness`) — the frontend injects dynamic CSS to render colored remote cursors and nameplates.

### 🧹 Graceful Memory Management

Rooms live purely in Node.js RAM (a `Map`) for zero DB latency. When the last user disconnects, a **24-hour cleanup timer** starts; the `Y.Doc` is destroyed only if the room stays empty the entire window (rejoin cancels the timer).

### 💬 Optimistic UI Chat & AI Co-Pilot

* Chat messages **bypass the database** — rendered instantly via a temporary `clientMsgId`, deduplicated against a `Set` on broadcast.
* Prefixing a message with `@` routes it to **Cohere AI**, whose reply is broadcast to the whole room as a shared learning tool.

---

## 6. 📊 High-Performance Dashboard

<p align="center">
  <img src="./assests/Dashboard.png" alt="Dashboard" width="45%"/>
  <img src="./assests/profile.png" alt="User Profile" width="45%"/>
</p>

### ⚡ Caching & Invalidation Engine

```mermaid
graph TD
    A[User Requests Dashboard] --> B{Redis Cache Hit?}
    B -- Yes --> C[Return Cached Data - Fast]
    B -- No --> D[Query PostgreSQL - Aggregate Data]
    D --> E[Store in Redis dashboard:userId - 10min TTL]
    E --> C

    F[BullMQ Worker Finishes Submission] --> G[redis.del dashboard:userId]
    G -.-> B
```

> [!TIP]
> **Event-driven invalidation** guarantees fresh data exactly when it matters — without paying the DB query cost on every unrelated page load.

### 🧮 Advanced Aggregation Logic

| Feature | How it works |
|---|---|
| 🔥 Git-style heatmap | Daily submission density → mapped to CSS opacity values |
| 🔗 Streak calculation | Local ISO timestamp parsing, checks backward-continuous days across timezones |
| 📚 Topic progress | Prisma queries *distinct* `ACCEPTED` submissions to avoid double-counting |

---

## 7. 🤖 AI Integrations

Deep integration with **Cohere Command-R** — no generic chatbot responses, only aggressively-contextual ones.

### 🧠 Contextual Prompt Injection

```mermaid
graph TD
    A[User asks AI a Doubt] --> B[Gather Problem Statement]
    B --> C[Gather User's Monaco Code]
    C --> D[Gather Selected Language]
    D --> E[Gather Execution Error / Doubt Text]
    E --> F[Construct Contextual Prompt Template Literal]
    F --> G[Send to Cohere Command-R]
    G --> H[Stream/Return AI Response to User]
```

### ✅ Automated Reviews

On a successful `ACCEPTED` verdict, a BullMQ job hits the `ai-review` queue → Cohere evaluates time/space complexity and suggests optimizations → result streams to the user's screen over WebSockets.

---

## 8. 🛡️ Decoupled Admin Microservice

For maximum security, the admin panel is **not** part of the public Next.js app — it's an entirely separate system.

| Aspect | Detail |
|---|---|
| 🏛️ Architecture | Standalone Express app, vanilla HTML/JS, separate port (e.g. `5001`) — sits behind VPN/IP-whitelist |
| 🔑 Auth | Static `ADMIN_API_KEY` middleware — **no JWTs** |
| 📥 Ingestion | Zod validation + Prisma `upsert` transactions linking Tags, Categories, Test Cases, Boilerplate |
| 🧹 Cache Purge | `redis.del("problems:*")` on publish |

```mermaid
graph TD
    A[Admin Submits New Problem] --> B[Validate Payload with Zod]
    B --> C[Prisma Upsert: Tags, Categories, Test Cases, Boilerplate]
    C --> D[Save Problem to PostgreSQL]
    D --> E[redis.del 'problems:*']
    E --> F[Global Problem Cache Flushed]
    F --> G[New Problem Instantly Visible to Users]
```

---

## 9. 🗃️ Database Schema

<p align="center">
  <img src="./assests/ER-Diagram.png" alt="ER Diagram" width="70%"/>
</p>

Strictly normalized PostgreSQL schema:

* **User** → 1-to-many with `Submission`, `MatchParticipant`, `VerificationToken`
* **Problem** → 1-to-many with `TestCase`/`Submission`; many-to-many with `Tag`/`Category`
* **Submission** → tracks `status`, `language`, `runtime`, `code`
* **Match** (Duel) → many-to-many with `User` via `MatchParticipant`; 1-to-many with `ChatMessage`
* **Room** (Collab) → persistent anchor for `roomCode`, `ownerId`, `maxMembers`

```mermaid
erDiagram
    USER ||--o{ SUBMISSION : creates
    USER ||--o{ MATCH_PARTICIPANT : joins
    USER ||--o{ VERIFICATION_TOKEN : owns
    USER ||--o{ ROOM : owns

    PROBLEM ||--o{ TEST_CASE : has
    PROBLEM ||--o{ SUBMISSION : receives
    PROBLEM }o--o{ TAG : tagged_with
    PROBLEM }o--o{ CATEGORY : categorized_as

    MATCH ||--o{ MATCH_PARTICIPANT : includes
    MATCH ||--o{ CHAT_MESSAGE : contains

    ROOM {
        string roomCode
        string ownerId
        int maxMembers
    }
    SUBMISSION {
        string status
        string language
        int runtime
        string code
    }
```

---

## 10. 🌐 Scaling & Resiliency

### 🕸️ The WebSocket Trap — Redis Adapter

> [!WARNING]
> Behind a load balancer with 3 Node.js instances, standard WebSockets **break** — User A on Server 1 can't hear broadcasts from Server 2.

```mermaid
graph TD
    A[User A on Server 1] -- emits event --> B[Server 1: Socket.IO]
    B --> C[Redis Pub/Sub Channel]
    C --> D[Server 2: Socket.IO]
    C --> E[Server 3: Socket.IO]
    D --> F[User B on Server 2 receives event]
    E --> G[User C on Server 3 receives event]
```

**Solution:** `@socket.io/redis-adapter` publishes every emitted event to Redis Pub/Sub, instantly fanning it out to all instances.

### ☠️ Dead-Letter Queues (DLQ)

```mermaid
graph TD
    A[Job Pushed to Execution Queue] --> B[Worker Attempts Judge0 Call]
    B -- Success --> C[Update DB Verdict]
    B -- Fails --> D{Retries Remaining?}
    D -- Yes --> E[Exponential Backoff Retry]
    E --> B
    D -- No --> F[Move Job to Dead-Letter Queue]
    F --> G[.on'failed' Listener Fires]
    G --> H[Update Submission Status: INTERNAL_ERROR]
    H --> I[Emit Failure Socket Event to User]
```

> [!NOTE]
> This prevents an infinite UI loading state if Judge0 ever goes offline — the user always gets a definitive verdict.

---

## 11. 🔑 Environment Variables

Create a `.env` file in the project root:

```env
# Database & Redis
DATABASE_URL="postgresql://user:password@localhost:5432/codearena"
REDIS_URL="redis://localhost:6379"

# Security
JWT_ACCESS_SECRET="your_access_secret"
JWT_REFRESH_SECRET="your_refresh_secret"
ADMIN_API_KEY="your_admin_api_key"

# External APIs
JUDGE0_API_URL="http://your-ec2-instance-ip:2358"
COHERE_API_KEY="your_cohere_key"

# Client URL for CORS
NEXT_PUBLIC_CLIENT_URL="http://localhost:3000"
```

> [!CAUTION]
> Never commit `.env` to version control. Ship a `.env.example` with placeholders instead, and keep real secrets (`JWT_ACCESS_SECRET`, `ADMIN_API_KEY`, `COHERE_API_KEY`) out of the repo entirely.

---
---

## 🖼️ Complete Screenshot Gallery

<table>
<tr>
<td width="25%" align="center"><img src="./assests/1v1_duel.png" alt="1v1 Duel"/><br/>1v1_duel</td>
<td width="25%" align="center"><img src="./assests/1v1_duel_2.png" alt="1v1 Duel 2"/><br/>1v1_duel_2</td>
<td width="25%" align="center"><img src="./assests/1v1_duel_3.png" alt="1v1 Duel 3"/><br/>1v1_duel_3</td>
<td width="25%" align="center"><img src="./assests/Dashboard.png" alt="Dashboard"/><br/>Dashboard</td>
</tr>
<tr>
<td width="25%" align="center"><img src="./assests/ER-Diagram.png" alt="ER Diagram"/><br/>ER-Diagram</td>
<td width="25%" align="center"><img src="./assests/Login.png" alt="Login"/><br/>Login</td>
<td width="25%" align="center"><img src="./assests/practice.png" alt="Practice"/><br/>practice</td>
<td width="25%" align="center"><img src="./assests/practice-2.png" alt="Practice 2"/><br/>practice-2</td>
</tr>
<tr>
<td width="25%" align="center"><img src="./assests/problems.png" alt="Problems"/><br/>problems</td>
<td width="25%" align="center"><img src="./assests/Rooms.png" alt="Rooms"/><br/>Rooms</td>
<td width="25%" align="center"><img src="./assests/Rooms-2.png" alt="Rooms 2"/><br/>Rooms-2</td>
<td width="25%" align="center"><img src="./assests/Rooms-3.png" alt="Rooms 3"/><br/>Rooms-3</td>
</tr>
<tr>
<td width="25%" align="center"><img src="./assests/Signup.png" alt="Signup"/><br/>Signup</td>
<td width="25%" align="center"><img src="./assests/Submission.png" alt="Submission"/><br/>Submission</td>
<td width="25%" align="center"><img src="./assests/submission-2.png" alt="Submission 2"/><br/>submission-2</td>
<td width="25%" align="center"><img src="./assests/submission-3.png" alt="Submission 3"/><br/>submission-3</td>
</tr>
<tr>
<td width="25%" align="center"><img src="./assests/profile.png" alt="Profile"/><br/>profile</td>
<td colspan="3"></td>
</tr>
</table>

## 🛠️ Tech Stack Summary

| Layer | Technology |
|---|---|
| 🖥️ Frontend | Next.js (RSC), Tailwind CSS, Monaco Editor |
| ⚙️ Backend | Node.js, Express.js, Socket.IO |
| 🗄️ Database | PostgreSQL + Prisma ORM |
| ⚡ In-Memory Store | Redis (Cache, Locks, Bloom Filter, Rate Limiting) |
| 📬 Queueing | BullMQ |
| 🧪 Execution Sandbox | Judge0 (isolated AWS EC2) |
| 🧑‍🤝‍🧑 Real-Time Collab | Yjs (CRDT) + y-monaco |
| 🤖 AI | Cohere Command-R |

---

<div align="center">

### 📌 Notes for Contributors

This blueprint is a **living document**. Each section maps directly to a real subsystem in the codebase —
when modifying matchmaking, locking, caching, or CRDT logic, please update the corresponding diagram
so the architecture stays a reliable source of truth for new contributors.

**⭐ If this architecture helped you understand distributed systems better, consider starring the repo!**

</div>
