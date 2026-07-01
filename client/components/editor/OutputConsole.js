"use client";

import { cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

export default function OutputConsole({ output, status, runtime, memory }) {
  const statusMap = {
    idle: { label: "Ready", variant: null },
    running: { label: "Running...", variant: "PENDING" },
    success: { label: "Accepted", variant: "ACCEPTED" },
    error: { label: "Error", variant: "RUNTIME_ERROR" },
    wrong: { label: "Wrong Answer", variant: "WRONG_ANSWER" },
  };

  const current = statusMap[status] || statusMap.idle;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <span className="text-sm font-medium text-foreground">Output</span>
        <div className="flex items-center gap-3">
          {runtime && (
            <span className="text-xs text-muted">Runtime: {runtime}</span>
          )}
          {memory && (
            <span className="text-xs text-muted">Memory: {memory}</span>
          )}
          {current.variant && <Badge variant={current.variant}>{current.label}</Badge>}
        </div>
      </div>
      <pre
        className={cn(
          "flex-1 p-4 text-sm font-mono overflow-auto scrollbar-thin bg-[#0d0d0d]",
          status === "success" ? "text-primary" : status === "error" || status === "wrong" ? "text-danger" : "text-muted"
        )}
      >
        {output || "Run your code to see output here..."}
      </pre>
    </div>
  );
}
