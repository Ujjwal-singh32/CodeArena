"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  Copy,
  Users,
  Circle,
  Send,
  MessageSquare,
  Bot,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import CollabEditor from "@/components/editor/CollabEditor";
import { LANGUAGES } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { io } from "socket.io-client";
import { getSocketUrl, aiApi } from "@/services/api";
import { cn } from "@/lib/utils";

const defaultMembers = [
  { id: "1", username: "code_warrior", color: "#00ff88", isOnline: true, isMe: true },
];

export default function CollabRoomPage() {
  const params = useParams();
  const { user } = useAuth();
  const roomCode = params.code;
  const [language, setLanguage] = useState("javascript");
  const [members, setMembers] = useState(defaultMembers);
  const [chat, setChat] = useState([
    { id: "0", sender: "System", message: "Welcome to the collab room!", isSystem: true },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const socketRef = useRef(null);

  const userId = user?.username || "guest";
  const username = user?.username || "guest";

  useEffect(() => {
    const socket = io(getSocketUrl(), { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.emit("collab:join", { roomCode, userId, username, color: "#00ff88" });

    socket.on("collab:users", (users) => {
      setMembers(
        users.map((u) => ({
          id: u.id,
          username: u.name,
          color: u.color,
          isOnline: true,
          isMe: u.id === userId,
        }))
      );
    });

    socket.on("collab:chat", (msg) => {
      setChat((prev) => [...prev, { id: Date.now().toString(), ...msg }]);
    });

    return () => {
      socket.emit("collab:leave", { roomCode, userId });
      socket.disconnect();
    };
  }, [roomCode, userId, username]);

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const message = chatInput.trim();
    const isAiQuery = message.startsWith("@");

    const userMsg = {
      id: Date.now().toString(),
      sender: username,
      message,
      isMe: true,
    };
    setChat((prev) => [...prev, userMsg]);
    setChatInput("");

    socketRef.current?.emit("collab:chat", {
      roomCode,
      sender: username,
      message,
      isMe: false,
    });

    if (isAiQuery) {
      setAiLoading(true);
      try {
        const res = await aiApi.assist({
          mode: "doubt",
          question: message.slice(1).trim(),
          problemTitle: `Collab Room ${roomCode}`,
        });
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: "AI",
          message: res.response || res.message || "Here's my suggestion for your question.",
          isAi: true,
        };
        setChat((prev) => [...prev, aiMsg]);
        socketRef.current?.emit("collab:chat", { roomCode, ...aiMsg });
      } catch {
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          sender: "AI",
          message: "Try breaking the problem into smaller functions and test each part independently.",
          isAi: true,
        };
        setChat((prev) => [...prev, aiMsg]);
      } finally {
        setAiLoading(false);
      }
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(window.getSelection()?.toString() || "");
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card glass flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/collab" className="text-muted hover:text-primary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-semibold">Collab Room</span>
          <span className="text-xs font-mono px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/30">
            {roomCode}
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

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="w-[200px] border-r border-border p-4 flex-shrink-0 hidden md:block overflow-y-auto">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Online</h4>
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

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
            <Select
              options={LANGUAGES}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-40"
            />
            <Button variant="ghost" size="sm" onClick={copyCode}>
              <Copy className="w-4 h-4" />
              Copy Code
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <CollabEditor
              roomCode={roomCode}
              language={language}
              username={username}
              userId={userId}
            />
          </div>
        </div>

        <div className="w-[280px] border-l border-border flex flex-col flex-shrink-0 hidden lg:flex">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            <MessageSquare className="w-4 h-4 text-muted" />
            <span className="text-xs font-medium">Chat</span>
            <span className="text-[10px] text-muted ml-auto">@ for AI</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {chat.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "text-xs rounded-lg px-2 py-1.5",
                  msg.isMe && "text-right",
                  msg.isAi && "bg-primary/5 border border-primary/20",
                  msg.isSystem && "text-muted italic text-center"
                )}
              >
                {!msg.isSystem && (
                  <span className={cn("font-medium", msg.isAi ? "text-primary" : "text-muted")}>
                    {msg.isAi && <Bot className="w-3 h-3 inline mr-1" />}
                    {msg.sender}:{" "}
                  </span>
                )}
                <span className="text-foreground">{msg.message}</span>
              </div>
            ))}
            {aiLoading && (
              <div className="text-xs text-muted flex items-center gap-2">
                <Bot className="w-3 h-3 text-primary" />
                AI is thinking...
              </div>
            )}
          </div>
          <div className="p-2 border-t border-border flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Message... (@ for AI)"
              className="flex-1 px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50"
            />
            <Button size="sm" onClick={sendChat} disabled={aiLoading}>
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
