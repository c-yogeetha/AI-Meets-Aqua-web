"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItemData {
  q: string;
  a: string;
}

const FAQS: FaqItemData[] = [
  {
    q: "What does AI Meets Aqua detect?",
    a: "The system monitors behavioral stress indicators in ornamental goldfish: high burst speeds, erratic zig-zag turning, prolonged surface gasping (piping), social isolation, and corner lethargy.",
  },
  {
    q: "Is this considered a clinical medical diagnosis?",
    a: "No. It is a decision-support screening tool for tank caretakers. It detects overt behavioural deviations early to prompt water testing or consultation, but does not replace professional clinical care.",
  },
  {
    q: "What kind of video footage should I upload for optimal accuracy?",
    a: "Record 30 to 60 seconds from a stable front or side perspective with minimal glass glare, even lighting, and 1 to 5 goldfish. Avoid top-down angles if you wish to monitor vertical gasping or bottom resting.",
  },
  {
    q: "Is my recorded video footage permanently stored or shared?",
    a: "All video processing and media assets are stored locally within the application data repository. Analyses moved to the recycle bin are retained for 7 days before automated permanent deletion.",
  },
  {
    q: "Which fish species are currently supported by the model?",
    a: "The classical computer vision baseline and heuristic kinematics are optimized specifically for goldfish (Carassius auratus). Future iterations will expand to tropical species.",
  },
  {
    q: "How is the overall tank stress score computed?",
    a: "Scores are derived through a transparent, citable rule-based engine. Kinematic thresholds award weighted points for speed, turns, isolation, and depth, combined into a normalized 0 to 100 tank stress index.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="space-y-3">
      {FAQS.map((faq, idx) => {
        const isOpen = openIndex === idx;

        return (
          <div
            key={idx}
            data-testid={`faq-item-${idx}`}
            className="glass-card border-white/10 overflow-hidden transition-all"
          >
            <button
              type="button"
              data-testid={`faq-trigger-${idx}`}
              aria-expanded={isOpen}
              onClick={() => toggle(idx)}
              className="w-full p-5 text-left flex items-center justify-between gap-4 text-white hover:text-aqua transition-colors font-medium text-sm sm:text-base"
            >
              <span>{faq.q}</span>
              <ChevronDown
                className={`w-4 h-4 flex-shrink-0 text-aqua transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isOpen && (
              <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-foam/80 leading-relaxed border-t border-white/5 animate-in fade-in duration-200">
                {faq.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
