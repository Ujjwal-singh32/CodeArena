"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  Eye,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bot,
  Code,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { submissionsApi } from "@/services/api";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import ReactMarkdown from "react-markdown";

export default function SubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal state
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [fetchingCode, setFetchingCode] = useState(false);
  const [modalTab, setModalTab] = useState("code");
  useSocket(user?.id, {
    "ai:review-ready": (payload) => {
      setSelectedSubmission((prev) => {
        // Ensure both IDs are compared as numbers to prevent mismatch failures
        if (prev && Number(prev.id) === Number(payload.submissionId)) {
          return { ...prev, aiReview: payload.review };
        }
        return prev;
      });
    },
  });
  useEffect(() => {
    submissionsApi
      .listMine(50) // Fetch up to 50 recent submissions
      .then((res) => setSubmissions(res.submissions || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleViewSubmission = async (id) => {
    setFetchingCode(true);
    setModalTab("code");
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
  const currentSubmissions = submissions.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

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
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {startIndex + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-foreground">
                      {Math.min(startIndex + itemsPerPage, submissions.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">
                      {submissions.length}
                    </span>{" "}
                    entries
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
              <div className="flex flex-col border-b border-emerald-400/20 bg-black/40">
                <div className="flex items-center justify-between px-7 py-5">
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
                    className="p-2.5 rounded-full border border-emerald-400/15 bg-black/40 text-gray-400 hover:text-emerald-300 hover:border-emerald-400/40 transition-all duration-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* NEW: Tabs UI */}
                <div className="flex px-7 gap-6 border-t border-emerald-400/10 pt-2">
                  <button
                    onClick={() => setModalTab("code")}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${modalTab === "code" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
                  >
                    <Code className="w-4 h-4" /> Source Code
                  </button>
                  <button
                    onClick={() => setModalTab("review")}
                    className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${modalTab === "review" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
                  >
                    <Bot className="w-4 h-4" /> AI Code Review
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                {fetchingCode ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-emerald-300 text-sm tracking-wide">
                      Decrypting submission...
                    </p>
                  </div>
                ) : modalTab === "code" ? (
                  <pre className="text-sm font-mono text-white bg-black/70 border border-emerald-500/25 rounded-2xl p-6 overflow-x-auto leading-7 shadow-[0_0_25px_rgba(34,197,94,0.08)]">
                    <code>{selectedSubmission.code}</code>
                  </pre>
                ) : (
                  /* NEW: AI Review Tab Content */
                  <div className="text-foreground/90 bg-black/70 border border-emerald-500/25 rounded-2xl p-6 shadow-[0_0_25px_rgba(34,197,94,0.08)]">
                    {selectedSubmission.aiReview ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-card p-4 rounded-xl border border-border">
                            <p className="text-xs text-muted mb-1 uppercase tracking-wider">
                              Time Complexity
                            </p>
                            <p className="font-mono text-primary text-lg">
                              {selectedSubmission.aiReview.timeComplexity}
                            </p>
                          </div>
                          <div className="bg-card p-4 rounded-xl border border-border">
                            <p className="text-xs text-muted mb-1 uppercase tracking-wider">
                              Space Complexity
                            </p>
                            <p className="font-mono text-primary text-lg">
                              {selectedSubmission.aiReview.spaceComplexity}
                            </p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold mb-3 text-emerald-300">
                            Optimization Tips
                          </h4>
                          {/* Green-tinted safe box for formatting */}
                          <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-emerald-50 bg-emerald-950/30 p-5 rounded-xl border border-emerald-500/20">
                            <ReactMarkdown>
                              {/* Fallback to JSON.stringify if the AI somehow bypasses the backend string check */}
                              {typeof selectedSubmission.aiReview
                                .optimizationTips === "string"
                                ? selectedSubmission.aiReview.optimizationTips
                                : JSON.stringify(
                                    selectedSubmission.aiReview
                                      .optimizationTips,
                                    null,
                                    2,
                                  )}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ) : selectedSubmission.status === "ACCEPTED" ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-emerald-300 text-sm tracking-wide">
                          AI report is being generated...
                        </p>
                        <p className="text-xs text-muted">
                          This usually takes about 5-10 seconds. It will appear
                          here automatically.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                        <Bot className="w-10 h-10 text-muted/50" />
                        <p className="text-muted">
                          AI Reviews are only generated for{" "}
                          <span className="text-primary font-medium">
                            ACCEPTED
                          </span>{" "}
                          submissions.
                        </p>
                        <p className="text-xs text-muted/70">
                          Solve the problem first to get feedback!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
