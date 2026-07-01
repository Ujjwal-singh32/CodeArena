"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import Card from "@/components/ui/Card";

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
          Contest feature is optional and coming soon. Focus on Practice and 1v1 Duels for now.
        </p>
      </motion.div>

      <Card className="py-16 text-center">
        <Trophy className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
        <p className="text-muted">No active contests at the moment.</p>
      </Card>
    </div>
  );
}
