"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import Select from "@/components/ui/Select";
import Tabs from "@/components/ui/Tabs";
import Button from "@/components/ui/Button";
import ProblemRow from "@/components/common/ProblemRow";
import { problemsApi } from "@/services/api";
import { useDebounce } from "@/hooks/useDebounce"; // Import the debounce hook

const difficultyTabs = [
  { id: "all", label: "All" },
  { id: "EASY", label: "Easy" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HARD", label: "Hard" },
];

const ITEMS_PER_PAGE = 8;

export default function PracticePage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search and Filter States
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500); // 500ms delay
  const [difficulty, setDifficulty] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProblems, setTotalProblems] = useState(0);

  // Reset to page 1 when search or difficulty changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, difficulty]);

  // Fetch from Backend using Debounced Search
  useEffect(() => {
    setLoading(true);
    
    // Build query parameters for the API
    const params = {
      limit: ITEMS_PER_PAGE,
      page: currentPage,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(difficulty !== "all" && { difficulty }),
    };

    problemsApi
      .list(params)
      .then((res) => {
        setProblems(res.problems || []);
        setTotalProblems(res.total || 0); // Assuming your backend returns total count
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [debouncedSearch, difficulty, currentPage]);

  // Client-side sorting for the current page of results
  const sortedProblems = useMemo(() => {
    let result = [...problems];
    if (sortBy === "acceptance") {
      result.sort((a, b) => b.acceptance - a.acceptance);
    }
    if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }
    return result;
  }, [problems, sortBy]);

  const totalPages = Math.max(1, Math.ceil(totalProblems / ITEMS_PER_PAGE));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Problems</h1>
        <p className="text-muted">
          {loading
            ? "Searching problems..."
            : `${totalProblems} problems available`}
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
        <Tabs
          tabs={difficultyTabs}
          activeTab={difficulty}
          onChange={setDifficulty}
        />
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
          {loading ? (
            <div className="py-16 text-center text-muted">Loading...</div>
          ) : error ? (
            <div className="py-16 text-center text-danger">{error}</div>
          ) : sortedProblems.length > 0 ? (
            sortedProblems.map((problem, i) => (
              <ProblemRow
                key={problem.id}
                problem={problem}
                index={(currentPage - 1) * ITEMS_PER_PAGE + i}
              />
            ))
          ) : (
            <div className="py-16 text-center text-muted">
              <Filter className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No problems match your filters.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/50">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || loading}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <span className="text-sm font-medium text-muted">
              Page <span className="text-foreground">{currentPage}</span> of{" "}
              {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || loading}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}