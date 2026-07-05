"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Swords,
  Plus,
  LogIn,
  Trophy,
  Loader2,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Tabs from "@/components/ui/Tabs";
import { useAuth } from "@/context/AuthContext";
import { formatRating, formatDifficulty } from "@/lib/utils";
import { duelApi, usersApi, problemsApi } from "@/services/api";
import { useSocket } from "@/hooks/useSocket";

const difficultyOptions = [
  { value: "", label: "All Difficulties" },
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const ratingOptions = [
  { value: "", label: "Any Rating" },
  { value: "0-1200", label: "Beginner (< 1200)" },
  { value: "1200-1600", label: "Intermediate (1200-1600)" },
  { value: "1600-2000", label: "Advanced (1600-2000)" },
  { value: "2000+", label: "Expert (2000+)" },
];

export default function DuelLobbyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const ITEMS_PER_PAGE = 4;
  const [tab, setTab] = useState("join");
  const [topicOptions, setTopicOptions] = useState([
    { value: "", label: "All Topics" },
  ]);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(null);
  const [isSearching, setIsSearching] = useState(false); // NEW: State for Auto-Matchmaking
  const [games, setGames] = useState([]);
  const [duelHistory, setDuelHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    topic: "",
    difficulty: "",
    rating: "",
    search: "",
  });
  const [createForm, setCreateForm] = useState({
    topic: "Arrays",
    difficulty: "MEDIUM",
    questionCount: "1",
    duration: "15",
    title: "",
  });

  const rating = formatRating(user?.rating || 1500);

  useEffect(() => {
    if (user) {
      usersApi
        .dashboard()
        .then((data) => setDuelHistory(data.duelHistory || []))
        .catch(() => setDuelHistory([]));
    }
  }, [user]);

  useEffect(() => {
    problemsApi
      .getTopics()
      .then((res) => {
        if (res.topics) {
          const dbTopics = res.topics.map((t) => ({ value: t, label: t }));
          setTopicOptions([{ value: "", label: "All Topics" }, ...dbTopics]);
        }
      })
      .catch(console.error);
  }, []);
  useEffect(() => {
    duelApi
      .list(filters)
      .then((res) => {
        if (res.matches?.length) setGames(res.matches);
      })
      .catch(() => {});
  }, [filters]);
  // app/duel/page.js

  // Find your TWO existing useSocket calls and REPLACE them with this SINGLE call:
  useSocket(user?.id, {
    "duel:match-created": (newMatch) => {
      setGames((prevGames) => {
        // Prevent duplicates
        if (prevGames.find((g) => g.id === newMatch.id)) return prevGames;
        return [newMatch, ...prevGames];
      });
    },
    "duel:match-found": (payload) => {
      setIsSearching(false);
      router.push(`/duel/room/${payload.matchId}`);
    },
  });
  const filteredGames = games.filter((g) => {
    if (filters.topic && g.topic !== filters.topic) return false;
    if (filters.difficulty && g.difficulty !== filters.difficulty) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !g.title?.toLowerCase().includes(q) &&
        !g.creator?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (filters.rating) {
      const r = g.creatorRating || 1500;
      if (filters.rating === "0-1200" && r >= 1200) return false;
      if (filters.rating === "1200-1600" && (r < 1200 || r >= 1600))
        return false;
      if (filters.rating === "1600-2000" && (r < 1600 || r >= 2000))
        return false;
      if (filters.rating === "2000+" && r < 2000) return false;
    }
    return true;
  });
  const sortedGames = [...filteredGames].sort((a, b) => {
    const statusOrder = { WAITING: 1, RUNNING: 2, FINISHED: 3, CLOSED: 4 };
    return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
  });
  const totalPages = Math.ceil(sortedGames.length / ITEMS_PER_PAGE);
  const currentGames = sortedGames.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  // NEW: The Auto-Matchmaking Handler
  const handleFindOpponent = async () => {
    if (isSearching) {
      setIsSearching(false);
      try {
        await duelApi.cancelFindMatch();
      } catch (error) {
        console.error("Failed to cancel search:", error);
      }
      return;
    }
    setIsSearching(true);
    try {
      const res = await duelApi.findMatch(); // Ensure you added this to services/api.js
      if (res.match?.status === "matched") {
        router.push(`/duel/room/${res.match.matchId}`);
      }
    } catch (error) {
      console.error("Failed to find match:", error);
      setIsSearching(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await duelApi.create(createForm);
      router.push(`/duel/room/${res.match.id}`);
    } catch {
      alert(error.message || "Failed to create room. Please try again.");
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (gameId) => {
    setJoining(gameId);
    try {
      await duelApi.join(gameId);
      router.push(`/duel/room/${gameId}`);
    } catch (error) {
      alert(error.message || "Failed to join room.");
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Swords className="w-8 h-8 text-primary" />
          1v1 Coding Duel
        </h1>
        <p className="text-muted">
          Find a random opponent, create a game, or join an open room. First to
          solve wins!
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* NEW: Massive Find Opponent Button */}
          <Card glow className="p-6 text-center border-primary/30">
            <h2 className="text-xl font-bold mb-4">Quick Match</h2>
            <Button
              size="lg"
              className={`w-full sm:w-2/3 mx-auto text-lg py-6 transition-all ${
                isSearching
                  ? "bg-danger/20 text-danger border-danger/50 hover:bg-danger/30"
                  : ""
              }`}
              onClick={handleFindOpponent}
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Cancel
                  Search...
                </>
              ) : (
                <>
                  <Swords className="w-6 h-6 mr-2" /> Find Opponent
                </>
              )}
            </Button>
          </Card>

          <Tabs
            tabs={[
              { id: "join", label: "Custom Lobbies" },
              { id: "create", label: "Create Custom" },
            ]}
            activeTab={tab}
            onChange={setTab}
          />

          {tab === "create" && (
            <Card glow>
              <CardHeader>
                <CardTitle>Create a Custom Duel</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <Input
                  label="Game Title"
                  placeholder="e.g. Array Showdown"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                />
                <Select
                  label="Topic"
                  options={topicOptions.filter((o) => o.value)}
                  value={createForm.topic}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, topic: e.target.value })
                  }
                />
                <Select
                  label="Difficulty"
                  options={difficultyOptions.filter((o) => o.value)}
                  value={createForm.difficulty}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, difficulty: e.target.value })
                  }
                />
                <Select
                  label="Questions"
                  options={[
                    { value: "1", label: "1 Question" },
                    { value: "2", label: "2 Questions" },
                    { value: "3", label: "3 Questions" },
                  ]}
                  value={createForm.questionCount}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      questionCount: e.target.value,
                    })
                  }
                />
                <Select
                  label="Duration"
                  options={[
                    { value: "10", label: "10 minutes" },
                    { value: "15", label: "15 minutes" },
                    { value: "20", label: "20 minutes" },
                    { value: "30", label: "30 minutes" },
                  ]}
                  value={createForm.duration}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, duration: e.target.value })
                  }
                />
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />{" "}
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" /> Publish Game
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {tab === "join" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filter Custom Games
                  </CardTitle>
                </CardHeader>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    placeholder="Search by title or creator..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                  />
                  <Select
                    options={topicOptions}
                    value={filters.topic}
                    onChange={(e) =>
                      setFilters({ ...filters, topic: e.target.value })
                    }
                  />
                  <Select
                    options={difficultyOptions}
                    value={filters.difficulty}
                    onChange={(e) =>
                      setFilters({ ...filters, difficulty: e.target.value })
                    }
                  />
                  <Select
                    options={ratingOptions}
                    value={filters.rating}
                    onChange={(e) =>
                      setFilters({ ...filters, rating: e.target.value })
                    }
                  />
                </div>
              </Card>

              <div className="space-y-3">
                {filteredGames.length === 0 ? (
                  <Card className="text-center py-12 bg-primary/5 border-primary/30 shadow-[0_0_20px_rgba(0,255,136,0.15)]">
                    <h3 className="text-xl font-bold text-primary mb-2">
                      No active rooms found
                    </h3>
                    <p className="text-muted mb-6">
                      There are currently no rooms matching your specific
                      filters.
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => setTab("create")}
                    >
                      Be the first to create one
                    </Button>
                  </Card>
                ) : (
                  currentGames.map((game) => {
                    const diff = formatDifficulty(game.difficulty);

                    // 1. Accurate Status Logic
                    const playerCount = game.playerCount || 0;
                    const isFull = playerCount >= 2;
                    const isEmpty = playerCount === 0;
                    const isFinished = game.status === "FINISHED";
                    const isRunning = game.status === "RUNNING";
                    const isClosed = game.status === "CLOSED" || isEmpty;
                    const canJoin =
                      game.status === "WAITING" && !isFull && !isClosed;

                    // 2. Determine Button Text & Badge
                    let buttonText = "Join";
                    let badgeStatus = "ACTIVE";
                    let statusText = game.status;

                    if (joining === game.id) {
                      buttonText = "Joining...";
                    } else if (isFinished) {
                      buttonText = "Ended";
                      badgeStatus = "DEFAULT";
                    } else if (isClosed) {
                      buttonText = "Closed";
                      statusText = "CLOSED";
                      badgeStatus = "DISABLED";
                    } else if (isRunning || isFull) {
                      buttonText = "In Progress";
                      statusText = isRunning ? "RUNNING" : "FULL";
                      badgeStatus = "WARNING";
                    }

                    return (
                      <Card
                        key={game.id}
                        className="flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{game.title}</h3>
                            <Badge variant={game.difficulty}>
                              {diff.label}
                            </Badge>
                            <Badge variant={badgeStatus}>{statusText}</Badge>
                          </div>
                          <p className="text-xs text-muted">
                            by {game.creator} · Rating {game.creatorRating} ·{" "}
                            {game.topic} · {game.duration} min
                          </p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted">
                            <Users className="w-3 h-3" />
                            {playerCount}/2 players
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleJoin(game.id)}
                          disabled={!canJoin || joining === game.id}
                          variant={canJoin ? "primary" : "outline"}
                        >
                          {joining === game.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            buttonText
                          )}
                        </Button>
                      </Card>
                    );
                  })
                )}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 mt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Button>
                  <span className="text-sm text-muted">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Rating</CardTitle>
            </CardHeader>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-primary mb-1">
                {user?.rating || 1500}
              </p>
              <p className={`text-sm font-medium ${rating.color}`}>
                {rating.tier}
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Recent Duels
              </CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {duelHistory.length === 0 ? (
                <p className="text-sm text-muted text-center py-4">
                  No recent duels.
                </p>
              ) : (
                duelHistory.slice(0, 9).map((duel) => (
                  <div
                    key={duel.id}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">vs {duel.opponent}</p>
                      <p className="text-xs text-muted">
                        {duel.topic} · {duel.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={duel.result}>{duel.result}</Badge>
                      <p
                        className={`text-xs mt-1 ${duel.result === "WIN" ? "text-primary" : "text-danger"}`}
                      >
                        {duel.ratingChange}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
