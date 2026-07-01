"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Tabs from "@/components/ui/Tabs";
import ProblemRow from "@/components/common/ProblemRow";
import { problems } from "@/lib/mockData";

const difficultyTabs = [
  { id: "all", label: "All" },
  { id: "EASY", label: "Easy" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HARD", label: "Hard" },
];

const statusTabs = [
  { id: "all", label: "All" },
  { id: "solved", label: "Solved" },
  { id: "unsolved", label: "Unsolved" },
];

export default function PracticePage() {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("default");

  const filtered = useMemo(() => {
    let result = [...problems];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (difficulty !== "all") {
      result = result.filter((p) => p.difficulty === difficulty);
    }

    if (status === "solved") result = result.filter((p) => p.solved);
    if (status === "unsolved") result = result.filter((p) => !p.solved);

    if (sortBy === "acceptance") result.sort((a, b) => b.acceptance - a.acceptance);
    if (sortBy === "title") result.sort((a, b) => a.title.localeCompare(b.title));

    return result;
  }, [search, difficulty, status, sortBy]);

  const solvedCount = problems.filter((p) => p.solved).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Problems</h1>
        <p className="text-muted">
          {solvedCount} of {problems.length} problems solved
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems or tags..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
        </div>
        <Select
          options={[
            { value: "default", label: "Sort: Default" },
            { value: "acceptance", label: "Sort: Acceptance" },
            { value: "title", label: "Sort: Title" },
          ]}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full lg:w-48"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Tabs tabs={difficultyTabs} activeTab={difficulty} onChange={setDifficulty} />
        <Tabs tabs={statusTabs} activeTab={status} onChange={setStatus} />
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="hidden sm:flex items-center gap-4 px-4 py-3 border-b border-border text-xs text-muted font-medium uppercase tracking-wider">
          <div className="w-5" />
          <div className="flex-1">Title</div>
          <div className="w-32">Tags</div>
          <div className="w-16 text-right">Accept</div>
          <div className="w-16 text-center">Level</div>
        </div>

        <div className="divide-y divide-border/50">
          {filtered.length > 0 ? (
            filtered.map((problem, i) => (
              <ProblemRow key={problem.id} problem={problem} index={i} />
            ))
          ) : (
            <div className="py-16 text-center text-muted">
              <Filter className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No problems match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
