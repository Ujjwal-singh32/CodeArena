const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

async function request(path, options = {}, retried = false) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !retried && path !== "/auth/refresh" && path !== "/auth/login") {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
        return request(path, options, true);
      }
    } catch {
      // fall through
    }
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }
  return data;
}

export const authApi = {
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  refresh: () => request("/auth/refresh", { method: "POST" }),
  me: () => request("/auth/me"),
  verifyEmail: (token) => request(`/auth/verify-email?token=${encodeURIComponent(token)}`),
};

export const problemsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/problems${qs ? `?${qs}` : ""}`);
  },
  getBySlug: (slug) => request(`/problems/${slug}`),
};

export const submissionsApi = {
  run: (body) => request("/submissions/run", { method: "POST", body: JSON.stringify(body) }),
  submit: (body) => request("/submissions", { method: "POST", body: JSON.stringify(body) }),
  listMine: (limit = 50) => request(`/submissions?limit=${limit}`),
  get: (id) => request(`/submissions/${id}`),
};

export const usersApi = {
  stats: () => request("/users/stats"),
  leaderboard: (limit = 10) => request(`/users/leaderboard?limit=${limit}`),
  dashboard: () => request("/users/dashboard"),
  profile: () => request("/users/profile"),
};

export const duelApi = {
  create: (body) => request("/duel/matches", { method: "POST", body: JSON.stringify(body) }),
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/duel/matches${qs ? `?${qs}` : ""}`);
  },
  join: (matchId) => request(`/duel/matches/${matchId}/join`, { method: "POST" }),
  get: (matchId) => request(`/duel/matches/${matchId}`),
  submitConfig: (matchId, body) =>
    request(`/duel/matches/${matchId}/config`, { method: "POST", body: JSON.stringify(body) }),
  start: (matchId) => request(`/duel/matches/${matchId}/start`, { method: "POST" }),
  findMatch: () => request("/duel/matches/find", { method: "POST" })
};

export const collabApi = {
  create: (body) => request("/collab/rooms", { method: "POST", body: JSON.stringify(body) }),
  join: (code) => request(`/collab/rooms/${code}/join`, { method: "POST" }),
  get: (code) => request(`/collab/rooms/${code}`),
};

export const aiApi = {
  assist: (body) => request("/ai/assist", { method: "POST", body: JSON.stringify(body) }),
};

export const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "java", label: "Java" },
];

export function getSocketUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
}

export function mapVerdictStatus(status) {
  if (status === "ACCEPTED") return "success";
  if (status === "WRONG_ANSWER") return "wrong";
  return "error";
}

export function formatVerdictOutput(verdict) {
  if (verdict?.output) return verdict.output;
  if (!verdict?.status) return "Unknown result";

  const status = verdict.status;
  if (status === "COMPILATION_ERROR") {
    const detail = sanitizeErrorText(verdict.compileOutput || verdict.stderr || "");
    return `Compilation Error\n\n${detail || "Your code failed to compile."}`;
  }
  if (status === "RUNTIME_ERROR") {
    const detail = sanitizeErrorText(verdict.stderr || verdict.stdout || "");
    return `Runtime Error\n\n${detail || "Program exited with an error."}`;
  }
  if (status === "TIME_LIMIT_EXCEEDED") {
    return "Time Limit Exceeded\n\nYour program took too long to execute.";
  }
  if (status === "WRONG_ANSWER") {
    return `Wrong Answer\n\nYour output:\n${verdict.stdout || "(empty)"}`;
  }
  if (status === "ACCEPTED") {
    return `Accepted — ${verdict.passedTestCases}/${verdict.totalTestCases} tests passed`;
  }
  return status.replace(/_/g, " ");
}

function sanitizeErrorText(raw) {
  if (!raw) return "";
  return raw
    .split("\n")
    .filter((line) => !line.match(/^File "\/sandbox\//) && !line.match(/^  File "/))
    .join("\n")
    .trim();
}

export async function pollSubmission(submissionId, maxAttempts = 30, intervalMs = 1000) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await submissionsApi.get(submissionId);
    if (res.submission?.status && res.submission.status !== "PENDING") {
      return res.submission;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}
