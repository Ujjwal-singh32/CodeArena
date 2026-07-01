"use client";

import { useState } from "react";
import { Send, Bot, Sparkles, Wrench, HelpCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const modes = [
  { id: "hint", label: "Hint", icon: Sparkles },
  { id: "syntax", label: "Fix Syntax", icon: Wrench },
  { id: "doubt", label: "Ask Doubt", icon: HelpCircle },
];

export default function AIPanel({ messages: initialMessages = [], onSend }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("doubt");
  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = { id: Date.now().toString(), role: "user", content: input, mode };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const responses = {
        hint: "Try using a hash map to store complements. For each number, check if (target - num) exists in the map.",
        syntax: "Your code looks syntactically correct. Make sure you're returning the indices, not the values.",
        doubt: "The two-sum problem can be solved in O(n) time using a single pass with a hash map. Would you like me to explain the approach step by step?",
      };
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responses[mode],
        },
      ]);
      setLoading(false);
    }, 1200);

    onSend?.(input, mode);
  };

  return (
    <div className="flex flex-col h-full border border-border rounded-lg overflow-hidden bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Bot className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium">AI Assistant</span>
      </div>

      <div className="flex gap-1 p-2 border-b border-border">
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all cursor-pointer",
                mode === m.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "text-sm rounded-lg px-3 py-2 max-w-[90%]",
              msg.role === "user"
                ? "bg-primary/10 text-foreground ml-auto"
                : "bg-background text-muted"
            )}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            AI is thinking...
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask for hints, syntax help, or doubts..."
          className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted/60"
        />
        <Button size="sm" onClick={handleSend} disabled={loading}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
