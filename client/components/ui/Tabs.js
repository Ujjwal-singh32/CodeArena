"use client";

import { cn } from "@/lib/utils";

export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-card rounded-lg border border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-4 py-2 text-sm rounded-md transition-all cursor-pointer",
            activeTab === tab.id
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
