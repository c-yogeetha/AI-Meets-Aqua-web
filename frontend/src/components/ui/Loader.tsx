"use client";

import React, { useEffect, useState } from "react";

export function Loader() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem("matsya_loader_seen") === "1";
    } catch {
      // Session storage may be disabled.
    }

    setReady(true);
    if (reducedMotion || seen) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem("matsya_loader_seen", "1");
      } catch {
        // The intro is still complete for this page load.
      }
    }, 1600);

    return () => window.clearTimeout(hideTimer);
  }, []);

  if (!ready || !visible) return null;

  return (
    <div
      data-testid="loader"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-abyss text-ink transition-opacity duration-300"
    >
      <div className="flex flex-col items-center max-w-xs w-full px-6 text-center">
        {/* Matsya SVG Geometric Mark */}
        <div className="w-12 h-12 mb-6 text-aqua">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path
              d="M6 24C14 14 34 10 42 24C34 38 14 34 6 24Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="34" cy="22" r="2" fill="currentColor" />
            <path
              d="M38 24L44 18M38 24L44 30"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M18 20C22 18 26 18 30 20"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
          </svg>
        </div>

        <div className="font-mono text-xs uppercase tracking-[0.24em] text-aqua mb-3">
          DESCENDING
        </div>

        {/* Progress bar */}
        <div className="w-full h-[2px] bg-hair rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-aqua animate-loader-progress"
            style={{ width: "100%" }}
          />
        </div>

        <div className="font-mono text-[11px] text-ink-3 tabular-nums">
          DESCENDING
        </div>
      </div>
    </div>
  );
}
