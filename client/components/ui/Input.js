import { cn } from "@/lib/utils";

export default function Input({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm text-muted font-medium">{label}</label>
      )}
      <input
        className={cn(
          "w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/60",
          "focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all",
          error && "border-danger/50 focus:border-danger/50 focus:ring-danger/20",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
