"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, suffix, className }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn("glass rounded-xl p-5 hover:border-primary/30 transition-all", className)}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="text-sm text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">
        {value}
        {suffix && <span className="text-sm text-muted ml-1">{suffix}</span>}
      </p>
    </motion.div>
  );
}
