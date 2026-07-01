import Link from "next/link";
import { Code2, Github, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Code2 className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold">
                <span className="text-foreground">Code</span>
                <span className="text-primary">Arena</span>
              </span>
            </div>
            <p className="text-muted text-sm max-w-sm">
              Practice DSA, compete in 1v1 duels, and code together in real time.
              Built for competitive programmers who want to level up.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/practice" className="hover:text-primary transition-colors">Problems</Link></li>
              <li><Link href="/duel" className="hover:text-primary transition-colors">1v1 Duel</Link></li>
              <li><Link href="/collab" className="hover:text-primary transition-colors">Collab Editor</Link></li>
              <li><Link href="/contest" className="hover:text-primary transition-colors">Contests</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Account</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
              <li><Link href="/profile" className="hover:text-primary transition-colors">Profile</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors">Sign In</Link></li>
              <li><Link href="/register" className="hover:text-primary transition-colors">Register</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} CodeArena. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-muted hover:text-primary transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted hover:text-primary transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
