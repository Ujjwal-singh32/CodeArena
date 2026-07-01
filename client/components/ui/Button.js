"use client";

import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-primary text-background hover:bg-primary-dim glow-green-sm font-semibold",
  secondary:
    "bg-card border border-border text-foreground hover:border-primary/50 hover:text-primary",
  ghost: "text-muted hover:text-primary hover:bg-primary/5",
  danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
  outline:
    "border border-primary/50 text-primary hover:bg-primary/10 hover:glow-green-sm",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-lg",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
