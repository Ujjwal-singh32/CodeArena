"use client";

import { motion } from "framer-motion";
import { Trophy, Clock, Users, Calendar } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { contests } from "@/lib/mockData";
import { formatDate } from "@/lib/utils";

export default function ContestPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary" />
          Contests
        </h1>
        <p className="text-muted">
          Join timed competitions, climb the live leaderboard, and test your skills under pressure.
        </p>
      </motion.div>

      <div className="grid gap-4">
        {contests.map((contest, i) => (
          <motion.div
            key={contest.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`${contest.status === "ACTIVE" ? "border-primary/30 glow-green-sm" : ""}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{contest.name}</h3>
                    <Badge variant={contest.status}>{contest.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(contest.startTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {contest.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {contest.problems} problems
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {contest.participants} registered
                    </span>
                  </div>
                </div>
                <div>
                  {contest.status === "UPCOMING" && (
                    <Button variant="outline">Register</Button>
                  )}
                  {contest.status === "ACTIVE" && (
                    <Button>Enter Contest</Button>
                  )}
                  {contest.status === "ENDED" && (
                    <Button variant="secondary">View Results</Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="mt-8 text-center py-8">
        <Trophy className="w-10 h-10 text-muted mx-auto mb-4 opacity-50" />
        <p className="text-muted text-sm">
          Contest features are optional and lower priority. Focus on Practice and 1v1 Duels first.
        </p>
      </Card>
    </div>
  );
}
