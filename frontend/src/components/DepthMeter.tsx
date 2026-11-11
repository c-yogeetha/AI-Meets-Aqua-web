"use client";

import React, { useState, useEffect } from "react";

export default function DepthMeter() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const pct = Math.min(1, Math.max(0, window.scrollY / scrollHeight));
        setScrollProgress(pct);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Depth in meters: 0m at top, 10m at bottom
  const depthM = (scrollProgress * 10).toFixed(1);

  return (
    <div
      data-testid="depth-meter"
      aria-hidden="true"
      className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-2 select-none pointer-events-none"
    >
      <div className="text-[10px] font-mono font-semibold text-aqua/80">0m</div>

      {/* Meter track */}
      <div className="w-1.5 h-48 bg-white/10 rounded-full relative overflow-visible">
        {/* Fill */}
        <div
          className="w-full bg-gradient-to-b from-aqua to-gold rounded-full transition-all duration-100"
          style={{ height: `${scrollProgress * 100}%` }}
        />
        {/* Floating marker pointer */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-aqua bg-abyss shadow-aqua-glow flex items-center justify-center transition-all duration-100"
          style={{ top: `calc(${scrollProgress * 100}% - 8px)` }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-gold" />
        </div>
      </div>

      <div className="text-[10px] font-mono font-semibold text-foam/60">10m</div>
      <div className="px-1.5 py-0.5 rounded bg-deep/90 border border-white/15 text-[9px] font-mono text-gold shadow-md">
        {depthM}m
      </div>
    </div>
  );
}
