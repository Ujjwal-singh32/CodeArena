"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  problemsApi,
  submissionsApi,
  LANGUAGES,
  mapVerdictStatus,
  pollSubmission,
  formatVerdictOutput,
} from "@/services/api";
import { useSocket } from "@/hooks/useSocket";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Play,
  Send,
  Clock,
  HardDrive,
  Bot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import CodeEditor from "@/components/editor/CodeEditor";
import OutputConsole from "@/components/editor/OutputConsole";
import AIPanel from "@/components/editor/AIPanel";
import { formatDifficulty } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function ProblemPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params.slug;

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [outputStatus, setOutputStatus] = useState("idle");
  const [runtime, setRuntime] = useState(null);
  const [memory, setMemory] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [running, setRunning] = useState(false);
  const pendingSubmissionRef = useRef(null);

  const applyVerdict = useCallback((v) => {
    setOutput(formatVerdictOutput(v));
    setOutputStatus(mapVerdictStatus(v.status));
    setRuntime(v.runtime ? `${v.runtime} ms` : null);
    setMemory(v.memory ? `${v.memory} MB` : null);
    setRunning(false);
    pendingSubmissionRef.current = null;
  }, []);

  useSocket(user?.id, {
    "submission:verdict": (payload) => {
      if (
        pendingSubmissionRef.current &&
        String(payload.submissionId) === String(pendingSubmissionRef.current)
      ) {
        applyVerdict(payload);
      }
    },
  });

  useEffect(() => {
    if (!slug) return;
    problemsApi
      .getBySlug(slug)
      .then((res) => {
        const p = res.problem || res;
        setProblem(p);
        const langs = Object.keys(p.boilerplate || {});
        const defaultLang = langs.includes("javascript") ? "javascript" : langs[0] || "javascript";
        setLanguage(defaultLang);
        setCode(p.boilerplate?.[defaultLang] || "");
      })
      .catch(() => setProblem(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    setCode(problem?.boilerplate?.[lang] || "");
  };

  const requireAuth = () => {
    if (!user) {
      setOutput("Please sign in and verify your email to run or submit code.");
      setOutputStatus("error");
      router.push("/login");
      return false;
    }
    if (!user.emailVerified) {
      setOutput("Please verify your email before running or submitting code.");
      setOutputStatus("error");
      return false;
    }
    return true;
  };

  const handleRun = async () => {
    if (!requireAuth() || !problem) return;
    setRunning(true);
    setOutputStatus("running");
    setOutput("Running against sample test cases...");
    setRuntime(null);
    setMemory(null);

    try {
      const result = await submissionsApi.run({
        code,
        language,
        problemId: parseInt(problem.id, 10),
      });
      setOutput(result.output || "No output");
      setOutputStatus(
        result.status === "ACCEPTED"
          ? "success"
          : result.status === "WRONG_ANSWER"
            ? "wrong"
            : "error"
      );
      setRuntime(result.runtime ? `${result.runtime} ms` : null);
      setMemory(result.memory ? `${result.memory} MB` : null);
    } catch (error) {
      setOutput(error.message || "Run failed");
      setOutputStatus("error");
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!requireAuth() || !problem) return;
    setRunning(true);
    setOutputStatus("running");
    setOutput("Submitting to judge (all test cases)...");

    try {
      const result = await submissionsApi.submit({
        code,
        language,
        problemId: parseInt(problem.id, 10),
      });
      const v = result.verdict;
      if (v) {
        applyVerdict(v);
      } else if (result.submission?.id) {
        pendingSubmissionRef.current = result.submission.id;
        setOutput(`Submission queued (ID: ${result.submission.id}). Waiting for verdict...`);
        setOutputStatus("running");
        setRunning(true);
        const submission = await pollSubmission(result.submission.id);
        if (submission) {
          applyVerdict({
            status: submission.status,
            passedTestCases: submission.passedTestCases,
            totalTestCases: submission.totalTestCases,
            runtime: submission.runtime,
            memory: submission.memory,
            compileOutput: submission.compileOutput,
            stderr: submission.stderr,
            stdout: submission.stdout,
          });
        } else {
          setOutput("Verdict timed out. Check submission history.");
          setOutputStatus("error");
          setRunning(false);
        }
      }
    } catch (error) {
      setOutput(error.message || "Submission failed");
      setOutputStatus("error");
    } finally {
      if (!pendingSubmissionRef.current) setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center text-muted">
        Loading problem...
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4">
        <p className="text-muted">Problem not found.</p>
        <Link href="/practice" className="text-primary hover:underline">Back to problems</Link>
      </div>
    );
  }

  const diff = formatDifficulty(problem.difficulty);
  const langOptions = LANGUAGES;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 glass shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/practice" className="text-muted hover:text-primary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-sm font-semibold truncate">{problem.title}</h1>
          <Badge variant={problem.difficulty}>{diff.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAI(!showAI)}
            className={showAI ? "text-primary" : ""}
          >
            <Bot className="w-4 h-4" />
            AI
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-full lg:w-[45%] overflow-y-auto scrollbar-thin border-r border-border p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-wrap gap-2 mb-6">
              {problem.tags.map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 bg-card border border-border rounded-full text-muted">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted mb-6">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {problem.timeLimit}s
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5" /> {problem.memoryLimit} MB
              </span>
            </div>

            <div className="prose prose-invert prose-sm max-w-none mb-8">
              {problem.statement.split("\n").map((line, i) => (
                <p key={i} className="text-sm text-foreground/90 leading-relaxed mb-3"
                  dangerouslySetInnerHTML={{
                    __html: line.replace(/\*\*(.*?)\*\*/g, "<strong class='text-primary'>$1</strong>"),
                  }}
                />
              ))}
            </div>

            <h3 className="text-sm font-semibold mb-2">Input Format</h3>
            <pre className="text-sm font-mono text-muted mb-6 whitespace-pre-wrap glass rounded-lg p-4">{problem.inputFormat}</pre>

            <h3 className="text-sm font-semibold mb-2">Output Format</h3>
            <pre className="text-sm font-mono text-muted mb-6 whitespace-pre-wrap glass rounded-lg p-4">{problem.outputFormat}</pre>

            <h3 className="text-sm font-semibold mb-3">Examples</h3>
            {problem.examples.map((ex, i) => (
              <div key={i} className="mb-4 glass rounded-lg p-4">
                <p className="text-xs text-muted mb-2">Example {i + 1}</p>
                <pre className="text-sm font-mono text-foreground/80 mb-2 whitespace-pre-wrap">Input: {ex.input}</pre>
                <pre className="text-sm font-mono text-primary mb-2 whitespace-pre-wrap">Output: {ex.output}</pre>
                {ex.explanation && <p className="text-xs text-muted">{ex.explanation}</p>}
              </div>
            ))}

            <h3 className="text-sm font-semibold mb-3">Constraints</h3>
            <ul className="space-y-1 mb-6">
              {problem.constraints.map((c, i) => (
                <li key={i} className="text-sm text-muted font-mono">{c}</li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div className="hidden lg:flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
            <Select
              options={langOptions}
              value={language}
              onChange={handleLanguageChange}
              className="w-40"
            />
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleRun} disabled={running}>
                <Play className="w-4 h-4" />
                Run
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={running}>
                <Send className="w-4 h-4" />
                Submit
              </Button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className={`flex flex-col transition-all ${showAI ? "w-[60%]" : "w-full"}`}>
              <div className={`flex-1 min-h-0 ${showOutput ? "h-[60%]" : "h-full"}`}>
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  height="100%"
                />
              </div>

              <button
                onClick={() => setShowOutput(!showOutput)}
                className="flex items-center justify-center gap-1 py-1 border-t border-border bg-card text-xs text-muted hover:text-primary cursor-pointer shrink-0"
              >
                {showOutput ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                Output
              </button>

              {showOutput && (
                <div className="h-[40%] border-t border-border shrink-0">
                  <OutputConsole
                    output={output}
                    status={outputStatus}
                    runtime={runtime}
                    memory={memory}
                  />
                </div>
              )}
            </div>

            {showAI && (
              <div className="w-[40%] border-l border-border p-2">
                <AIPanel
                  messages={[]}
                  code={code}
                  language={language}
                  problemTitle={problem.title}
                  problemId={problem.id}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
