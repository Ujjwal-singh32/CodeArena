"use client";

import { useState } from "react";
import { Send, Bot, Sparkles, Wrench } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { aiApi } from "@/services/api";

export default function AIPanel({
  messages: initialMessages = [],
  code = "",
  language = "javascript",
  problemTitle = "",
  problemId = null,
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const appendAssistant = (content) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "assistant", content },
    ]);
  };

  const runAction = async (mode) => {
    setActionLoading(mode);
    setLoading(true);
    try {
      const res = await aiApi.assist({
        mode,
        code,
        language,
        problemTitle,
        problemId,
      });
      appendAssistant(res.response || res.message || "No response from AI.");
    } catch {
      const fallbacks = {
        hint: "Try breaking the problem into smaller steps. Consider what data structure fits best for lookups.",
        syntax: "Review your brackets, semicolons, and return statements. Ensure the function returns the expected type.",
      };
      appendAssistant(fallbacks[mode] || "AI is unavailable. Please try again later.");
    } finally {
      setActionLoading(null);
      setLoading(false);
    }
  };

  const handleSendDoubt = async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: question },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await aiApi.assist({
        mode: "doubt",
        code,
        language,
        problemTitle,
        problemId,
        question,
      });
      appendAssistant(res.response || res.message || "No response from AI.");
    } catch {
      appendAssistant(
        "The two-sum problem can be solved in O(n) time using a single pass with a hash map. Would you like me to explain step by step?"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full border border-border rounded-lg overflow-hidden bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Bot className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium">AI Assistant</span>
      </div>

      <div className="flex gap-2 p-3 border-b border-border">
        <button
          onClick={() => runAction("syntax")}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-xs rounded-md transition-all cursor-pointer border border-border",
            actionLoading === "syntax"
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-muted hover:text-foreground hover:border-primary/30"
          )}
        >
          <Wrench className="w-3.5 h-3.5" />
          Fix Syntax
        </button>
        <button
          onClick={() => runAction("hint")}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-xs rounded-md transition-all cursor-pointer border border-border",
            actionLoading === "hint"
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-muted hover:text-foreground hover:border-primary/30"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Hint
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <p className="text-xs text-muted">
            Use Fix Syntax or Hint for quick help. Ask questions below about the problem.
          </p>
        )}
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

      <div className="p-3 border-t border-border">
        <p className="text-[10px] text-muted mb-2 uppercase tracking-wider">Ask Doubt</p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendDoubt()}
            placeholder="Ask about the problem..."
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50 text-foreground placeholder:text-muted/60"
          />
          <Button size="sm" onClick={handleSendDoubt} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
