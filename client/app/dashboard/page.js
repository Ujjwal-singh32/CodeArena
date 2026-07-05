"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Code2,
  Swords,
  Flame,
  TrendingUp,
  Trophy,
  ArrowRight,
  LogOut,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/common/StatCard";
import { formatRating, formatDate } from "@/lib/utils";
import { usersApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
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
      .dashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-muted">
        Loading dashboard...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-muted mb-4">Sign in to view your dashboard.</p>
        <Link href="/login" className="text-primary hover:underline">
          Sign In
        </Link>
      </div>
    );
  }

  const displayUser = data?.user || user;
  const rating = formatRating(displayUser.rating || 0);
  const recentSubmissions = data?.recentSubmissions || [];
  const duelHistory = data?.duelHistory || [];
  const heatmapData = data?.heatmapData || [];
  const topicProgress = data?.topicProgress || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-start justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted">Welcome back, {displayUser.username}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Code2}
          label="Solved"
          value={displayUser.solvedCount || 0}
        />
        <StatCard
          icon={TrendingUp}
          label="Rating"
          value={displayUser.rating || 0}
          suffix={rating.tier}
        />
        <StatCard icon={Flame} label="Streak" value={displayUser.streak || 0} suffix="days" />
        <StatCard
          icon={Trophy}
          label="Global Rank"
          value={`#${(displayUser.rank || 0).toLocaleString()}`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            {heatmapData.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-0.75">
                  {heatmapData.slice(-90).map((day, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-sm"
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
              </>
            ) : (
              <p className="text-sm text-muted">No submission activity yet.</p>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Submissions</CardTitle>
                <Link
                  href="/submissions"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            {recentSubmissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted border-b border-border">
                      <th className="text-left py-2 font-medium">Problem</th>
                      <th className="text-left py-2 font-medium">Status</th>
                      <th className="text-left py-2 font-medium hidden sm:table-cell">
                        Language
                      </th>
                      <th className="text-right py-2 font-medium hidden sm:table-cell">
                        Runtime
                      </th>
                      <th className="text-right py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubmissions.map((sub) => (
                      <tr
                        key={sub.id}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2.5 font-medium">{sub.problem}</td>
                        <td className="py-2.5">
                          <Badge variant={sub.status}>
                            {sub.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-muted hidden sm:table-cell">
                          {sub.language}
                        </td>
                        <td className="py-2.5 text-right text-muted hidden sm:table-cell">
                          {sub.runtime}
                        </td>
                        <td className="py-2.5 text-right text-muted text-xs">
                          {formatDate(sub.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">
                No submissions yet.{" "}
                <Link href="/practice" className="text-primary">
                  Start solving
                </Link>
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
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

          <Card>
            <CardHeader>
              <CardTitle>Topic Progress</CardTitle>
            </CardHeader>
            {topicProgress.length > 0 ? (
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
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${topic.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                Solve problems to track topic progress.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Duels</CardTitle>
            </CardHeader>
            {duelHistory.length > 0 ? (
              <div className="space-y-3">
                {duelHistory.slice(0, 3).map((duel) => (
                  <div
                    key={duel.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm">vs {duel.opponent}</p>
                      <p className="text-xs text-muted">
                        {formatDate(duel.date)}
                      </p>
                    </div>
                    <Badge variant={duel.result}>{duel.ratingChange}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No duels yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
