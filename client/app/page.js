"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Code2,
  Swords,
  Users,
  Sparkles,
  ArrowRight,
  Zap,
  Shield,
  Brain,
} from "lucide-react";
import Button from "@/components/ui/Button";
import StatCard from "@/components/common/StatCard";
import { usersApi } from "@/services/api";

const features = [
  {
    icon: Code2,
    title: "Practice DSA",
    description:
      "800+ curated problems with Monaco editor, instant run, full judge pipeline, and AI-powered code review.",
    href: "/practice",
    color: "text-primary",
  },
  {
    icon: Swords,
    title: "1v1 Coding Duel",
    description:
      "Match with live opponents, configure topics together, race against the clock. ELO rating system tracks your progress.",
    href: "/duel",
    color: "text-warning",
  },
  {
    icon: Users,
    title: "Live Collab Editor",
    description:
      "Create a room, invite up to 5 friends, and code together in real time with visible cursors — like Google Docs for code.",
    href: "/collab",
    color: "text-blue-400",
  },
  {
    icon: Brain,
    title: "AI Assistant",
    description:
      "Get hints without spoilers, fix syntax errors, and receive post-submission complexity analysis automatically.",
    href: "/practice",
    color: "text-purple-400",
  },
];

const highlights = [
  { icon: Zap, text: "Custom Docker sandbox execution engine" },
  { icon: Shield, text: "Production-grade security & rate limiting" },
  { icon: Sparkles, text: "Real-time verdicts via Socket.IO" },
];

export default function HomePage() {
  const [stats, setStats] = useState({
    problems: 0,
    users: 0,
    submissions: 0,
    duels: 0,
  });

  useEffect(() => {
    usersApi
      .stats()
      .then((res) => setStats(res.stats || { problems: 0, users: 0, submissions: 0, duels: 0 }))
      .catch(() => {});
  }, []);

  return (
    <div className="grid-bg">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm mb-8">
              <Sparkles className="w-4 h-4" />
              Competitive Programming, Reimagined
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6">
              Code. Compete.{" "}
              <span className="gradient-text text-glow">Conquer.</span>
            </h1>

            <p className="text-lg text-muted max-w-2xl mx-auto mb-10">
              Practice data structures & algorithms with AI assistance, battle
              opponents in live 1v1 duels, and collaborate with friends — all in
              one platform built like HackerRank, powered like a real system.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/practice">
                <Button size="lg" className="min-w-[180px]">
                  Start Practicing
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/duel">
                <Button variant="secondary" size="lg" className="min-w-[180px]">
                  <Swords className="w-5 h-5" />
                  Find a Duel
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-20"
          >
            <StatCard icon={Code2} label="Problems" value={stats.problems.toLocaleString()} />
            <StatCard icon={Users} label="Users" value={stats.users.toLocaleString()} />
            <StatCard icon={Swords} label="Duels" value={stats.duels.toLocaleString()} />
            <StatCard icon={Zap} label="Submissions" value={stats.submissions.toLocaleString()} />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Everything you need to <span className="text-primary">level up</span>
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              Three core features designed for serious competitive programmers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link href={feature.href}>
                    <div className="glass rounded-xl p-6 h-full hover:border-primary/30 transition-all group cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:glow-green-sm transition-all">
                          <Icon className={`w-6 h-6 ${feature.color}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-muted leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tech highlights */}
      <section className="py-20 border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass rounded-2xl p-8 lg:p-12 glow-green">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">
                  Built with <span className="text-primary">real system design</span>
                </h2>
                <p className="text-muted mb-8 leading-relaxed">
                  Not a tutorial project. CodeArena uses custom Docker sandboxing,
                  BullMQ job queues, Kafka event streaming, Redis caching, and
                  Socket.IO for real-time features — the same patterns used in
                  production systems.
                </p>
                <ul className="space-y-3">
                  {highlights.map((h) => {
                    const Icon = h.icon;
                    return (
                      <li key={h.text} className="flex items-center gap-3 text-sm">
                        <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-foreground">{h.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="font-mono text-sm bg-background rounded-xl p-6 border border-border overflow-hidden">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                  <div className="w-3 h-3 rounded-full bg-danger/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-primary/60" />
                  <span className="text-xs text-muted ml-2">execution pipeline</span>
                </div>
                <pre className="text-muted leading-relaxed">
{`POST /api/v1/execute
  → BullMQ queue
  → Docker sandbox
  → Verdict + metrics
  → Kafka event
  → Socket.IO push
  → AI code review`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to enter the arena?</h2>
          <p className="text-muted mb-8">
            Join thousands of competitive programmers sharpening their skills every day.
          </p>
          <Link href="/register">
            <Button size="lg">
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
