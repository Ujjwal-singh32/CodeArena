import { cn } from "@/lib/utils";

const difficultyStyles = {
  EASY: "text-primary bg-primary/10 border-primary/30",
  MEDIUM: "text-warning bg-warning/10 border-warning/30",
  HARD: "text-danger bg-danger/10 border-danger/30",
};

const statusStyles = {
  ACCEPTED: "text-primary bg-primary/10 border-primary/30",
  WRONG_ANSWER: "text-danger bg-danger/10 border-danger/30",
  TIME_LIMIT_EXCEEDED: "text-warning bg-warning/10 border-warning/30",
  RUNTIME_ERROR: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  COMPILATION_ERROR: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  PENDING: "text-muted bg-muted/10 border-muted/30",
  UPCOMING: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  ACTIVE: "text-primary bg-primary/10 border-primary/30 animate-pulse-glow",
  ENDED: "text-muted bg-muted/10 border-muted/30",
  WIN: "text-primary bg-primary/10 border-primary/30",
  LOSS: "text-danger bg-danger/10 border-danger/30",
};

export default function Badge({ children, variant, className }) {
  const style = difficultyStyles[variant] || statusStyles[variant] || "text-muted bg-card border-border";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border",
        style,
        className
      )}
    >
      {children}
    </span>
  );
}
