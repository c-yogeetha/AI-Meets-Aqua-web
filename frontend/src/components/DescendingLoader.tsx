"use client";

import React, { useState, useEffect } from "react";
import { Fish } from "lucide-react";

export default function DescendingLoader() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Check sessionStorage
    const visited =
      sessionStorage.getItem("matsya_visited") ||
      sessionStorage.getItem("aqua_visited");
    if (visited) {
      return;
    }

    setVisible(true);

    const startTime = Date.now();
    const duration = 1600; // 1.6s

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(timer);
        sessionStorage.setItem("matsya_visited", "true");
        sessionStorage.setItem("aqua_visited", "true");
        setTimeout(() => {
          setVisible(false);
        }, 300);
      }
    }, 30);

    return () => clearInterval(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      data-testid="loader"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-abyss text-ink transition-opacity duration-500 select-none"
    >
      <div className="relative flex flex-col items-center">
        {/* Glowing Logo */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-gold to-aqua p-0.5 shadow-aqua-glow mb-6 animate-pulse">
          <div className="w-full h-full bg-abyss rounded-[14px] flex items-center justify-center">
            <Fish className="w-10 h-10 text-aqua" />
          </div>
        </div>

        {/* Brand */}
        <h2 className="font-display font-bold text-2xl text-white tracking-tight mb-2">
          Matsya
        </h2>
        <div className="text-xs uppercase tracking-widest text-aqua/80 font-semibold mb-6 flex items-center gap-1.5">
          <span>Descending...</span>
          <span className="font-mono text-gold">{progress}%</span>
        </div>

        {/* Rising Water Level Bar */}
        <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-gold via-aqua to-foam transition-all duration-75 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
