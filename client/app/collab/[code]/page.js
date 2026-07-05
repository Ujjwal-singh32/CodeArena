"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import dynamic from "next/dynamic";
import { LANGUAGES } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { io } from "socket.io-client";
import { getSocketUrl, aiApi } from "@/services/api";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

// CRITICAL FIX: Dynamic imports must be OUTSIDE the component.
// Otherwise, React destroys and recreates the editor on every single keystroke/render!
const CollabEditor = dynamic(() => import("@/components/editor/CollabEditor"), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-sm text-muted">Loading Editor...</div>
  ),
});

export default function CollabRoomPage() {
  const params = useParams();
  const { user } = useAuth();
  const roomCode = params.code;
  const [language, setLanguage] = useState("javascript");
  const [members, setMembers] = useState([]);
  const [chat, setChat] = useState([
    {
      id: "system-0",
      sender: "System",
      message: "Welcome to the collab room!",
      isSystem: true,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const socketRef = useRef(null);
  const mySocketIdRef = useRef(null);
  const seenChatIdsRef = useRef(new Set(["system-0"]));

  const userId = useMemo(
    () => (user?.id ? String(user.id) : `guest-${roomCode}`),
    [user?.id, roomCode],
  );
  const username = user?.username || "guest";

  // THE FIX: Track user data in a Ref so it doesn't trigger useEffect disconnects
  const userRef = useRef({ id: userId, name: username });
  useEffect(() => {
    userRef.current = { id: userId, name: username };
  }, [userId, username]);

  const addChatMessage = (msg) => {
    const key = msg.clientMsgId || msg.id;
    if (key && seenChatIdsRef.current.has(key)) return;
    if (key) seenChatIdsRef.current.add(key);
    setChat((prev) => [...prev, msg]);
  };

  useEffect(() => {
    const socket = io(getSocketUrl(), { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      mySocketIdRef.current = socket.id;
      setSocketReady(true);
      // Use userRef here so auth refreshes don't break the socket connection
      socket.emit("collab:join", {
        roomCode,
        userId: userRef.current.id,
        username: userRef.current.name,
        color: "#00ff88",
      });
    });

    socket.on("collab:users", (users) => {
      setMembers(
        users.map((u) => ({
          id: u.odId || u.id,
          username: u.name,
          color: u.color,
          isOnline: true,
          isMe: u.odId === userRef.current.id, // Update this check too
        })),
      );
    });

    socket.on("collab:chat", (msg) => {
      if (msg.senderSocketId === mySocketIdRef.current) return;
      addChatMessage({
        id: msg.clientMsgId || `${msg.sender}-${Date.now()}`,
        sender: msg.sender,
        message: msg.message,
        isAi: msg.isAi,
        isMe: false,
      });
    });

    return () => {
      socket.emit("collab:leave", { roomCode, userId: userRef.current.id });
      socket.disconnect();
      socketRef.current = null;
      setSocketReady(false);
    };
  }, [roomCode]); // <-- CRITICAL: Removed userId and username from here!

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const message = chatInput.trim();
    const isAiQuery = message.startsWith("@");
    const clientMsgId = `local-${Date.now()}`;

    addChatMessage({
      id: clientMsgId,
      sender: username,
      message,
      isMe: true,
    });
    setChatInput("");

    socketRef.current?.emit("collab:chat", {
      roomCode,
      sender: username,
      message,
      senderSocketId: mySocketIdRef.current,
      clientMsgId,
    });

    if (isAiQuery) {
      setAiLoading(true);
      try {
        const res = await aiApi.assist({
          mode: "doubt",
          question: message.slice(1).trim(),
          problemTitle: `Collab Room ${roomCode}`,
        });
        const aiText =
          res.response ||
          res.message ||
          "Here's my suggestion for your question.";
        const aiMsgId = `ai-${Date.now()}`;
        addChatMessage({
          id: aiMsgId,
          sender: "AI",
          message: aiText,
          isAi: true,
        });
        socketRef.current?.emit("collab:chat", {
          roomCode,
          sender: "AI",
          message: aiText,
          isAi: true,
          senderSocketId: mySocketIdRef.current,
          clientMsgId: aiMsgId,
        });
      } catch {
        addChatMessage({
          id: `ai-fallback-${Date.now()}`,
          sender: "AI",
          message:
            "Try breaking the problem into smaller functions and test each part independently.",
          isAi: true,
        });
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
          <Link
            href="/collab"
            className="text-muted hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-semibold">Collab Room</span>
          <span className="text-xs font-mono px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/30">
            {roomCode}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            {members
              .filter((m) => m.isOnline)
              .map((m) => (
                <div key={m.id} className="flex items-center gap-1.5 text-xs">
                  <Circle
                    className="w-2 h-2 fill-current"
                    style={{ color: m.color }}
                  />
                  <span className={m.isMe ? "text-primary" : "text-muted"}>
                    {m.username}
                  </span>
                </div>
              ))}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted">
            <Users className="w-4 h-4" />
            {members.filter((m) => m.isOnline).length}/
            {Math.max(members.length, 1)}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="w-[200px] border-r border-border p-4 flex-shrink-0 hidden md:block overflow-y-auto">
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
            Online
          </h4>
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-background"
                  style={{ backgroundColor: m.color }}
                >
                  {m.username[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p
                    className={`text-xs font-medium ${m.isMe ? "text-primary" : "text-foreground"}`}
                  >
                    {m.username} {m.isMe && "(you)"}
                  </p>
                  <p className="text-[10px] text-muted">
                    {m.isOnline ? "Online" : "Offline"}
                  </p>
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
            {socketReady && socketRef.current && (
              <CollabEditor
                socket={socketRef.current}
                roomCode={roomCode}
                language={language}
                username={username}
                userId={userId}
              />
            )}
          </div>
        </div>

        <div className="w-[320px] border-l border-border flex flex-col flex-shrink-0 hidden lg:flex">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            <MessageSquare className="w-4 h-4 text-muted" />
            <span className="text-xs font-medium">Chat</span>
            <span className="text-[10px] text-muted ml-auto">@ for AI</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
            {chat.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "text-xs rounded-lg px-3 py-2",
                  msg.isMe && "bg-primary/10 ml-8",
                  !msg.isMe &&
                    !msg.isAi &&
                    !msg.isSystem &&
                    "bg-card border border-border mr-8",
                  msg.isAi && "bg-primary/5 border border-primary/20",
                  msg.isSystem &&
                    "text-muted italic text-center mx-auto bg-transparent border-none p-1",
                )}
              >
                {!msg.isSystem && (
                  <div
                    className={cn(
                      "font-medium mb-1",
                      msg.isMe
                        ? "text-primary text-right"
                        : msg.isAi
                          ? "text-primary"
                          : "text-muted",
                    )}
                  >
                    {msg.isAi && <Bot className="w-3.5 h-3.5 inline mr-1" />}
                    {msg.sender}
                  </div>
                )}

                {msg.isAi ? (
                  <div className="text-foreground">
                    <ReactMarkdown
                      components={{
                        pre({ children }) {
                          return (
                            <pre className="bg-background rounded-md p-2 my-2 overflow-x-auto border border-border">
                              {children}
                            </pre>
                          );
                        },

                        code({ className, children, ...props }) {
                          return (
                            <code
                              className={cn(className, "font-mono text-[11px]")}
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },

                        p({ children }) {
                          return (
                            <p className="leading-relaxed mb-2 last:mb-0">
                              {children}
                            </p>
                          );
                        },

                        ul({ children }) {
                          return (
                            <ul className="list-disc pl-4 my-2 space-y-1">
                              {children}
                            </ul>
                          );
                        },

                        ol({ children }) {
                          return (
                            <ol className="list-decimal pl-4 my-2 space-y-1">
                              {children}
                            </ol>
                          );
                        },

                        h3({ children }) {
                          return (
                            <h3 className="font-semibold text-primary mt-3 mb-1">
                              {children}
                            </h3>
                          );
                        },

                        strong({ children }) {
                          return (
                            <strong className="font-semibold">
                              {children}
                            </strong>
                          );
                        },
                      }}
                    >
                      {msg.message}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div
                    className={cn("text-foreground", msg.isMe && "text-right")}
                  >
                    {msg.message}
                  </div>
                )}
              </div>
            ))}
            {aiLoading && (
              <div className="text-xs text-muted flex items-center gap-2 px-2">
                <Bot className="w-3 h-3 text-primary animate-pulse" />
                AI is thinking...
              </div>
            )}
          </div>
          <div className="p-3 border-t border-border flex gap-2 bg-card">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Message... (@ for AI)"
              className="flex-1 px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50"
            />
            <Button
              size="sm"
              onClick={sendChat}
              disabled={aiLoading || !chatInput.trim()}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
