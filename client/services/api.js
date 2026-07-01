const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }
  return data;
}

export const authApi = {
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),
  verifyEmail: (token) => request(`/auth/verify-email?token=${token}`),
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
  get: (id) => request(`/submissions/${id}`),
};

export const duelApi = {
  create: (body) => request("/duel/matches", { method: "POST", body: JSON.stringify(body) }),
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/duel/matches${qs ? `?${qs}` : ""}`);
  },
  join: (matchId) => request(`/duel/matches/${matchId}/join`, { method: "POST" }),
  get: (matchId) => request(`/duel/matches/${matchId}`),
};

export const collabApi = {
  create: (body) => request("/collab/rooms", { method: "POST", body: JSON.stringify(body) }),
  join: (code) => request(`/collab/rooms/${code}/join`, { method: "POST" }),
  get: (code) => request(`/collab/rooms/${code}`),
};

export const aiApi = {
  assist: (body) => request("/ai/assist", { method: "POST", body: JSON.stringify(body) }),
};

export function getSocketUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
}
