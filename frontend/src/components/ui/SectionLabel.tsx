import React from "react";

interface SectionLabelProps {
  number: string;
  title: string;
  className?: string;
}

export function SectionLabel({ number, title, className = "" }: SectionLabelProps) {
  return (
    <div className={`font-mono text-xs uppercase tracking-[0.16em] text-aqua flex items-center gap-2 mb-3 ${className}`}>
      <span className="text-ink-3">{number}</span>
      <span className="text-hair-strong">/</span>
      <span>{title}</span>
    </div>
  );
}
