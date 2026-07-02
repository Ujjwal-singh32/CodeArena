import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.ADMIN_PORT || 5001;
const API_URL = process.env.API_URL || "http://localhost:5000/api/v1";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

app.use(express.static(join(__dirname, "public")));
app.use("/templates", express.static(join(__dirname, "templates")));

app.get("/api/config", (_req, res) => {
  res.json({
    apiUrl: API_URL,
    hasKey: Boolean(ADMIN_API_KEY),
  });
});

app.post("/api/upload", express.json({ limit: "2mb" }), async (req, res) => {
  try {
    const response = await fetch(`${API_URL}/admin/problems`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": ADMIN_API_KEY,
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/problems/:id/test-cases", express.json({ limit: "2mb" }), async (req, res) => {
  try {
    const response = await fetch(`${API_URL}/admin/problems/${req.params.id}/test-cases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": ADMIN_API_KEY,
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/problems", async (_req, res) => {
  try {
    const response = await fetch(`${API_URL}/admin/problems`, {
      headers: { "X-Admin-Key": ADMIN_API_KEY },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`CodeArena Admin UI → http://localhost:${PORT}`);
});
