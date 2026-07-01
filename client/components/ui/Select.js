"use client";

import { cn } from "@/lib/utils";

export default function Select({ label, options, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm text-muted font-medium">{label}</label>
      )}
      <select
        className={cn(
          "w-full px-4 py-2.5 bg-card border border-border rounded-lg text-foreground",
          "focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
