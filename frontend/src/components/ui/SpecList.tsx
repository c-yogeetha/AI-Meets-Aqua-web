import React from "react";

export interface SpecItem {
  key: string;
  value: React.ReactNode;
  note?: string;
}

interface SpecListProps {
  items: SpecItem[];
  className?: string;
}

export function SpecList({ items, className = "" }: SpecListProps) {
  return (
    <dl className={`divide-y divide-hair font-sans text-sm ${className}`}>
      {items.map((item, idx) => (
        <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
          <dt className="font-mono text-xs uppercase tracking-wider text-ink-3">
            {item.key}
          </dt>
          <dd className="text-ink font-medium sm:text-right flex flex-col sm:items-end">
            <span>{item.value}</span>
            {item.note && <span className="text-xs text-ink-3">{item.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
