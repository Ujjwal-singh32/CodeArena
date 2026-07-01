"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Send,
  Play,
  Clock,
  MessageSquare,
  Lock,
  User,
  Swords,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import CodeEditor from "@/components/editor/CodeEditor";
import OutputConsole from "@/components/editor/OutputConsole";
import { LANGUAGES, duelApi } from "@/services/api";
import { formatTime } from "@/lib/utils";
import { useParams } from "next/navigation";

export default function DuelRoomPage() {
  const params = useParams();
  const matchId = params.id;
  const [phase, setPhase] = useState("config");
  const [timer, setTimer] = useState(900);
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [config, setConfig] = useState({
    topic: "Arrays",
    difficulty: "MEDIUM",
    questionCount: "1",
    duration: "15",
  });
  const [myReady, setMyReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [code, setCode] = useState("// Write your solution here\n");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [outputStatus, setOutputStatus] = useState("idle");
  const [match, setMatch] = useState(null);

  useEffect(() => {
    if (!matchId || String(matchId).startsWith("game-")) return;
    duelApi
      .get(matchId)
      .then((res) => setMatch(res.match || res))
      .catch(() => {});
  }, [matchId]);

  useEffect(() => {
    if (phase !== "coding") return;
    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleSubmitConfig = () => {
    setMyReady(true);
    setTimeout(() => setOpponentReady(true), 1500);
    setTimeout(() => {
      setPhase("coding");
      setChat((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "System", message: "Match started! Good luck!", time: "14:35" },
      ]);
    }, 2500);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChat((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "code_warrior", message: chatInput, time: "now", isMe: true },
    ]);
    setChatInput("");
  };

  const handleSubmit = () => {
    setOutputStatus("running");
    setOutput("Judging submission...");
    setTimeout(() => {
      setOutput("Accepted! You win!");
      setOutputStatus("success");
    }, 2000);
  };

  const isLocked = myReady && opponentReady;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card glass flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/duel" className="text-muted hover:text-primary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Swords className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold">Duel Room</span>
          <Badge variant="ACTIVE">LIVE</Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-primary" />
            <span>code_warrior</span>
            <span className="text-muted">vs</span>
            <span>algo_master</span>
            <User className="w-4 h-4 text-danger" />
          </div>
          {phase === "coding" && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${timer < 60 ? "border-danger/50 text-danger" : "border-primary/30 text-primary"}`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">{formatTime(timer)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — Config or Problem */}
        <div className="w-[350px] border-r border-border flex flex-col flex-shrink-0">
          {phase === "config" ? (
            <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                Match Configuration
                {isLocked && <Lock className="w-4 h-4 text-primary" />}
              </h3>

              <div className="space-y-4">
                <Select
                  label="Topic"
                  options={[
                    { value: "Arrays", label: "Arrays" },
                    { value: "Graphs", label: "Graphs" },
                    { value: "DP", label: "Dynamic Programming" },
                    { value: "Strings", label: "Strings" },
                  ]}
                  value={config.topic}
                  onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                  disabled={myReady}
                />
                <Select
                  label="Difficulty"
                  options={[
                    { value: "EASY", label: "Easy" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "HARD", label: "Hard" },
                  ]}
                  value={config.difficulty}
                  onChange={(e) => setConfig({ ...config, difficulty: e.target.value })}
                  disabled={myReady}
                />
                <Select
                  label="Questions"
                  options={[
                    { value: "1", label: "1 Question" },
                    { value: "2", label: "2 Questions" },
                    { value: "3", label: "3 Questions" },
                  ]}
                  value={config.questionCount}
                  onChange={(e) => setConfig({ ...config, questionCount: e.target.value })}
                  disabled={myReady}
                />
                <Select
                  label="Duration"
                  options={[
                    { value: "10", label: "10 minutes" },
                    { value: "15", label: "15 minutes" },
                    { value: "20", label: "20 minutes" },
                    { value: "30", label: "30 minutes" },
                  ]}
                  value={config.duration}
                  onChange={(e) => setConfig({ ...config, duration: e.target.value })}
                  disabled={myReady}
                />

                <div className="flex items-center gap-3 pt-2">
                  <div className={`flex items-center gap-2 text-xs ${myReady ? "text-primary" : "text-muted"}`}>
                    <div className={`w-2 h-2 rounded-full ${myReady ? "bg-primary" : "bg-border"}`} />
                    You {myReady ? "ready" : "configuring"}
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${opponentReady ? "text-primary" : "text-muted"}`}>
                    <div className={`w-2 h-2 rounded-full ${opponentReady ? "bg-primary" : "bg-border"}`} />
                    Opponent {opponentReady ? "ready" : "configuring"}
                  </div>
                </div>

                {!myReady && (
                  <Button className="w-full" onClick={handleSubmitConfig}>
                    Submit Configuration
                  </Button>
                )}
                {myReady && !opponentReady && (
                  <p className="text-xs text-muted text-center">Waiting for opponent to confirm...</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
              <h3 className="text-sm font-semibold mb-2">
                {match?.config?.topic || config.topic} Challenge
              </h3>
              <Badge variant={match?.config?.difficulty || config.difficulty} className="mb-4">
                {match?.config?.difficulty || config.difficulty}
              </Badge>
              <div className="text-sm text-muted leading-relaxed">
                <p>Solve the assigned problem before your opponent. Problem details load when the match starts.</p>
              </div>
            </div>
          )}

          {/* Chat */}
          <div className="border-t border-border flex flex-col h-[250px]">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
              <MessageSquare className="w-4 h-4 text-muted" />
              <span className="text-xs font-medium">Chat</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {chat.map((msg) => (
                <div key={msg.id} className={`text-xs ${msg.isMe ? "text-right" : ""}`}>
                  <span className="text-muted">{msg.sender}: </span>
                  <span className="text-foreground">{msg.message}</span>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-border flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50"
              />
              <Button size="sm" onClick={sendChat}>
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right — Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {phase === "config" ? (
            <div className="flex-1 flex items-center justify-center text-muted">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <Swords className="w-16 h-16 mx-auto mb-4 text-border" />
                <p className="text-lg font-medium mb-2">Waiting for match setup</p>
                <p className="text-sm">Configure your preferences and submit to start</p>
              </motion.div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
                <Select
                  options={LANGUAGES}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-40"
                />
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm">
                    <Play className="w-4 h-4" /> Run
                  </Button>
                  <Button size="sm" onClick={handleSubmit}>
                    <Send className="w-4 h-4" /> Submit
                  </Button>
                </div>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1">
                  <CodeEditor value={code} onChange={setCode} language={language} height="100%" />
                </div>
                <div className="h-[30%] border-t border-border">
                  <OutputConsole output={output} status={outputStatus} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
