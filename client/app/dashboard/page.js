"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Code2,
  Swords,
  Flame,
  TrendingUp,
  Trophy,
  ArrowRight,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/common/StatCard";
import {
  currentUser,
  recentSubmissions,
  topicProgress,
  duelHistory,
  heatmapData,
} from "@/lib/mockData";
import { formatRating, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const rating = formatRating(currentUser.rating);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-muted">Welcome back, {currentUser.username}</p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Code2} label="Solved" value={currentUser.solvedCount} />
        <StatCard icon={TrendingUp} label="Rating" value={currentUser.rating} suffix={rating.tier} />
        <StatCard icon={Flame} label="Streak" value={currentUser.streak} suffix="days" />
        <StatCard icon={Trophy} label="Global Rank" value={`#${currentUser.rank.toLocaleString()}`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-[3px]">
              {heatmapData.slice(-90).map((day, i) => (
                <div
                  key={i}
                  className="w-[12px] h-[12px] rounded-sm"
                  style={{
                    backgroundColor:
                      day.count === 0
                        ? "#1a1a1a"
                        : day.count === 1
                        ? "rgba(0,255,136,0.2)"
                        : day.count === 2
                        ? "rgba(0,255,136,0.4)"
                        : day.count === 3
                        ? "rgba(0,255,136,0.6)"
                        : "rgba(0,255,136,0.9)",
                  }}
                  title={`${day.count} submissions`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className="w-[12px] h-[12px] rounded-sm"
                  style={{
                    backgroundColor:
                      level === 0
                        ? "#1a1a1a"
                        : `rgba(0,255,136,${level * 0.25})`,
                  }}
                />
              ))}
              <span>More</span>
            </div>
          </Card>

          {/* Recent submissions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Submissions</CardTitle>
                <Link href="/profile" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted border-b border-border">
                    <th className="text-left py-2 font-medium">Problem</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-left py-2 font-medium hidden sm:table-cell">Language</th>
                    <th className="text-right py-2 font-medium hidden sm:table-cell">Runtime</th>
                    <th className="text-right py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.map((sub) => (
                    <tr key={sub.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 font-medium">{sub.problem}</td>
                      <td className="py-2.5">
                        <Badge variant={sub.status}>
                          {sub.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted hidden sm:table-cell">{sub.language}</td>
                      <td className="py-2.5 text-right text-muted hidden sm:table-cell">{sub.runtime}</td>
                      <td className="py-2.5 text-right text-muted text-xs">{formatDate(sub.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card glow>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <Link href="/practice">
                <Button variant="secondary" className="w-full justify-start">
                  <Code2 className="w-4 h-4" /> Solve a Problem
                </Button>
              </Link>
              <Link href="/duel">
                <Button variant="secondary" className="w-full justify-start">
                  <Swords className="w-4 h-4" /> Start a Duel
                </Button>
              </Link>
            </div>
          </Card>

          {/* Topic progress */}
          <Card>
            <CardHeader>
              <CardTitle>Topic Progress</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {topicProgress.map((topic) => (
                <div key={topic.topic}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span>{topic.topic}</span>
                    <span className="text-muted text-xs">
                      {topic.solved}/{topic.total}
                    </span>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent duels */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Duels</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {duelHistory.slice(0, 3).map((duel) => (
                <div key={duel.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">vs {duel.opponent}</p>
                    <p className="text-xs text-muted">{duel.date}</p>
                  </div>
                  <Badge variant={duel.result}>{duel.ratingChange}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
