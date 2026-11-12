"use client";

import React, { useEffect, useState } from "react";

export function DepthRail() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const progress = Math.min(1, Math.max(0, window.scrollY / scrollHeight));
        setScrollProgress(progress);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const depthMeters = (scrollProgress * 10).toFixed(1);

  return (
    <aside
      data-testid="depth-rail"
      aria-hidden="true"
      className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 z-30 flex-col items-center pointer-events-none select-none text-ink-3 font-mono text-[10px]"
    >
      <div className="text-[9px] uppercase tracking-wider text-aqua mb-2">0.0 m</div>
      <div className="relative w-[1px] h-48 bg-hair">
        {/* Depth marker */}
        <div
          className="absolute -left-1.5 w-3.5 h-[2px] bg-aqua shadow-[0_0_8px_rgba(79,209,197,0.8)] transition-all duration-75"
          style={{ top: `${scrollProgress * 100}%` }}
        />
        {/* Gauge ticks */}
        {[0.2, 0.4, 0.6, 0.8].map((tick) => (
          <div
            key={tick}
            className="absolute -left-0.5 w-1.5 h-[1px] bg-hair-strong"
            style={{ top: `${tick * 100}%` }}
          />
        ))}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-ink-3 mt-2">10.0 m</div>
      <div className="mt-3 text-aqua font-semibold text-[11px] tabular-nums tracking-widest">
        {depthMeters}m
      </div>
    </aside>
  );
}
