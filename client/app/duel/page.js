"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Swords,
  Users,
  Trophy,
  Clock,
  Zap,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { duelHistory, currentUser } from "@/lib/mockData";
import { formatRating } from "@/lib/utils";

export default function DuelLobbyPage() {
  const [searching, setSearching] = useState(false);
  const rating = formatRating(currentUser.rating);

  const handleFindOpponent = () => {
    setSearching(true);
    setTimeout(() => {
      window.location.href = "/duel/room/demo-match";
    }, 3000);
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
          Match with a live opponent, configure the challenge together, and race to solve first.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main duel card */}
        <div className="lg:col-span-2">
          <Card glow className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative text-center py-12">
              {searching ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="w-20 h-20 mx-auto rounded-full border-2 border-primary/30 flex items-center justify-center animate-pulse-glow">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Finding Opponent...</h2>
                    <p className="text-sm text-muted">Searching matchmaking queue</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => setSearching(false)}>
                    Cancel Search
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center glow-green-sm">
                    <Swords className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Ready to Battle?</h2>
                    <p className="text-muted max-w-md mx-auto">
                      You&apos;ll be matched with another player searching for a duel.
                      Configure topic & difficulty together, then race against the clock.
                    </p>
                  </div>
                  <Button size="lg" onClick={handleFindOpponent} className="min-w-[200px]">
                    <Zap className="w-5 h-5" />
                    Find Opponent
                  </Button>
                </motion.div>
              )}
            </div>
          </Card>

          {/* How it works */}
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Match", desc: "Get paired with a live opponent via matchmaking queue" },
              { step: "2", title: "Configure", desc: "Both players agree on topic, difficulty, and time limit" },
              { step: "3", title: "Compete", desc: "Code independently — first correct submission wins" },
            ].map((item) => (
              <div key={item.step} className="glass rounded-xl p-4 text-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                <p className="text-xs text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Rating</CardTitle>
            </CardHeader>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-primary mb-1">{currentUser.rating}</p>
              <p className={`text-sm font-medium ${rating.color}`}>{rating.tier}</p>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Duels</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {duelHistory.map((duel) => (
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
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
