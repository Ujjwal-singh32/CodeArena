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
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Tabs from "@/components/ui/Tabs";
import { duelApi, usersApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { formatRating, formatDifficulty } from "@/lib/utils";

const topicOptions = [
  { value: "", label: "All Topics" },
  { value: "Arrays", label: "Arrays" },
  { value: "Graphs", label: "Graphs" },
  { value: "DP", label: "Dynamic Programming" },
  { value: "Strings", label: "Strings" },
];

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
  const [tab, setTab] = useState("join");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(null);
  const [isSearching, setIsSearching] = useState(false); // NEW: State for Auto-Matchmaking
  const [games, setGames] = useState([]);
  const [duelHistory, setDuelHistory] = useState([]);
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
    duelApi
      .list(filters)
      .then((res) => {
        if (res.matches?.length) setGames(res.matches);
      })
      .catch(() => { });
  }, [filters]);

  const filteredGames = games.filter((g) => {
    if (filters.topic && g.topic !== filters.topic) return false;
    if (filters.difficulty && g.difficulty !== filters.difficulty) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!g.title?.toLowerCase().includes(q) && !g.creator?.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filters.rating) {
      const r = g.creatorRating || 1500;
      if (filters.rating === "0-1200" && r >= 1200) return false;
      if (filters.rating === "1200-1600" && (r < 1200 || r >= 1600)) return false;
      if (filters.rating === "1600-2000" && (r < 1600 || r >= 2000)) return false;
      if (filters.rating === "2000+" && r < 2000) return false;
    }
    return true;
  });

  // NEW: The Auto-Matchmaking Handler
  const handleFindOpponent = async () => {
    setIsSearching(true);
    try {
      const res = await duelApi.findMatch(); // Ensure you added this to services/api.js
      router.push(`/duel/room/${res.match.id}`);
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
      const id = `game-${Date.now()}`;
      router.push(`/duel/room/${id}?creator=true`);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (gameId) => {
    setJoining(gameId);
    try {
      await duelApi.join(gameId);
      router.push(`/duel/room/${gameId}`);
    } catch {
      router.push(`/duel/room/${gameId}`);
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
          Find a random opponent, create a game, or join an open room. First to solve wins!
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* NEW: Massive Find Opponent Button */}
          <Card glow className="p-6 text-center border-primary/30">
            <h2 className="text-xl font-bold mb-4">Quick Match</h2>
            <Button
              size="lg"
              className="w-full sm:w-2/3 mx-auto text-lg py-6"
              onClick={handleFindOpponent}
              disabled={isSearching}
            >
              {isSearching ? (
                <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Searching for Opponent...</>
              ) : (
                <><Swords className="w-6 h-6 mr-2" /> Find Opponent</>
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
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                />
                <Select
                  label="Topic"
                  options={topicOptions.filter((o) => o.value)}
                  value={createForm.topic}
                  onChange={(e) => setCreateForm({ ...createForm, topic: e.target.value })}
                />
                <Select
                  label="Difficulty"
                  options={difficultyOptions.filter((o) => o.value)}
                  value={createForm.difficulty}
                  onChange={(e) => setCreateForm({ ...createForm, difficulty: e.target.value })}
                />
                <Select
                  label="Questions"
                  options={[
                    { value: "1", label: "1 Question" },
                    { value: "2", label: "2 Questions" },
                    { value: "3", label: "3 Questions" },
                  ]}
                  value={createForm.questionCount}
                  onChange={(e) => setCreateForm({ ...createForm, questionCount: e.target.value })}
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
                  onChange={(e) => setCreateForm({ ...createForm, duration: e.target.value })}
                />
                <Button className="w-full" onClick={handleCreate} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Publishing...
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
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                  <Select
                    options={topicOptions}
                    value={filters.topic}
                    onChange={(e) => setFilters({ ...filters, topic: e.target.value })}
                  />
                  <Select
                    options={difficultyOptions}
                    value={filters.difficulty}
                    onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                  />
                  <Select
                    options={ratingOptions}
                    value={filters.rating}
                    onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                  />
                </div>
              </Card>

              <div className="space-y-3">
                {filteredGames.length === 0 ? (
                  <Card className="text-center py-12">
                    <p className="text-muted">No open games match your filters.</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setTab("create")}>
                      Create a Game
                    </Button>
                  </Card>
                ) : (
                  filteredGames.map((game) => {
                    const diff = formatDifficulty(game.difficulty);

                    // Calculate accurate status
                    const isFull = (game.playerCount || game.participants?.length || 1) >= 2;
                    const isFinished = game.status === "FINISHED";
                    const isRunning = game.status === "RUNNING";
                    const canJoin = game.status === "WAITING" && !isFull;

                    // Determine the text to show inside the badge
                    let statusText = game.status;
                    if (game.status === "WAITING" && isFull) statusText = "FULL";

                    return (
                      <Card key={game.id} className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{game.title || `${game.topic} Duel`}</h3>
                            <Badge variant={game.difficulty}>{diff.label}</Badge>
                            {/* NEW: Status Badge */}
                            <Badge variant={canJoin ? "ACTIVE" : "DISABLED"}>
                              {statusText}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted">
                            by {game.creator} · Rating {game.creatorRating} · {game.topic} · {game.duration} min
                          </p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted">
                            <Users className="w-3 h-3" />
                            {game.playerCount || 1}/2 players
                          </div>
                        </div>

                        {/* UPDATED: Dynamic Button Status */}
                        <Button
                          size="sm"
                          onClick={() => handleJoin(game.id)}
                          disabled={joining === game.id || !canJoin}
                        >
                          {joining === game.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isFinished ? (
                            "Ended"
                          ) : isRunning || isFull ? (
                            "In Progress"
                          ) : (
                            "Join"
                          )}
                        </Button>
                      </Card>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Rating</CardTitle>
            </CardHeader>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-primary mb-1">{user?.rating || 1500}</p>
              <p className={`text-sm font-medium ${rating.color}`}>{rating.tier}</p>
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
                <p className="text-sm text-muted text-center py-4">No recent duels.</p>
              ) : (
                duelHistory.map((duel) => (
                  <div key={duel.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">vs {duel.opponent}</p>
                      <p className="text-xs text-muted">{duel.topic} · {duel.date}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={duel.result}>{duel.result}</Badge>
                      <p className={`text-xs mt-1 ${duel.result === "WIN" ? "text-primary" : "text-danger"}`}>
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