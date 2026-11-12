"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export function Accordion({ items, className = "" }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className={`divide-y divide-hair border-y border-hair ${className}`}>
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={item.id} className="py-4">
            <button
              type="button"
              data-testid={`faq-trigger-${idx}`}
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${idx}`}
              onClick={() => toggle(idx)}
              className="w-full flex items-center justify-between text-left font-sans text-base sm:text-lg font-medium text-ink hover:text-aqua transition-colors py-1 group"
            >
              <span>{item.question}</span>
              <ChevronDown
                className={`w-4 h-4 text-ink-3 group-hover:text-aqua transition-transform duration-200 shrink-0 ml-4 ${
                  isOpen ? "rotate-180 text-aqua" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div
                id={`faq-panel-${idx}`}
                data-testid={`faq-panel-${idx}`}
                className="mt-3 text-sm text-ink-2 prose-readable leading-relaxed"
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
