"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Github,
  Linkedin,
  ExternalLink,
  Calendar,
  Trophy,
  Code2,
  Swords,
  LogOut,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatRating, formatDate } from "@/lib/utils";
import { usersApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    usersApi
      .profile()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (authLoading || loading) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-muted">Loading profile...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-muted mb-4">Sign in to view your profile.</p>
        <Link href="/login" className="text-primary hover:underline">Sign In</Link>
      </div>
    );
  }

  const displayUser = data?.user || user;
  const rating = formatRating(displayUser.rating || 0);
  const recentSubmissions = data?.recentSubmissions || [];
  const duelHistory = data?.duelHistory || [];
  const leaderboard = data?.leaderboard || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <Card glow className="mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-3xl font-bold text-primary shrink-0">
              {(displayUser.username || "G")[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{displayUser.username}</h1>
              <p className="text-muted text-sm mb-3">{displayUser.bio || "No bio yet"}</p>
              <p className="text-xs text-muted mb-2">{displayUser.email}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className={`font-semibold ${rating.color}`}>
                  {displayUser.rating || 0} · {rating.tier}
                </span>
                <span className="text-muted flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDate(displayUser.joinDate || user.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-4">
                {displayUser.github && (
                  <a href={displayUser.github} target="_blank" rel="noreferrer" className="text-muted hover:text-primary">
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {displayUser.linkedin && (
                  <a href={displayUser.linkedin} target="_blank" rel="noreferrer" className="text-muted hover:text-primary">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {displayUser.leetcode && (
                  <a href={displayUser.leetcode} target="_blank" rel="noreferrer" className="text-muted hover:text-primary flex items-center gap-1 text-xs">
                    <ExternalLink className="w-4 h-4" /> LeetCode
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{displayUser.solvedCount || 0}</p>
                <p className="text-xs text-muted">Solved</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{displayUser.rating || 0}</p>
                <p className="text-xs text-muted">Rating</p>
              </div>
              <div>
                <p className="text-2xl font-bold">#{(displayUser.rank || 0).toLocaleString()}</p>
                <p className="text-xs text-muted">Rank</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-primary" />
                  Submission History
                </CardTitle>
              </CardHeader>
              {recentSubmissions.length > 0 ? (
                <div className="space-y-2">
                  {recentSubmissions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{sub.problem}</p>
                        <p className="text-xs text-muted">{sub.language} · {formatDate(sub.date)}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={sub.status}>{sub.status.replace(/_/g, " ")}</Badge>
                        {sub.runtime !== "—" && <p className="text-xs text-muted mt-1">{sub.runtime}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No submissions yet.</p>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-primary" />
                  Duel History
                </CardTitle>
              </CardHeader>
              {duelHistory.length > 0 ? (
                <div className="space-y-3">
                  {duelHistory.map((duel) => (
                    <div key={duel.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium">vs {duel.opponent}</p>
                        <p className="text-xs text-muted">{duel.topic}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={duel.result}>{duel.result}</Badge>
                        <p className={`text-xs mt-1 ${duel.result === "WIN" ? "text-primary" : "text-danger"}`}>
                          {duel.ratingChange}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No duels yet.</p>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center justify-between py-2 px-2 rounded-lg ${entry.isCurrentUser ? "bg-primary/5 border border-primary/20" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted w-5">#{entry.rank}</span>
                        <span className={`text-sm ${entry.isCurrentUser ? "text-primary font-medium" : ""}`}>
                          {entry.username}
                        </span>
                      </div>
                      <span className="text-sm font-mono">{entry.rating}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No leaderboard data.</p>
              )}
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
