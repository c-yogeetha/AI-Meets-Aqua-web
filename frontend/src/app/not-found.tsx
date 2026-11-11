import React from "react";
import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-28 text-center">
      <div className="glass-card p-10 border-white/10">
        <div className="w-16 h-16 rounded-2xl bg-aqua/10 text-aqua flex items-center justify-center mx-auto mb-4">
          <Compass className="w-8 h-8" />
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">404 - Surface Lost</h1>
        <p className="text-sm text-foam/70 mb-6">
          The aquatic depths you are navigating do not contain this page.
        </p>
        <Link
          href="/"
          className="btn-gold px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Return to Surface</span>
        </Link>
      </div>
    </div>
  );
}
