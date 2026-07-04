"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Trophy, // NEW: Imported Trophy for the Win Modal
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import CodeEditor from "@/components/editor/CodeEditor";
import OutputConsole from "@/components/editor/OutputConsole";
import {
  LANGUAGES,
  duelApi,
  submissionsApi,
  mapVerdictStatus,
  pollSubmission,
  formatVerdictOutput,
} from "@/services/api";
import { useDuelSocket } from "@/hooks/useSocket";
import { formatTime } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DuelRoomPage() {
  const params = useParams();
  const { user } = useAuth();
  const matchId = params.id;

  const [match, setMatch] = useState(null);
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
  const [readyPlayers, setReadyPlayers] = useState(new Set());
  const [code, setCode] = useState("// Write your solution here\n");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [outputStatus, setOutputStatus] = useState("idle");
  const [running, setRunning] = useState(false);
  const [winnerId, setWinnerId] = useState(null); // NEW: State to track who won

  const participants = match?.participants || [];
  const me = participants.find((p) => p.id === user?.id);
  const opponent = participants.find((p) => p.id !== user?.id);
  const opponentReady = opponent ? readyPlayers.has(opponent.id) : false;
  const isLocked = myReady && opponentReady;
  const problem = match?.config?.problem;

  const applyMatch = useCallback((m) => {
    if (!m) return;
    setMatch(m);
    if (m.config) {
      setConfig({
        topic: m.config.topic || "Arrays",
        difficulty: m.config.difficulty || "MEDIUM",
        questionCount: String(m.config.questionCount || 1),
        duration: String(m.config.duration || 15),
      });
      if (m.config.isLocked) {
        setMyReady(true);
        setReadyPlayers(new Set(m.participants?.map((p) => p.id) || []));
      }
    }
    if (m.chat?.length) {
      setChat((prev) => {
        const byId = new Map();
        for (const msg of m.chat) {
          byId.set(String(msg.id), {
            ...msg,
            isMe: String(msg.senderId) === String(user?.id),
          });
        }
        for (const msg of prev) {
          const key = String(msg.id);
          if (!byId.has(key)) byId.set(key, msg);
        }
        return Array.from(byId.values());
      });
    }

    // CHANGED: Handled FINISHED phase correctly
    if (m.status === "RUNNING") {
      setPhase("coding");
      const durationSec = (m.config?.duration || 15) * 60;
      if (m.startedAt) {
        const elapsed = Math.floor((Date.now() - new Date(m.startedAt).getTime()) / 1000);
        setTimer(Math.max(0, durationSec - elapsed));
      } else {
        setTimer(durationSec);
      }
    } else if (m.status === "FINISHED") {
      setPhase("finished");
      if (m.winnerId) setWinnerId(m.winnerId);
    }
  }, [user?.id]);

  const loadMatch = useCallback(async () => {
    if (!matchId || String(matchId).startsWith("game-")) return;
    try {
      const res = await duelApi.get(matchId);
      applyMatch(res.match || res);
    } catch {
      // keep current state
    }
  }, [matchId, applyMatch]);

  useEffect(() => {
    loadMatch();
    const interval = setInterval(loadMatch, 3000);
    return () => clearInterval(interval);
  }, [loadMatch]);

  const seenChatIdsRef = useRef(new Set());

  const duelHandlers = useRef({});
  duelHandlers.current = {
    "duel:chat": (msg) => {
      const key = msg.clientMsgId || msg.id;
      if (key && seenChatIdsRef.current.has(key)) return;
      if (key) seenChatIdsRef.current.add(key);
      setChat((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { ...msg, isMe: String(msg.senderId) === String(user?.id) }];
      });
    },
    "duel:match-update": ({ match: m }) => applyMatch(m),
    "duel:started": ({ match: m }) => {
      if (m) applyMatch(m);
      else loadMatch();
    },
    "duel:player-ready": ({ userId }) => {
      setReadyPlayers((prev) => new Set([...prev, userId]));
    },
    // CHANGED: Listens to the backend judge to declare winner
    "duel:finished": ({ match: m, winnerId: wId }) => {
      if (wId) setWinnerId(wId);
      if (m) applyMatch(m);
      else loadMatch();
      setPhase("finished"); // Immediately stop timer and show modal
    },
  };

  const socketRef = useDuelSocket(matchId, user?.id, duelHandlers.current);

  useEffect(() => {
    if (phase === "coding" && problem?.slug) {
      import("@/services/api").then(({ problemsApi }) => {
        problemsApi.getBySlug(problem.slug).then((res) => {
          const p = res.problem || res;
          const langs = Object.keys(p.boilerplate || {});
          const defaultLang = langs.includes("javascript") ? "javascript" : langs[0] || "javascript";
          setLanguage(defaultLang);
          setCode(p.boilerplate?.[defaultLang] || code);
        }).catch(() => { });
      });
    }
  }, [phase, problem?.slug]);

  // Timer logic - Naturally stops when phase changes to "finished"
  useEffect(() => {
    if (phase !== "coding" || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, timer]);

  const handleSubmitConfig = async () => {
    if (!matchId) return;
    try {
      const res = await duelApi.submitConfig(matchId, config);
      setMyReady(true);
      setReadyPlayers((prev) => new Set([...prev, user?.id]));
      applyMatch(res.match || res);
    } catch (error) {
      setOutput(error.message || "Failed to submit config");
      setOutputStatus("error");
    }
  };

  const sendChat = () => {
    if (!chatInput.trim() || !user?.id) return;
    const message = chatInput.trim();

    // Clear the input field immediately
    setChatInput("");

    // Send to server. The socket listener will receive it and update the UI.
    socketRef.current?.emit("duel:chat", {
      matchId,
      message,
      senderId: user.id,
    });
  };




  const handleRun = async () => {
    const problemId = match?.config?.problem?.id || match?.config?.problemId;
    if (!problemId) {
      setOutput("Problem not loaded yet.");
      setOutputStatus("error");
      return;
    }
    setRunning(true);
    setOutputStatus("running");
    setOutput("Running against sample test cases...");
    try {
      const result = await submissionsApi.run({
        code,
        language,
        problemId: parseInt(problemId, 10),
      });
      setOutput(result.output || "No output");
      setOutputStatus(
        result.status === "ACCEPTED"
          ? "success"
          : result.status === "WRONG_ANSWER"
            ? "wrong"
            : "error"
      );
    } catch (error) {
      setOutput(error.message || "Run failed");
      setOutputStatus("error");
    } finally {
      setRunning(false);
    }
  };
  const handleForfeit = () => {
    if (window.confirm("Are you sure you want to give up? You will lose this match and your rating will drop.")) {
      socketRef.current?.emit("duel:forfeit", { matchId, userId: user?.id });
    }
  };

  const handleSubmit = async () => {
    const problemId = match?.config?.problem?.id || match?.config?.problemId;
    if (!problemId) {
      setOutput("Problem not loaded yet.");
      setOutputStatus("error");
      return;
    }
    setRunning(true);
    setOutputStatus("running");
    setOutput("Submitting to judge...");
    try {
      const result = await submissionsApi.submit({
        code,
        language,
        problemId: parseInt(problemId, 10),
        matchId: parseInt(matchId, 10),
      });

      const v = result.verdict;
      if (v) {
        setOutput(formatVerdictOutput(v));
        setOutputStatus(mapVerdictStatus(v.status));
        // FIX: Auto-claim victory
        if (v.status === "ACCEPTED") {
          socketRef.current?.emit("duel:claim-victory", { matchId, userId: user?.id });
        }
      } else if (result.submission?.id) {
        const submission = await pollSubmission(result.submission.id);
        if (submission) {
          setOutput(formatVerdictOutput(submission));
          setOutputStatus(mapVerdictStatus(submission.status));
          // FIX: Auto-claim victory
          if (submission.status === "ACCEPTED") {
            socketRef.current?.emit("duel:claim-victory", { matchId, userId: user?.id });
          }
        }
      }
    } catch (error) {
      setOutput(error.message || "Submission failed");
      setOutputStatus("error");
    } finally {
      setRunning(false);
    }
  };

  // const participants = match?.participants || [];
  // const me = participants.find((p) => p.id === user?.id);
  // const opponent = participants.find((p) => p.id !== user?.id);
  // const opponentReady = opponent ? readyPlayers.has(opponent.id) : false;
  // const isLocked = myReady && opponentReady;
  // const problem = match?.config?.problem;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col relative">

      {/* NEW: Win/Loss Overlay Modal when match finishes */}
      {phase === "finished" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card p-8 rounded-2xl border border-border text-center max-w-md w-full shadow-2xl"
          >
            <Trophy className={`w-20 h-20 mx-auto mb-4 ${winnerId === user?.id ? "text-yellow-500" : "text-muted"}`} />
            <h2 className="text-3xl font-bold mb-2">
              {winnerId === user?.id ? "Victory!" : "Defeat!"}
            </h2>
            <p className="text-muted mb-6">
              {winnerId === user?.id
                ? "You solved the problem first! Your rating will be updated shortly."
                : "Your opponent finished before you. Better luck next time!"}
            </p>
            <Link href="/duel">
              <Button className="w-full text-lg py-6">Return to Lobby</Button>
            </Link>
          </motion.div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card glass flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/duel" className="text-muted hover:text-primary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Swords className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold">Duel Room #{matchId}</span>
          <Badge variant="ACTIVE">{match?.status || "WAITING"}</Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-primary" />
            <span>{me?.username || user?.username || "You"}</span>
            <span className="text-muted">vs</span>
            <span>{opponent?.username || "Waiting..."}</span>
            <User className="w-4 h-4 text-danger" />
          </div>
          {(phase === "coding" || phase === "finished") && (
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${timer < 60 ? "border-danger/50 text-danger" : "border-primary/30 text-primary"
                }`}
            >
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">{formatTime(timer)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
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
                    Opponent {opponentReady ? "ready" : participants.length < 2 ? "not joined" : "configuring"}
                  </div>
                </div>

                {!myReady && participants.length >= 2 && (
                  <Button className="w-full" onClick={handleSubmitConfig}>
                    Submit Configuration
                  </Button>
                )}
                {myReady && !opponentReady && (
                  <p className="text-xs text-muted text-center">Waiting for opponent to confirm...</p>
                )}
                {participants.length < 2 && (
                  <p className="text-xs text-muted text-center">Waiting for opponent to join...</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
              <h3 className="text-sm font-semibold mb-2">{problem?.title || "Challenge"}</h3>
              <Badge variant={problem?.difficulty || config.difficulty} className="mb-4">
                {problem?.difficulty || config.difficulty}
              </Badge>
              {problem ? (
                <div className="text-sm text-muted leading-relaxed space-y-3">
                  {problem.statement?.split("\n").map((line, i) => (
                    <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, "$1")}</p>
                  ))}
                  <h4 className="text-xs font-semibold text-foreground">Input</h4>
                  <pre className="text-xs font-mono whitespace-pre-wrap">{problem.inputFormat}</pre>
                  <h4 className="text-xs font-semibold text-foreground">Output</h4>
                  <pre className="text-xs font-mono whitespace-pre-wrap">{problem.outputFormat}</pre>
                </div>
              ) : (
                <p className="text-sm text-muted">Loading problem...</p>
              )}
            </div>
          )}

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

        <div className="flex-1 flex flex-col overflow-hidden">
          {phase === "config" ? (
            <div className="flex-1 flex items-center justify-center text-muted">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <Swords className="w-16 h-16 mx-auto mb-4 text-border" />
                <p className="text-lg font-medium mb-2">Waiting for match setup</p>
                <p className="text-sm">Both players must submit configuration to start</p>
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
                  {/* NEW: Manual Complete Match Button (Only shows if they passed) */}
                  {outputStatus === "success" && phase !== "finished" && (
                    <Button
                      size="sm"
                      onClick={() => socketRef.current?.emit("duel:claim-victory", { matchId, userId: user?.id })}
                      className="bg-green-500 hover:bg-green-600 text-black border-none font-bold animate-pulse"
                    >
                      <Trophy className="w-4 h-4 mr-1" /> Claim Victory!
                    </Button>
                  )}

                  {/* Give Up Button */}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleForfeit}
                    disabled={running || phase === "finished"}
                    className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                  >
                    Give Up
                  </Button>

                  <Button variant="secondary" size="sm" onClick={handleRun} disabled={running || phase === "finished"}>
                    <Play className="w-4 h-4" /> Run
                  </Button>
                  <Button size="sm" onClick={handleSubmit} disabled={running || phase === "finished"}>
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