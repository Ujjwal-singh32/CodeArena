"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { problemDetail, languages, aiMessages } from "@/lib/mockData";
import { formatDifficulty } from "@/lib/utils";

export default function ProblemPage() {
  const params = useParams();
  const problem = problemDetail;
  const diff = formatDifficulty(problem.difficulty);

  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(problem.boilerplate.javascript);
  const [output, setOutput] = useState("");
  const [outputStatus, setOutputStatus] = useState("idle");
  const [showAI, setShowAI] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [running, setRunning] = useState(false);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    setCode(problem.boilerplate[lang] || "");
  };

  const handleRun = () => {
    setRunning(true);
    setOutputStatus("running");
    setOutput("Running against sample test cases...");
    setTimeout(() => {
      setOutput("[0, 1]\n\nAll sample test cases passed.");
      setOutputStatus("success");
      setRunning(false);
    }, 1500);
  };

  const handleSubmit = () => {
    setRunning(true);
    setOutputStatus("running");
    setOutput("Submitting to judge...");
    setTimeout(() => {
      setOutput("Verdict: Accepted\n\nPassed 15/15 test cases\nRuntime: 68 ms (beats 92%)\nMemory: 42.1 MB");
      setOutputStatus("success");
      setRunning(false);
    }, 2500);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 glass flex-shrink-0">
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
        {/* Left — Problem statement */}
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

            <h3 className="text-sm font-semibold mb-3">Examples</h3>
            {problem.examples.map((ex, i) => (
              <div key={i} className="mb-4 glass rounded-lg p-4">
                <p className="text-xs text-muted mb-2">Example {i + 1}</p>
                <pre className="text-sm font-mono text-foreground/80 mb-2">Input: {ex.input}</pre>
                <pre className="text-sm font-mono text-primary mb-2">Output: {ex.output}</pre>
                <p className="text-xs text-muted">{ex.explanation}</p>
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

        {/* Right — Editor */}
        <div className="hidden lg:flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
            <Select
              options={languages}
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
              <div className={`flex-1 ${showOutput ? "h-[60%]" : "h-full"}`}>
                <CodeEditor
                  value={code}
                  onChange={(val) => setCode(val || "")}
                  language={language}
                  height="100%"
                />
              </div>

              <button
                onClick={() => setShowOutput(!showOutput)}
                className="flex items-center justify-center gap-1 py-1 border-t border-border bg-card text-xs text-muted hover:text-primary cursor-pointer flex-shrink-0"
              >
                {showOutput ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                Output
              </button>

              {showOutput && (
                <div className="h-[40%] border-t border-border flex-shrink-0">
                  <OutputConsole
                    output={output}
                    status={outputStatus}
                    runtime={outputStatus === "success" ? "68 ms" : null}
                    memory={outputStatus === "success" ? "42.1 MB" : null}
                  />
                </div>
              )}
            </div>

            {showAI && (
              <div className="w-[40%] border-l border-border p-2">
                <AIPanel messages={aiMessages} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
