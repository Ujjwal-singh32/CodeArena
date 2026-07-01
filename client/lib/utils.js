export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function formatDifficulty(difficulty) {
  const map = {
    EASY: { label: "Easy", color: "text-primary bg-primary/10 border-primary/30" },
    MEDIUM: { label: "Medium", color: "text-warning bg-warning/10 border-warning/30" },
    HARD: { label: "Hard", color: "text-danger bg-danger/10 border-danger/30" },
  };
  return map[difficulty] || map.EASY;
}

export function formatRating(rating) {
  if (rating >= 2000) return { tier: "Grandmaster", color: "text-red-400" };
  if (rating >= 1800) return { tier: "Master", color: "text-orange-400" };
  if (rating >= 1600) return { tier: "Expert", color: "text-purple-400" };
  if (rating >= 1400) return { tier: "Advanced", color: "text-blue-400" };
  if (rating >= 1200) return { tier: "Intermediate", color: "text-primary" };
  return { tier: "Beginner", color: "text-muted" };
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
