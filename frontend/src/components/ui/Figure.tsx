import React from "react";

interface FigureProps {
  number: number | string;
  caption: string;
  provenance?: "Real pipeline output" | "Synthetic test clip" | "Sample data (mock)";
  children: React.ReactNode;
  className?: string;
}

export function Figure({ number, caption, provenance, children, className = "" }: FigureProps) {
  return (
    <figure className={`hairline-panel p-2 sm:p-3 overflow-hidden ${className}`}>
      <div className="rounded-[4px] overflow-hidden bg-abyss flex items-center justify-center">
        {children}
      </div>
      <figcaption className="mt-2.5 px-1 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 text-xs">
        <div className="text-ink-2 font-mono">
          <span className="text-aqua font-semibold mr-2">FIG. {number}:</span>
          <span>{caption}</span>
        </div>
        {provenance && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3 shrink-0">
            [{provenance}]
          </span>
        )}
      </figcaption>
    </figure>
  );
}
