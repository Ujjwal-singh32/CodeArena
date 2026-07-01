"use client";

import { motion } from "framer-motion";
import {
  Github,
  Linkedin,
  ExternalLink,
  Calendar,
  Trophy,
  Code2,
  Swords,
} from "lucide-react";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  currentUser,
  recentSubmissions,
  duelHistory,
  leaderboard,
} from "@/lib/mockData";
import { formatRating, formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const rating = formatRating(currentUser.rating);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Profile header */}
        <Card glow className="mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-3xl font-bold text-primary flex-shrink-0">
              {currentUser.username[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{currentUser.username}</h1>
              <p className="text-muted text-sm mb-3">{currentUser.bio}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className={`font-semibold ${rating.color}`}>
                  {currentUser.rating} · {rating.tier}
                </span>
                <span className="text-muted flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDate(currentUser.joinDate)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-4">
                {currentUser.github && (
                  <a href="#" className="text-muted hover:text-primary transition-colors">
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {currentUser.linkedin && (
                  <a href="#" className="text-muted hover:text-primary transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {currentUser.leetcode && (
                  <a href="#" className="text-muted hover:text-primary transition-colors flex items-center gap-1 text-xs">
                    <ExternalLink className="w-4 h-4" /> LeetCode
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{currentUser.solvedCount}</p>
                <p className="text-xs text-muted">Solved</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{currentUser.rating}</p>
                <p className="text-xs text-muted">Rating</p>
              </div>
              <div>
                <p className="text-2xl font-bold">#{currentUser.rank.toLocaleString()}</p>
                <p className="text-xs text-muted">Rank</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Submissions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-primary" />
                  Submission History
                </CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {recentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{sub.problem}</p>
                      <p className="text-xs text-muted">{sub.language} · {formatDate(sub.date)}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={sub.status}>
                        {sub.status.replace(/_/g, " ")}
                      </Badge>
                      {sub.runtime !== "—" && (
                        <p className="text-xs text-muted mt-1">{sub.runtime}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-primary" />
                  Duel History
                </CardTitle>
              </CardHeader>
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
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
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
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
