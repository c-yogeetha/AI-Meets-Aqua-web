"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import DescendingLoader from "@/components/DescendingLoader";
import DepthMeter from "@/components/DepthMeter";
import BubbleCanvas from "@/components/BubbleCanvas";
import FlipCards from "@/components/FlipCards";
import FaqAccordion from "@/components/FaqAccordion";
import {
  Sparkles,
  ArrowDown,
  ArrowRight,
  ChevronRight,
  FileText,
  Loader2,
} from "lucide-react";
import { showToast } from "@/lib/toast";

export default function HomePage() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);

  const handleTrySample = async () => {
    try {
      setSeeding(true);
      showToast("Loading pre-analyzed demo footage...", "info");
      const res = await api.seedDemo();
      if (res.result_ids && res.result_ids.length > 0) {
        router.push(`/results/${res.result_ids[0]}`);
      } else {
        router.push("/history");
      }
    } catch (err: unknown) {
      setSeeding(false);
      const msg = err instanceof ApiError ? err.message : "Failed to seed sample tank";
      showToast(msg, "danger");
    }
  };

  return (
    <div className="relative overflow-x-hidden min-h-screen">
      {/* 1. Descending Loader */}
      <DescendingLoader />

      {/* 3. Depth Meter Vertical Scroll Indicator */}
      <DepthMeter />

      {/* 2. Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 py-20 overflow-hidden">
        {/* Animated Background Canvas & Gradients */}
        <BubbleCanvas />
        <div className="absolute inset-0 bg-gradient-to-b from-ocean/20 via-transparent to-abyss pointer-events-none" />

        {/* Swimming Goldfish Animation */}
        <div className="absolute top-1/4 -left-20 w-32 h-16 pointer-events-none animate-[swim_25s_linear_infinite] opacity-70">
          <span className="text-4xl block transform -scale-x-100">🐟</span>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          {/* Wordmark Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-aqua text-xs font-semibold uppercase tracking-wider backdrop-blur-md shadow-aqua-glow">
            <span className="w-2 h-2 rounded-full bg-aqua animate-ping" />
            <span data-testid="hero-title">AI Meets Aqua</span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-[1.1]">
            Catch goldfish stress <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-aqua via-foam to-gold">
              before it spreads.
            </span>
          </h1>

          {/* Subline */}
          <p className="text-base sm:text-xl text-foam/80 max-w-2xl mx-auto font-normal leading-relaxed">
            Upload a tank video. Get a stress score for every fish, and clear actions to take.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/analyse"
              data-testid="cta-analyse"
              className="btn-gold px-8 py-3.5 rounded-2xl font-bold text-base flex items-center gap-2 w-full sm:w-auto justify-center shadow-gold-glow"
            >
              <span>Analyse a video</span>
              <ArrowRight className="w-5 h-5 text-abyss" />
            </Link>

            <button
              onClick={handleTrySample}
              data-testid="cta-sample"
              disabled={seeding}
              className="btn-secondary px-8 py-3.5 rounded-2xl font-bold text-base flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              {seeding ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Preparing sample...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-gold" />
                  <span>Try a sample</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dive Deeper Cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foam/60 text-xs font-semibold uppercase tracking-widest pointer-events-none">
          <span>Dive Deeper</span>
          <ArrowDown className="w-4 h-4 text-aqua animate-bounce" />
        </div>
      </section>

      {/* 4. The Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-xs uppercase tracking-wider text-aqua font-semibold">
            Why It Matters
          </h2>
          <h3 className="font-display font-bold text-3xl sm:text-4xl text-white">
            Silent indicators in shared water
          </h3>
          <p className="text-sm sm:text-base text-foam/80 leading-relaxed">
            In shared water, stress and infection travel fast. Caretakers watch by eye, so isolation, erratic swimming and reduced activity are often noticed too late.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-8 border-white/10 text-center space-y-2">
            <span className="font-display font-extrabold text-5xl text-gold block">
              5-10%
            </span>
            <p className="text-xs text-foam/80 leading-relaxed">
              of fish are lost early to stress or poor water conditions (project field study estimate).
            </p>
          </div>

          <div className="glass-card p-8 border-white/10 text-center space-y-2">
            <span className="font-display font-extrabold text-5xl text-danger block">
              1 fish
            </span>
            <p className="text-xs text-foam/80 leading-relaxed">
              is enough to put a shared tank at risk when acute pathogen load or severe stress builds.
            </p>
          </div>

          <div className="glass-card p-8 border-white/10 text-center space-y-2">
            <span className="font-display font-extrabold text-5xl text-aqua block">
              Late
            </span>
            <p className="text-xs text-foam/80 leading-relaxed">
              manual observation notices subtle kinematic anomalies only after clinical symptoms emerge.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Dive Log (How It Works) Timeline */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-16 space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-aqua font-semibold">
            Dive Log
          </h2>
          <h3 className="font-display font-bold text-3xl sm:text-4xl text-white">
            Five steps to early behavioural clarity
          </h3>
        </div>

        <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 sm:before:left-1/2 before:-translate-x-1/2 before:w-0.5 before:bg-gradient-to-b before:from-aqua before:via-gold before:to-ok">
          {[
            {
              step: "01",
              title: "Upload",
              desc: "Add a 30 to 60 second tank video.",
              align: "left",
            },
            {
              step: "02",
              title: "Detect",
              desc: "Every goldfish is found in each frame.",
              align: "right",
            },
            {
              step: "03",
              title: "Track",
              desc: "Each fish gets a stable ID: Fish_1, Fish_2...",
              align: "left",
            },
            {
              step: "04",
              title: "Analyse",
              desc: "Speed, direction, isolation and position become a stress score.",
              align: "right",
            },
            {
              step: "05",
              title: "Act",
              desc: "Get clear actions: aerate, change water, isolate.",
              align: "left",
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`relative flex items-center gap-6 ${
                item.align === "right" ? "sm:flex-row-reverse" : "sm:flex-row"
              }`}
            >
              {/* Dot */}
              <div className="w-8 h-8 rounded-full bg-deep border-2 border-aqua text-aqua text-xs font-mono font-bold flex items-center justify-center z-15 shadow-aqua-glow flex-shrink-0 ml-0 sm:ml-auto sm:mr-auto">
                {item.step}
              </div>

              {/* Card */}
              <div className="flex-1 glass-card p-5 border-white/10 sm:max-w-md">
                <span className="text-[11px] font-mono text-gold font-semibold uppercase block mb-1">
                  Step {item.step}
                </span>
                <h4 className="font-semibold text-white text-base mb-1">{item.title}</h4>
                <p className="text-xs text-foam/80 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Four Signals */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-aqua font-semibold">
            Kinematic Indicators
          </h2>
          <h3 className="font-display font-bold text-3xl sm:text-4xl text-white">
            The four behavioral signals
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="glass-card p-6 border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center font-bold">
              01
            </div>
            <h4 className="font-semibold text-white">Swimming Speed</h4>
            <p className="text-xs text-foam/70 leading-relaxed">
              Burst swimming above 3.5 BL/s indicates acute startle or toxicity; under 0.2 BL/s signals lethargy.
            </p>
          </div>

          <div className="glass-card p-6 border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-warn/10 text-warn flex items-center justify-center font-bold">
              02
            </div>
            <h4 className="font-semibold text-white">Direction Changes</h4>
            <p className="text-xs text-foam/70 leading-relaxed">
              Sharp turns &gt; 60° at high frequency signify frantic disoriented evasion and glass-bumping behavior.
            </p>
          </div>

          <div className="glass-card p-6 border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold">
              03
            </div>
            <h4 className="font-semibold text-white">Social Isolation</h4>
            <p className="text-xs text-foam/70 leading-relaxed">
              Solitary swimming separated by over 35% of tank diagonal reveals harassment or chronic illness.
            </p>
          </div>

          <div className="glass-card p-6 border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-aqua/10 text-aqua flex items-center justify-center font-bold">
              04
            </div>
            <h4 className="font-semibold text-white">Vertical Position</h4>
            <p className="text-xs text-foam/70 leading-relaxed">
              Persistent piping in top 12% indicates hypoxia; resting on gravel bed signals cold shock or swim failure.
            </p>
          </div>
        </div>

        {/* Level Explainer */}
        <div className="glass-card p-6 border-white/10 max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-around gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-ok shadow-sm" />
            <div>
              <div className="font-semibold text-white text-xs">Normal (0 - 34)</div>
              <div className="text-[11px] text-foam/60">Healthy smooth schooling</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-warn shadow-sm" />
            <div>
              <div className="font-semibold text-white text-xs">Moderate (35 - 59)</div>
              <div className="text-[11px] text-foam/60">Early distress markers</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-danger shadow-sm" />
            <div>
              <div className="font-semibold text-white text-xs">High (60 - 100)</div>
              <div className="text-[11px] text-foam/60">Urgent caretaker intervention</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Behaviour, Cause, Action Flip Cards */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-aqua font-semibold">
            Interactive Diagnostic Rules
          </h2>
          <h3 className="font-display font-bold text-3xl sm:text-4xl text-white">
            Behaviour • Cause • Action
          </h3>
          <p className="text-xs text-foam/70">
            Hover over any card or navigate with keyboard to reveal etiology and immediate remedy.
          </p>
        </div>

        <FlipCards />
      </section>

      {/* 8. SDGs */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-aqua font-semibold">
            Global Impact
          </h2>
          <h3 className="font-display font-bold text-3xl sm:text-4xl text-white">
            UN Sustainable Development Goals
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 border-white/10 space-y-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#00AED9]/20 text-[#00AED9] border border-[#00AED9]/40 inline-block">
              SDG 6
            </span>
            <h4 className="font-semibold text-white">Clean Water & Sanitation</h4>
            <p className="text-xs text-foam/80 leading-relaxed">
              Alerts caretakers to poor water conditions before they worsen.
            </p>
          </div>

          <div className="glass-card p-6 border-white/10 space-y-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#CF8D2A]/20 text-[#CF8D2A] border border-[#CF8D2A]/40 inline-block">
              SDG 12
            </span>
            <h4 className="font-semibold text-white">Responsible Consumption</h4>
            <p className="text-xs text-foam/80 leading-relaxed">
              Prevents loss of costly ornamental fish and wasted resources.
            </p>
          </div>

          <div className="glass-card p-6 border-white/10 space-y-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#0A97D9]/20 text-[#0A97D9] border border-[#0A97D9]/40 inline-block">
              SDG 14
            </span>
            <h4 className="font-semibold text-white">Life Below Water</h4>
            <p className="text-xs text-foam/80 leading-relaxed">
              Protects aquatic life by catching stress early.
            </p>
          </div>
        </div>
      </section>

      {/* 9. Live Preview Result Card */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-aqua font-semibold">
            Sample Output Preview
          </h2>
          <h3 className="font-display font-bold text-3xl sm:text-4xl text-white">
            What your analysis report looks like
          </h3>
        </div>

        <div className="glass-card p-6 sm:p-8 border-aqua/30 shadow-aqua-glow space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-xs text-gold font-semibold uppercase tracking-wider">Sample Tank</span>
              <h4 className="font-display font-bold text-2xl text-white">Living room 60L</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-warn/20 text-warn border border-warn/40">
                Score: 48 (Moderate)
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-foam/80 border border-white/10">
                Demo data
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-white">Fish_1</span>
                <span className="text-danger font-semibold">Stressed (48)</span>
              </div>
              <div className="text-[11px] text-foam/70">
                Fish_1 exhibited erratic darting (4.2 BL/s) and persistent surface piping.
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-white">Fish_2</span>
                <span className="text-ok font-semibold">Normal (12)</span>
              </div>
              <div className="text-[11px] text-foam/70">
                Fish_2 maintained calm mid-water swimming with zero anomalies.
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/analyse"
              className="btn-gold px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
            >
              <span>Try your own video</span>
              <ArrowRight className="w-4 h-4 text-abyss" />
            </Link>
          </div>
        </div>
      </section>

      {/* 10. FAQ Accordion */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-aqua font-semibold">
            Common Questions
          </h2>
          <h3 className="font-display font-bold text-3xl sm:text-4xl text-white">
            Answers from the tank
          </h3>
        </div>

        <FaqAccordion />
      </section>

      {/* 11. Project Brief Card & Team Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="glass-card p-8 sm:p-10 border-white/10 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-aqua uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                <span>Documentation & Architecture</span>
              </div>
              <h3 className="font-display font-bold text-2xl text-white">
                Project Brief & Verification Suite
              </h3>
              <p className="text-xs text-foam/70 max-w-lg">
                Inspect architecture diagrams, API contracts, benchmark manifests, and live automated test reports.
              </p>
            </div>

            <Link
              href="/testing"
              className="btn-secondary px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 flex-shrink-0"
            >
              <span>Explore Testing & Metrics</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Team Listing */}
          <div className="pt-6 border-t border-white/10 space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-aqua font-semibold">
              Project Development Team
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-foam/90">
              <div className="bg-white/5 p-3 rounded-xl">C Yogeetha</div>
              <div className="bg-white/5 p-3 rounded-xl">Mamata</div>
              <div className="bg-white/5 p-3 rounded-xl">Sambrama M</div>
              <div className="bg-white/5 p-3 rounded-xl">Lakshmi Chandrashekara</div>
              <div className="bg-white/5 p-3 rounded-xl">M Vijayalaxmi</div>
              <div className="bg-white/5 p-3 rounded-xl">Ropashree D</div>
            </div>
            <div className="text-xs text-foam/50 pt-1">
              Atria Institute of Technology, Department of CSE
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
