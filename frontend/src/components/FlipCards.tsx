"use client";

import React, { useState } from "react";
import { Zap, Wind, ShieldAlert, Thermometer, RotateCcw } from "lucide-react";

interface FlipCardData {
  id: number;
  title: string;
  icon: React.ReactNode;
  behaviour: string;
  cause: string;
  action: string;
  source: string;
}

const CARDS: FlipCardData[] = [
  {
    id: 0,
    title: "Erratic & Fast Swimming",
    icon: <Zap className="w-6 h-6 text-danger" />,
    behaviour: "Darting at speeds > 3.5 BL/s with abrupt direction changes and glass bumps.",
    cause: "Ammonia or nitrite spike; sudden pH swing; chlorine toxicity; persistent chasing.",
    action: "Test water parameters immediately. Dose water conditioner; consider a 30% partial change.",
    source: "Saint & Tattersall (2023), Fish Physiol Biochem",
  },
  {
    id: 1,
    title: "Surface Gasping (Piping)",
    icon: <Wind className="w-6 h-6 text-warn" />,
    behaviour: "Hovering repeatedly in the top 12% of the water column with mouth open.",
    cause: "Critically low dissolved oxygen saturation; high water temperature; gill parasitism.",
    action: "Turn on an auxiliary air stone immediately. Lower water temperature if above 24°C.",
    source: "Sloman et al. (2006), Anim Behav",
  },
  {
    id: 2,
    title: "Social Isolation",
    icon: <ShieldAlert className="w-6 h-6 text-gold" />,
    behaviour: "Staying > 35% of tank diagonal distance away from the goldfish group for prolonged intervals.",
    cause: "Physical bullying by larger goldfish; onset of bacterial infection; swim exhaustion.",
    action: "Inspect fish closely for nipped fins or white spots. Move to a gentle nursery tank if chased.",
    source: "Pitcher & Parrish (1993), Behaviour of Teleost Fishes",
  },
  {
    id: 3,
    title: "Bottom Inactivity",
    icon: <Thermometer className="w-6 h-6 text-aqua" />,
    behaviour: "Resting immobile on tank gravel in corners with minimal fin movement.",
    cause: "Water temperature below 18°C; nitrate intoxication; swim bladder disorder; high salinity.",
    action: "Confirm heater temperature is between 20°C and 23°C. Test nitrate; siphon gravel floor.",
    source: "Fish Welfare Husbandry Guidelines (2012)",
  },
];

export default function FlipCards() {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const toggle = (id: number) => {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(id);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => {
        const isFlipped = flipped[card.id];

        return (
          <div
            key={card.id}
            data-testid={`flip-card-${card.id}`}
            tabIndex={0}
            role="button"
            aria-label={`${card.title}. Press Enter to flip card`}
            onKeyDown={(e) => handleKeyDown(e, card.id)}
            onClick={() => toggle(card.id)}
            className="group h-72 cursor-pointer [perspective:1000px] outline-none focus:ring-2 focus:ring-aqua rounded-2xl"
          >
            <div
              className={`relative h-full w-full rounded-2xl transition-all duration-500 [transform-style:preserve-3d] ${
                isFlipped ? "[transform:rotateY(180deg)]" : "group-hover:[transform:rotateY(180deg)]"
              }`}
            >
              {/* Front of Card */}
              <div className="absolute inset-0 h-full w-full rounded-2xl p-6 glass-card border-white/10 [backface-visibility:hidden] flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-sm">
                    {card.icon}
                  </div>
                  <h3 className="font-display font-bold text-lg text-white mb-2 leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-xs text-foam/70 leading-relaxed">
                    {card.behaviour}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-aqua pt-3 border-t border-white/5">
                  <span>Hover or tap to reveal action</span>
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Back of Card */}
              <div className="absolute inset-0 h-full w-full rounded-2xl p-6 glass-card border-aqua/30 bg-deep/95 [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col justify-between">
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-warn tracking-wider block">
                      Probable Cause
                    </span>
                    <p className="text-xs text-foam/90 mt-0.5 leading-snug">
                      {card.cause}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-aqua tracking-wider block">
                      Recommended Action
                    </span>
                    <p className="text-xs text-white font-medium mt-0.5 leading-snug">
                      {card.action}
                    </p>
                  </div>
                </div>

                <div className="text-[9px] text-foam/40 pt-2 border-t border-white/5 truncate">
                  Ref: {card.source}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
