"use client";

import React, { useEffect, useState } from "react";
import { api, type SystemStatusResponse } from "@/lib/api";
import { SYSTEM_STATUS_ITEMS, type StatusItem } from "@/content/status";
import { StatusChip } from "@/components/ui/StatusChip";

export function StatusTable() {
  const [items, setItems] = useState<StatusItem[]>(SYSTEM_STATUS_ITEMS);

  useEffect(() => {
    let mounted = true;
    api
      .getSystemStatus()
      .then((status: SystemStatusResponse) => {
        if (!mounted) return;
        setItems((prev) =>
          prev.map((item) => {
            if (item.dynamicKey === "onnx_detector") {
              const isIntegrated = Boolean(status.detectors?.onnx);
              return {
                ...item,
                status: isIntegrated ? "implemented" : "prototype",
                statusLabel: isIntegrated ? "Integrated" : "Awaiting trained weights",
              };
            }
            return item;
          })
        );
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="w-full overflow-x-auto hairline-panel">
      <table className="w-full text-left border-collapse font-sans text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-hair bg-abyss/60 text-ink-3 font-mono text-[11px] uppercase tracking-wider">
            <th className="py-3 px-4">Component</th>
            <th className="py-3 px-4 hidden sm:table-cell">Subsystem</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Implementation Scope & Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hair">
          {items.map((item, idx) => (
            <tr
              key={item.id}
              data-testid={`status-row-${idx}`}
              className="hover:bg-trench/40 transition-colors"
            >
              <td className="py-3.5 px-4 font-medium text-ink">
                {item.name}
              </td>
              <td className="py-3.5 px-4 font-mono text-xs text-ink-3 hidden sm:table-cell">
                {item.category}
              </td>
              <td className="py-3.5 px-4 shrink-0">
                <StatusChip status={item.status} label={item.statusLabel} />
              </td>
              <td className="py-3.5 px-4 text-xs text-ink-2 leading-relaxed">
                {item.detail}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
