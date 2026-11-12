"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader } from "@/components/ui/Loader";
import { DepthRail } from "@/components/ui/DepthRail";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { HeroVideo } from "@/components/HeroVideo";
import { SignalExplorer } from "@/components/SignalExplorer";
import { DrawnTimeline } from "@/components/ui/DrawnTimeline";
import { SampleResultSection } from "@/components/SampleResultSection";
import { StatusTable } from "@/components/StatusTable";
import { EvidenceSection } from "@/components/EvidenceSection";
import { Accordion, type AccordionItem } from "@/components/ui/Accordion";
import BubbleCanvas from "@/components/BubbleCanvas";
import { PROBLEM_NOTES } from "@/content/claims";
import { api, ApiError, type SystemStatusResponse } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { ArrowDown, ArrowRight, Waves, Play } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);

  useEffect(() => {
    api
      .getSystemStatus()
      .then(setSystemStatus)
      .catch(() => {});
  }, []);

  const handleTrySample = async () => {
    try {
      setSeeding(true);
      showToast("Loading pre-analyzed demo footage...", "info");
      const res = await api.seedDemo();
      if (res.result_ids && res.result_ids.length > 0) {
        router.push(`/app/results/${res.result_ids[0]}`);
      } else {
        router.push("/app/history");
      }
    } catch (err: unknown) {
      setSeeding(false);
      const msg = err instanceof ApiError ? err.message : "Failed to seed sample tank";
      showToast(msg, "danger");
    }
  };

  const activeAnalyzer = systemStatus?.mode || "baseline classical";

  const FAQ_ITEMS: AccordionItem[] = [
    {
      id: "faq-what",
      question: "What behaviours does Matsya detect?",
      answer: (
        <p>
          Matsya quantifies five core behavioural stress indicators: rapid burst darting, disoriented angular turning, persistent surface gasping, bottom freezing/lethargy, and social isolation from the group.
        </p>
      ),
    },
    {
      id: "faq-diagnosis",
      question: "Is this a clinical medical diagnosis?",
      answer: (
        <p>
          No. Matsya provides automated behavioral observation metrics to assist caretakers, researchers, and hobbyists in catching environmental deterioration early. It does not replace professional aquatic clinical diagnostics or laboratory water testing.
        </p>
      ),
    },
    {
      id: "faq-video",
      question: "What video format and angle work best?",
      answer: (
        <p>
          Upload a stable, 15 to 30 second video at 15 to 30 FPS. Side-elevation or front-elevation views of the tank are required for accurate vertical depth scoring. Top-down views can track horizontal movement but cannot calculate surface gasping.
        </p>
      ),
    },
    {
      id: "faq-storage",
      question: "Where do uploaded videos go and how is data handled?",
      answer: (
        <p>
          Videos are processed entirely on your designated server. Once the analysis is complete, raw video uploads are deleted while structured trajectory results and key moment annotations are kept until you delete them or retention limits expire.
        </p>
      ),
    },
    {
      id: "faq-species",
      question: "Which fish species are supported?",
      answer: (
        <p>
          The baseline detector and behavioural scoring weights are calibrated specifically for common goldfish (<em>Carassius auratus</em>). Future model weights will support tropical community species.
        </p>
      ),
    },
    {
      id: "faq-scoring",
      question: "How is the overall tank stress score calculated?",
      answer: (
        <p>
          The overall score is computed from the maximum individual fish stress score plus a spread bonus for multi-fish distress, bounded between 0 and 100. Read our full methodology in the{" "}
          <Link href="/science" className="text-aqua underline">
            Science & Methodology
          </Link>{" "}
          page.
        </p>
      ),
    },
  ];

  return (
    <>
      {/* Section 0: Descending Loader */}
      <Loader />

      {/* Section 2: Fixed Depth Rail */}
      <DepthRail />

      {/* Section 1: Hero Stage */}
      <section className="relative min-h-[92vh] flex flex-col justify-between pt-28 pb-12 px-6 sm:px-12 border-b border-hair overflow-hidden bg-gradient-to-b from-abyss via-trench to-abyss">
        {/* Background ambient water animation */}
        <BubbleCanvas />

        {/* Ambient light rays */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-lagoon via-transparent to-transparent"
          aria-hidden="true"
        />

        {/* Hero Content Grid */}
        <div className="relative z-10 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto">
          {/* Left Hero Statement */}
          <div className="lg:col-span-7 space-y-6">
            <div className="label-mono text-aqua flex items-center gap-2">
              <Waves className="w-3.5 h-3.5" />
              <span>GOLDFISH WELFARE / BEHAVIOUR ANALYSIS</span>
            </div>

            <h1
              data-testid="hero-title"
              className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-ink leading-[1.12]"
            >
              The first sign of stress is in how they swim.
            </h1>

            <p className="text-base sm:text-lg text-ink-2 max-w-xl leading-relaxed">
              Matsya analyses a short tank video, tracks every goldfish, and turns movement into a stress score with clear next steps.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/app/analyse"
                data-testid="cta-analyse"
                className="btn-primary-gold text-sm font-mono uppercase tracking-wider py-2.5 px-6"
              >
                <span>Analyse a video</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={handleTrySample}
                disabled={seeding}
                data-testid="cta-sample"
                className="btn-secondary-aqua text-sm font-mono uppercase tracking-wider py-2.5 px-6 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{seeding ? "Loading..." : "Try a sample"}</span>
              </button>
            </div>
          </div>

          {/* Right Hero Video Panel */}
          <div className="lg:col-span-5 w-full">
            <HeroVideo />
          </div>
        </div>

        {/* Bottom Metadata Strip & Scroll Cue */}
        <div className="relative z-10 max-w-6xl mx-auto w-full mt-8 pt-4 border-t border-hair flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-ink-3">
          <div className="flex flex-wrap items-center gap-4">
            <span>species: <strong className="text-ink-2 font-normal">goldfish</strong></span>
            <span className="text-hair-strong">/</span>
            <span>analyzer: <strong className="text-aqua font-normal">{activeAnalyzer}</strong></span>
            <span className="text-hair-strong">/</span>
            <span>status: <strong className="text-warn font-normal">prototype</strong></span>
          </div>

          <a
            href="#problem"
            className="flex items-center gap-1.5 text-aqua hover:underline text-[11px] uppercase tracking-wider"
          >
            <span>Dive deeper</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* Main Content Sections */}
      <div className="max-w-6xl mx-auto px-6 sm:px-12 py-16 sm:py-24 space-y-28">
        {/* Section 3: 01 / THE PROBLEM */}
        <section id="problem" className="scroll-mt-24 space-y-8">
          <SectionLabel number="01" title="THE PROBLEM" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 7 cols: Large pull statement */}
            <div className="lg:col-span-7">
              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-ink leading-snug">
                A fish cannot tell you when something is wrong.
              </h2>
              <p className="mt-4 text-base text-ink-2 leading-relaxed prose-readable">
                In closed aquatic systems, subtle deviations in swimming velocity, schooling coherence, and vertical tank positioning serve as the earliest warning signs of water toxicity, parasitic infection, and hypoxia.
              </p>
            </div>

            {/* Right 5 cols: 3 numbered notes */}
            <div className="lg:col-span-5 space-y-4">
              {PROBLEM_NOTES.map((note) => (
                <div
                  key={note.id}
                  className="hairline-panel p-4 space-y-1.5 bg-trench/40 hover:border-hair-strong transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-aqua">{note.number}</span>
                    <span className="font-sans font-medium text-ink text-sm">
                      {note.title}
                    </span>
                  </div>
                  <p className="text-xs text-ink-3 leading-relaxed">
                    {note.statement}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: 02 / FOUR SIGNALS */}
        <section id="signals" className="scroll-mt-24 space-y-8">
          <div>
            <SectionLabel number="02" title="FOUR SIGNALS" />
            <h2 className="font-serif text-3xl font-medium text-ink">
              Quantifiable Biomechanical Stress Signals
            </h2>
            <p className="text-sm text-ink-2 mt-1">
              Deterministic computer vision rules transform pixel trajectories into standardized metrics.
            </p>
          </div>

          <SignalExplorer />
        </section>

        {/* Section 5: 03 / FROM VIDEO TO DECISION */}
        <section id="pipeline" className="scroll-mt-24 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <SectionLabel number="03" title="FROM VIDEO TO DECISION" className="justify-center" />
            <h2 className="font-serif text-3xl font-medium text-ink">
              The Six Analysis Stages
            </h2>
            <p className="text-sm text-ink-2">
              Every video traverses a deterministic, reproducible processing pipeline.
            </p>
          </div>

          <DrawnTimeline />
        </section>

        {/* Section 6: 04 / WHAT YOU GET (Sample Result) */}
        <section id="sample-result" className="scroll-mt-24 space-y-8">
          <div>
            <SectionLabel number="04" title="WHAT YOU GET" />
            <h2 className="font-serif text-3xl font-medium text-ink">
              Structured Pipeline Result
            </h2>
            <p className="text-sm text-ink-2 mt-1">
              Sample output produced by running the classical analysis pipeline on benchmark test footage.
            </p>
          </div>

          <SampleResultSection />
        </section>

        {/* Section 7: 05 / STATUS */}
        <section id="status" className="scroll-mt-24 space-y-8">
          <div>
            <SectionLabel number="05" title="STATUS" />
            <h2 className="font-serif text-3xl font-medium text-ink">
              System Specification & Subsystem Maturity
            </h2>
            <p className="text-sm text-ink-2 mt-1">
              Transparent tracking of implemented components, experimental prototypes, and planned integrations.
            </p>
          </div>

          <StatusTable />
        </section>

        {/* Section 8: 06 / EVIDENCE */}
        <section id="evidence" className="scroll-mt-24 space-y-8">
          <SectionLabel number="06" title="EVIDENCE" />
          <EvidenceSection />
        </section>

        {/* Section 9: 07 / IMPACT */}
        <section id="impact" className="scroll-mt-24 space-y-8">
          <div>
            <SectionLabel number="07" title="IMPACT" />
            <h2 className="font-serif text-3xl font-medium text-ink">
              United Nations Sustainable Development Goals
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="hairline-panel p-6 space-y-3 bg-trench/30">
              <div className="font-mono text-4xl font-light text-aqua">06</div>
              <h3 className="font-serif text-lg font-medium text-ink">Clean Water & Sanitation</h3>
              <p className="text-xs text-ink-2 leading-relaxed">
                Fish behaviour serves as an ultra-sensitive bio-indicator of aquatic degradation and toxic nitrogen spikes before standard chemical assays register damage.
              </p>
            </div>

            <div className="hairline-panel p-6 space-y-3 bg-trench/30">
              <div className="font-mono text-4xl font-light text-warn">12</div>
              <h3 className="font-serif text-lg font-medium text-ink">Responsible Consumption</h3>
              <p className="text-xs text-ink-2 leading-relaxed">
                Prevents indiscriminate chemical medication and antibiotic dosing by accurately differentiating physical illness from acute handling or environmental stress.
              </p>
            </div>

            <div className="hairline-panel p-6 space-y-3 bg-trench/30">
              <div className="font-mono text-4xl font-light text-ok">14</div>
              <h3 className="font-serif text-lg font-medium text-ink">Life Below Water</h3>
              <p className="text-xs text-ink-2 leading-relaxed">
                Advances humane aquatic animal stewardship through automated, passive optical telemetry that eliminates the trauma of physical netting and sensor tagging.
              </p>
            </div>
          </div>
        </section>

        {/* Section 10: FAQ */}
        <section id="faq" className="scroll-mt-24 space-y-8 max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <SectionLabel number="08" title="FREQUENTLY ASKED QUESTIONS" className="justify-center" />
            <h2 className="font-serif text-3xl font-medium text-ink">
              Understanding Matsya
            </h2>
          </div>

          <Accordion items={FAQ_ITEMS} />
        </section>

        {/* Section 11: Closing CTA Band */}
        <section className="hairline-panel p-8 sm:p-12 text-center bg-gradient-to-tr from-trench via-deep to-trench space-y-6">
          <div className="max-w-xl mx-auto space-y-3">
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-ink">
              Try it with your own tank video.
            </h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Upload a 15–30 second video of your goldfish tank. Receive a transparent stress score and immediate caretaker recommendations in seconds.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/app/analyse"
              data-testid="cta-analyse-bottom"
              className="btn-primary-gold text-sm font-mono uppercase tracking-wider py-3 px-8"
            >
              <span>Analyse a tank video now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
