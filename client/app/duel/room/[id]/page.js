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
  Trophy,
  Loader2, // NEW: Imported Trophy for the Win Modal
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
import { useRouter } from "next/navigation";
export default function DuelRoomPage() {
   const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const matchId = params.id;

  const [match, setMatch] = useState(null);
  const [phase, setPhase] = useState("waiting");
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
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
  const isCreator = participants.length > 0 && participants[0].id === user?.id;
  const applyMatch = useCallback(
    (m) => {
      if (!m) return;
      setMatch(m);
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
      if (m.status === "WAITING") {
        setPhase("waiting");
      } else if (m.status === "RUNNING") {
        setPhase("coding");
        const durationSec = (m.config?.duration || 15) * 60;
        if (m.startedAt) {
          const elapsed = Math.floor(
            (Date.now() - new Date(m.startedAt).getTime()) / 1000,
          );
          setTimer(Math.max(0, durationSec - elapsed));
        } else {
          setTimer(durationSec);
        }
      } else if (m.status === "FINISHED") {
        setPhase("finished");
        if (m.winnerId) setWinnerId(m.winnerId);
      }
    },
    [user?.id],
  );

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
        return [
          ...prev,
          { ...msg, isMe: String(msg.senderId) === String(user?.id) },
        ];
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
        problemsApi
          .getBySlug(problem.slug)
          .then((res) => {
            const p = res.problem || res;
            const langs = Object.keys(p.boilerplate || {});
            const defaultLang = langs.includes("javascript")
              ? "javascript"
              : langs[0] || "javascript";
            setLanguage(defaultLang);
            setCode(p.boilerplate?.[defaultLang] || code);
          })
          .catch(() => {});
      });
    }
  }, [phase, problem?.slug]);

  // Timer logic - Naturally stops when phase changes to "finished"
  useEffect(() => {
    if (phase !== "coding" || !match?.startedAt) return;
    const durationSec = (match.config?.duration || 15) * 60;
    const startTime = new Date(match.startedAt).getTime();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, durationSec - elapsed);

      setTimer(remaining);

      // Optional: Auto-forfeit or handle timeout when it hits 0
      if (remaining <= 0) {
        clearInterval(interval);
        // You can trigger your match finish logic here if time expires
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, match?.startedAt, match?.config?.duration]);
  // Add this inside the component, near your other useEffects
  useEffect(() => {
    if (match && user) {
      // Check if the current user's ID exists in the participants list
      const isParticipant = match.participants.some((p) => p.id === user.id);

      if (!isParticipant) {
        alert("You are not a participant in this match.");
        router.push("/duel"); // Kick them back to the lobby
      }
    }
  }, [match, user, router]);
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
    setIsSubmitSuccess(false);
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
            : "error",
      );
    } catch (error) {
      setOutput(error.message || "Run failed");
      setOutputStatus("error");
    } finally {
      setRunning(false);
    }
  };
  const handleForfeit = () => {
    if (
      window.confirm(
        "Are you sure you want to give up? You will lose this match and your rating will drop.",
      )
    ) {
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
          setIsSubmitSuccess(true);
          socketRef.current?.emit("duel:claim-victory", {
            matchId,
            userId: user?.id,
          });
        }
      } else if (result.submission?.id) {
        const submission = await pollSubmission(result.submission.id);
        if (submission) {
          setOutput(formatVerdictOutput(submission));
          setOutputStatus(mapVerdictStatus(submission.status));
          // FIX: Auto-claim victory
          if (submission.status === "ACCEPTED") {
            socketRef.current?.emit("duel:claim-victory", {
              matchId,
              userId: user?.id,
            });
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
            <Trophy
              className={`w-20 h-20 mx-auto mb-4 ${winnerId === user?.id ? "text-yellow-500" : "text-muted"}`}
            />
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
          <Link
            href="/duel"
            className="text-muted hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Swords className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold">
            {match?.title || `Duel Room #${matchId}`}
          </span>
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
              className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${
                timer < 60
                  ? "border-danger/50 text-danger"
                  : "border-primary/30 text-primary"
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
          {phase === "waiting" ? (
            <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Waiting for Opponent
              </h3>
              <p className="text-sm text-muted">
                The match will auto-start and reveal the problem once a
                challenger joins.
              </p>
            </div>
          ) : (
            <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
              <h3 className="text-sm font-semibold mb-2">
                {problem?.title || "Challenge"}
              </h3>
              <Badge
                variant={problem?.difficulty || match?.config?.difficulty}
                className="mb-4"
              >
                {problem?.difficulty || match?.config?.difficulty}
              </Badge>
              {problem ? (
                <div className="text-sm text-muted leading-relaxed space-y-3">
                  {problem.statement?.split("\n").map((line, i) => (
                    <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, "$1")}</p>
                  ))}
                  <h4 className="text-xs font-semibold text-foreground">
                    Input
                  </h4>
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {problem.inputFormat}
                  </pre>
                  <h4 className="text-xs font-semibold text-foreground">
                    Output
                  </h4>
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {problem.outputFormat}
                  </pre>
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
                <div
                  key={msg.id}
                  className={`text-xs ${msg.isMe ? "text-right" : ""}`}
                >
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
          {phase === "waiting" ? (
            <div className="flex-1 flex items-center justify-center text-muted">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <Swords className="w-16 h-16 mx-auto mb-4 text-border" />
                <p className="text-lg font-medium mb-2">Awaiting Challenger</p>
                <p className="text-sm">
                  Ready your mind. The problem is locked in.
                </p>
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
                  {isSubmitSuccess && phase !== "finished" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        socketRef.current?.emit("duel:claim-victory", {
                          matchId,
                          userId: user?.id,
                        })
                      }
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

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRun}
                    disabled={running || phase === "finished"}
                  >
                    <Play className="w-4 h-4" /> Run
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={running || phase === "finished"}
                  >
                    <Send className="w-4 h-4" /> Submit
                  </Button>
                </div>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1">
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language={language}
                    height="100%"
                  />
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
