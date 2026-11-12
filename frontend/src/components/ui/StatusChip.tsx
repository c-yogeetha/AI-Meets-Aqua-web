"use client";

import React from "react";

export type StatusVariant = "implemented" | "prototype" | "validation" | "planned" | "mock" | "real";

interface StatusChipProps {
  status?: StatusVariant;
  variant?: StatusVariant;
  label?: string;
  className?: string;
}

export function StatusChip({ status, variant, label, className = "" }: StatusChipProps) {
  const effectiveStatus = status || variant || "real";
  const getStatusConfig = () => {
    switch (effectiveStatus) {
      case "implemented":
      case "real":
        return {
          text: label || (status === "real" ? "Real" : "Implemented"),
          classes: "border-ok/30 text-ok bg-ok/10",
        };
      case "prototype":
      case "validation":
        return {
          text: label || (status === "prototype" ? "Prototype" : "In validation"),
          classes: "border-warn/30 text-warn bg-warn/10",
        };
      case "mock":
        return {
          text: label || "Sample data (mock)",
          classes: "border-ink-2/30 text-ink-2 bg-ink-2/10",
        };
      case "planned":
      default:
        return {
          text: label || "Planned",
          classes: "border-hair text-ink-3 bg-hair/10",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      data-testid="status-chip"
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider border ${config.classes} ${className}`}
    >
      {config.text}
    </span>
  );
}
