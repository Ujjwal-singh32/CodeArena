"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { formatDifficulty } from "@/lib/utils";

export default function ProblemRow({ problem, index }) {
  const diff = formatDifficulty(problem.difficulty);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/practice/${problem.slug}`}
        className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-card-hover border border-transparent hover:border-border transition-all group"
      >
        <div className="w-5 flex-shrink-0">
          {problem.solved ? (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          ) : (
            <Circle className="w-5 h-5 text-border group-hover:text-muted" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {problem.title}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          {problem.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs text-muted px-2 py-0.5 bg-card rounded">
              {tag}
            </span>
          ))}
        </div>

        <span className="hidden md:block text-xs text-muted w-16 text-right">
          {problem.acceptance}%
        </span>

        <Badge variant={problem.difficulty} className="w-16 justify-center">
          {diff.label}
        </Badge>
      </Link>
    </motion.div>
  );
}
