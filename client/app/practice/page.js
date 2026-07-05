"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import ProblemRow from "@/components/common/ProblemRow";
import { problemsApi } from "@/services/api";
import { useDebounce } from "@/hooks/useDebounce";

const ITEMS_PER_PAGE = 8;

export default function PracticePage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500); // 500ms delay
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProblems, setTotalProblems] = useState(0);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Fetch from Backend using Debounced Search
  useEffect(() => {
    setLoading(true);
    
    // Build query parameters for the API
    const params = {
      limit: ITEMS_PER_PAGE,
      page: currentPage,
      ...(debouncedSearch && { search: debouncedSearch }),
    };

    problemsApi
      .list(params)
      .then((res) => {
        setProblems(res.problems || []);
        setTotalProblems(res.total || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [debouncedSearch, currentPage]);

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
      </div>

      <div className="glass rounded-xl overflow-hidden mt-4">
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
          ) : problems.length > 0 ? (
            problems.map((problem, i) => (
              <ProblemRow
                key={problem.id}
                problem={problem}
                index={(currentPage - 1) * ITEMS_PER_PAGE + i}
              />
            ))
          ) : (
            <div className="py-16 text-center text-muted">
              <Filter className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No problems match your search.</p>
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