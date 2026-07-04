"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Eye, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { submissionsApi } from "@/services/api";
import { formatDate } from "@/lib/utils";

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [fetchingCode, setFetchingCode] = useState(false);

  useEffect(() => {
    submissionsApi
      .listMine(50) // Fetch up to 50 recent submissions
      .then((res) => setSubmissions(res.submissions || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleViewSubmission = async (id) => {
    setFetchingCode(true);
    setSelectedSubmission({ id, code: null }); // Open modal immediately with loading state

    try {
      const res = await submissionsApi.get(id);
      setSelectedSubmission(res.submission);
    } catch (err) {
      console.error("Failed to load submission", err);
      setSelectedSubmission(null);
    } finally {
      setFetchingCode(false);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(submissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSubmissions = submissions.slice(startIndex, startIndex + itemsPerPage);

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
          <Code2 className="w-8 h-8 text-primary" />
          Submission History
        </h1>
        <p className="text-muted">
          Review all your past problem-solving attempts
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
        </CardHeader>
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : submissions.length > 0 ? (
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Problem</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">
                      Language
                    </th>
                    <th className="text-right py-3 px-4 font-medium hidden sm:table-cell">
                      Runtime
                    </th>
                    <th className="text-right py-3 px-4 font-medium">Date</th>
                    <th className="text-right py-3 px-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSubmissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-border/50 last:border-0 hover:bg-card-hover transition-colors"
                    >
                      <td className="py-4 px-4 font-medium">{sub.problem}</td>
                      <td className="py-4 px-4">
                        <Badge variant={sub.status}>
                          {sub.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-muted hidden sm:table-cell">
                        {sub.language}
                      </td>
                      <td className="py-4 px-4 text-right text-muted hidden sm:table-cell">
                        {sub.runtime}
                      </td>
                      <td className="py-4 px-4 text-right text-muted text-xs">
                        {formatDate(sub.date)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-primary border-primary/30 hover:bg-primary/20"
                          onClick={() => handleViewSubmission(sub.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-border/50 sm:px-6 bg-card/50">
                <div className="hidden sm:block">
                  <p className="text-sm text-muted">
                    Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to{" "}
                    <span className="font-medium text-foreground">
                      {Math.min(startIndex + itemsPerPage, submissions.length)}
                    </span>{" "}
                    of <span className="font-medium text-foreground">{submissions.length}</span> entries
                  </p>
                </div>
                <div className="flex flex-1 justify-between sm:justify-end gap-2">
                  <Button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted py-8 text-center">
            You haven't made any submissions yet.
          </p>
        )}
      </Card>

      {/* Glassy Green Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSubmission(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="
                relative w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-3xl
                border border-emerald-400/25 bg-black/55 backdrop-blur-3xl
                shadow-[0_0_60px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/10
                flex flex-col
              "
            >
              <div className="flex items-center justify-between px-7 py-5 border-b border-emerald-400/20 bg-black/20 backdrop-blur-xl">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {selectedSubmission.problem?.title || "Loading..."}
                  </h3>
                  {selectedSubmission.language && (
                    <span className="text-xs font-mono text-emerald-300 border border-emerald-400/25 bg-emerald-500/5 px-3 py-1 rounded-full tracking-wide">
                      {selectedSubmission.language}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2.5 rounded-full border border-emerald-400/15 bg-black/40 text-gray-400 hover:text-emerald-300 hover:border-emerald-400/40 hover:bg-emerald-500/10 transition-all duration-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {fetchingCode ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-emerald-300 text-sm tracking-wide">
                      Decrypting submission...
                    </p>
                  </div>
                ) : (
                  <pre className="text-sm font-mono text-white bg-black/70 border border-emerald-500/25 rounded-2xl p-6 overflow-x-auto leading-7 shadow-[0_0_25px_rgba(34,197,94,0.08)]">
                    <code>{selectedSubmission.code}</code>
                  </pre>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}