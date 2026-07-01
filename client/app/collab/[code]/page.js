"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  Copy,
  Users,
  Circle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import CodeEditor from "@/components/editor/CodeEditor";
import { languages } from "@/lib/mockData";

const members = [
  { id: "1", username: "code_warrior", color: "#00ff88", isOnline: true, isMe: true },
  { id: "2", username: "dev_ninja", color: "#ff6b6b", isOnline: true },
  { id: "3", username: "byte_coder", color: "#4ecdc4", isOnline: true },
  { id: "4", username: "stack_master", color: "#ffe66d", isOnline: false },
];

const defaultCode = `// Collaborative coding session
// Everyone edits this file in real time

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Try editing together!
console.log(fibonacci(10));
`;

export default function CollabRoomPage() {
  const params = useParams();
  const [code, setCode] = useState(defaultCode);
  const [language, setLanguage] = useState("javascript");

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card glass flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/collab" className="text-muted hover:text-primary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-semibold">Collab Room</span>
          <span className="text-xs font-mono px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/30">
            {params.code}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            {members.filter((m) => m.isOnline).map((m) => (
              <div key={m.id} className="flex items-center gap-1.5 text-xs">
                <Circle className="w-2 h-2 fill-current" style={{ color: m.color }} />
                <span className={m.isMe ? "text-primary" : "text-muted"}>{m.username}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted">
            <Users className="w-4 h-4" />
            {members.filter((m) => m.isOnline).length}/{members.length}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[200px] border-r border-border p-4 flex-shrink-0 hidden md:block">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Members</h4>
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-background"
                  style={{ backgroundColor: m.color }}
                >
                  {m.username[0].toUpperCase()}
                </div>
                <div>
                  <p className={`text-xs font-medium ${m.isMe ? "text-primary" : "text-foreground"}`}>
                    {m.username} {m.isMe && "(you)"}
                  </p>
                  <p className="text-[10px] text-muted">{m.isOnline ? "Online" : "Offline"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
            <Select
              options={languages}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-40"
            />
            <Button variant="ghost" size="sm">
              <Copy className="w-4 h-4" />
              Copy Code
            </Button>
          </div>
          <div className="flex-1">
            <CodeEditor
              value={code}
              onChange={(v) => setCode(v || "")}
              language={language}
              height="100%"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
