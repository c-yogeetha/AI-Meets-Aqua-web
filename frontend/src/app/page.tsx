"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Upload,
  Cpu,
  Scan,
  Activity,
  Compass,
  Lightbulb,
  Play,
  ArrowRight,
  TrendingUp,
  Video,
  Database
} from "lucide-react";
import { api, type SystemStatusResponse, type HistoryItem, type Insights } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface TrendPoint {
  date?: string;
  score?: number;
  label?: string;
}

export default function HomePage() {
  const [seeding, setSeeding] = useState(false);
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [activeTab, setActiveTab] = useState<"recordings" | "footage" | "history">("recordings");

  // Dynamic API state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    // 1. Fetch system status
    api
      .getSystemStatus()
      .then((res) => {
        setStatus(res);
        setStatusError(false);
      })
      .catch(() => {
        setStatusError(true);
      });

    // 2. Fetch history and insights
    Promise.all([
      fetch("/api/v1/history?page=1&page_size=5").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/v1/insights").then((r) => (r.ok ? r.json() : null))
    ])
      .then(([histData, insData]) => {
        if (histData && histData.items) {
          setHistoryItems(histData.items);
        }
        if (insData) {
          setInsights(insData);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  const handleTrySample = async () => {
    try {
      setSeeding(true);
      showToast("Loading pre-analyzed demo footage...", "info");
      const res = await api.seedDemo();
      if (res.result_ids && res.result_ids.length > 0) {
        window.location.href = `/app/results/${res.result_ids[0]}`;
      } else {
        window.location.href = "/app/history";
      }
    } catch {
      showToast("Failed to seed sample tank", "danger");
    } finally {
      setSeeding(false);
    }
  };

  const detectorText = statusError
    ? "status unavailable"
    : status?.mode === "baseline"
    ? "classical detector, not yet validated"
    : status?.mode
    ? `${status.mode} detector, under validation`
    : "classical detector, not yet validated";

  return (
    <div className="w-full flex flex-col bg-sand text-ink selection:bg-foam selection:text-ink">
      {/* 1. HERO SECTION */}
      <section
        className="relative min-h-screen w-full flex flex-col justify-between items-center px-6 sm:px-12 pt-28 pb-12 overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: "url('/media/ocean-hero.jpg')",
        }}
      >
        {/* Subtle darkening gradient overlay for high contrast */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,48,70,0.50) 0%, rgba(0,48,70,0.25) 40%, rgba(0,48,70,0.60) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Top pill */}
        <div className="relative z-10 mx-auto">
          <div data-testid="detector-status-badge" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md bg-white/20 border border-white/40 text-white text-xs font-sans tracking-wide shadow-sm">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-foam">Prototype</span>
            <span className="text-white/60">•</span>
            <span className="text-white/95">{detectorText}</span>
          </div>
        </div>

        {/* Centered headline, sentence and buttons */}
        <div className="relative z-10 max-w-4xl mx-auto text-center my-auto px-4 py-8 space-y-6">
          <h1
            data-testid="hero-title"
            className="font-display italic text-5xl sm:text-7xl md:text-8xl text-white font-normal leading-[1.08] tracking-tight drop-shadow-md"
            style={{ textShadow: "0 2px 14px rgba(0,35,50,0.45)" }}
          >
            Notice what they can&apos;t tell you.
            <br />
            Care sooner.
          </h1>

          <p
            className="text-base sm:text-xl text-white/95 max-w-2xl mx-auto font-sans font-normal leading-relaxed drop-shadow"
            style={{ textShadow: "0 1px 8px rgba(0,35,50,0.5)" }}
          >
            Matsya watches a short video of your tank, follows every goldfish, and turns movement into a stress score with clear next steps.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a
              href="/app/analyse"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Start analysis (opens in a new tab)"
              data-testid="cta-analyse"
              className="px-8 py-3.5 rounded-full backdrop-blur-md bg-white/25 border border-white/50 text-white hover:bg-white/35 text-sm sm:text-base font-sans font-medium tracking-wide shadow-lg inline-flex items-center gap-2 transition-all hover:scale-[1.02]"
              style={{ textShadow: "0 1px 4px rgba(0,35,50,0.4)" }}
            >
              <span>Start analysis</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </a>

            <a
              href="#features"
              className="px-6 py-3.5 rounded-full bg-transparent hover:bg-white/10 text-white text-sm sm:text-base font-sans font-medium tracking-wide inline-flex items-center gap-2 transition-all"
              style={{ textShadow: "0 1px 4px rgba(0,35,50,0.4)" }}
            >
              <Play className="w-4 h-4 fill-white text-white" />
              <span>How it works</span>
            </a>
          </div>
        </div>

        {/* Bottom pill */}
        <div className="relative z-10 mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md bg-white/20 border border-white/40 text-white/95 text-xs font-sans tracking-wide shadow-sm">
            <span>Built on open data. Detector under validation.</span>
          </div>
        </div>
      </section>

      {/* 2. THE PROBLEM, AS A STORY */}
      <section id="problem" className="w-full bg-sand py-20 px-6 sm:px-12 border-b border-hair">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Story */}
          <div className="lg:col-span-7 space-y-6">
            <div className="text-xs font-mono uppercase tracking-widest text-deep font-semibold">
              Aquatic Observation
            </div>

            <div className="space-y-4 text-ink text-base sm:text-lg leading-relaxed">
              <p>
                <strong>A common situation:</strong> you walk by your tank every morning, drop in flakes, and watch for a few brief moments before getting on with your day. At first glance, the water looks clear and the fish seem to be swimming around as usual.
              </p>
              <p>
                Because aquatic pets cannot make distress sounds or show obvious facial cues, illness and water parameter spikes often go unnoticed until it is too late. A fish quietly begins hiding near the bottom gravel, ceases its natural exploratory foraging, or spends prolonged periods hovering directly below the filter return trying to catch oxygen.
              </p>
              <p>
                By the time acute symptoms like clamped fins or complete loss of appetite become obvious to an untrained eye, physiological stress has already reached an advanced stage that requires emergency intervention and heavy medications.
              </p>
            </div>

            <div className="pt-4 border-t border-hair">
              <h2 className="font-display italic text-3xl sm:text-4xl text-ink font-normal leading-snug">
                &ldquo;What if you could see the signs before it&apos;s too late?&rdquo;
              </h2>
            </div>
          </div>

          {/* Right Column: Visual illustration */}
          <div className="lg:col-span-5 space-y-2">
            <div className="rounded-2xl overflow-hidden border border-hair shadow-md bg-white relative w-full h-80 sm:h-96">
              <Image
                src="/media/ocean-hero.jpg"
                alt="Underwater sunlight and shallows"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
            <p className="text-[11px] font-mono text-ink-3 text-right">
              Photo: Matsya Project Team (owner supplied)
            </p>
          </div>
        </div>
      </section>

      {/* 3. OUR SOLUTION FLOW (id features) */}
      <section id="features" className="w-full bg-mist py-20 px-6 sm:px-12 border-b border-hair">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-deep font-semibold">
              The Architecture
            </span>
            <h2 className="font-display italic text-4xl sm:text-5xl text-ink font-normal">
              From video to actionable insight
            </h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              Six automated steps convert ordinary aquarium recordings into transparent, verifiable behavioural telemetry.
            </p>
          </div>

          {/* 6-step flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Upload Clip",
                desc: "Upload a 15–30s tank photo or video clip.",
              },
              {
                step: "02",
                icon: Cpu,
                title: "Preprocessing",
                desc: "Color correction, glare masking and bubble rejection.",
              },
              {
                step: "03",
                icon: Scan,
                title: "Fish Tracking",
                desc: "Assigns persistent IDs and bounding boxes.",
              },
              {
                step: "04",
                icon: Activity,
                title: "Stress Score",
                desc: "Evaluates aggregate kinematic deviations.",
              },
              {
                step: "05",
                icon: Compass,
                title: "Behaviour Audit",
                desc: "Measures speed, turning, isolation and depth.",
              },
              {
                step: "06",
                icon: Lightbulb,
                title: "Suggestions",
                desc: "Delivers concrete, non-diagnostic caretaker advice.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-2xl p-5 bg-white/70 backdrop-blur-sm border border-hair hover:border-azure/40 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-azure">{item.step}</span>
                    <Icon className="w-5 h-5 text-deep" />
                  </div>
                  <div>
                    <h3 className="font-sans font-semibold text-sm text-ink mb-1">{item.title}</h3>
                    <p className="text-xs text-ink-2 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Real product screenshot */}
          <div className="rounded-2xl overflow-hidden border border-hair bg-white p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-hair text-xs font-mono">
              <span className="font-semibold text-deep">Sample result (App analysis view)</span>
              <span className="text-ink-3">Generated from test fixture verification</span>
            </div>
            <div className="relative w-full h-[320px] sm:h-[480px]">
              <Image
                src="/media/sample-result-screen.png"
                alt="Real application analysis result view"
                fill
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-contain rounded-lg border border-hair"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. RECORDINGS, FOOTAGE & HISTORY */}
      <section id="recordings" className="w-full bg-sand py-20 px-6 sm:px-12 border-b border-hair">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-deep font-semibold">
                Workspaces
              </span>
              <h2 className="font-display italic text-3xl sm:text-4xl text-ink font-normal mt-1">
                Recordings & Tank History
              </h2>
            </div>

            {/* Navigation Tabs */}
            <div className="inline-flex rounded-full p-1 bg-mist border border-hair">
              {(["recordings", "footage", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-sans font-medium capitalize transition-all ${
                    activeTab === tab
                      ? "bg-white text-deep shadow-sm"
                      : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {tab === "recordings" ? "AI Recordings" : tab === "footage" ? "Footage" : "Historical Data"}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: AI Recordings */}
            <div className="rounded-2xl p-6 bg-white border border-hair shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-mist flex items-center justify-center text-azure">
                  <Video className="w-5 h-5" />
                </div>
                <h3 className="font-sans font-bold text-base text-ink">AI Recordings</h3>
                <p className="text-xs text-ink-2 leading-relaxed">
                  Exported video tracks with live bounding boxes, trajectory trails, and key moment detection highlights.
                </p>
              </div>
              <a
                href="/app/history"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View AI recordings in history (opens in a new tab)"
                className="inline-flex items-center justify-between text-xs font-medium text-azure hover:text-deep pt-2 border-t border-hair"
              >
                <span>Browse recordings</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Card 2: Footage */}
            <div className="rounded-2xl p-6 bg-white border border-hair shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-mist flex items-center justify-center text-azure">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="font-sans font-bold text-base text-ink">Uploaded Footage</h3>
                <p className="text-xs text-ink-2 leading-relaxed">
                  Original tank clips and uploaded media streams, scoped per tank with metadata on lighting and water temperature.
                </p>
              </div>
              <a
                href="/app/tanks"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View tank media (opens in a new tab)"
                className="inline-flex items-center justify-between text-xs font-medium text-azure hover:text-deep pt-2 border-t border-hair"
              >
                <span>Open tank list</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Card 3: Historical Data */}
            <div className="rounded-2xl p-6 bg-white border border-hair shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-mist flex items-center justify-center text-azure">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-sans font-bold text-base text-ink">Historical Data</h3>
                <p className="text-xs text-ink-2 leading-relaxed">
                  Fish Stress Index (FSI) longitudinal tracking over time to spot slow water quality decay before acute distress.
                </p>
              </div>
              <a
                href="/app/insights"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View FSI insights (opens in a new tab)"
                className="inline-flex items-center justify-between text-xs font-medium text-azure hover:text-deep pt-2 border-t border-hair"
              >
                <span>View FSI trends</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Demo sample trigger */}
          <div className="rounded-2xl p-8 bg-mist/60 border border-hair text-center space-y-3">
            <p className="text-sm text-ink-2">
              {historyItems.length === 0
                ? "No custom tank analyses recorded yet. You can explore the application with synthetic demonstration data."
                : "Explore application features with reproducible synthetic demonstration data."}
            </p>
            <button
              type="button"
              data-testid="cta-sample"
              onClick={handleTrySample}
              disabled={seeding}
              className="px-6 py-2.5 rounded-full bg-deep text-white hover:bg-azure text-xs font-sans font-medium transition-all shadow-sm"
            >
              {seeding ? "Generating..." : "Try a sample (Sample data)"}
            </button>
          </div>
        </div>
      </section>

      {/* 5. DYNAMIC INFORMATION AND CHARTS (Real API data) */}
      <section className="w-full bg-deep text-white py-20 px-6 sm:px-12 border-b border-azure/30">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-foam font-semibold">
              Live System Status
            </span>
            <h2 className="font-display italic text-4xl sm:text-5xl text-white font-normal">
              Real-time Metrics
            </h2>
          </div>

          {/* 3 Stat tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/20 space-y-1">
              <span className="text-xs font-mono text-foam uppercase">Analyses Completed</span>
              <div className="text-3xl font-bold font-sans">
                {loadingData ? "..." : historyItems.length}
              </div>
              <span className="text-[11px] text-white/70">Measured via /api/v1/history</span>
            </div>

            <div className="rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/20 space-y-1">
              <span className="text-xs font-mono text-foam uppercase">Last Stress Score</span>
              <div className="text-3xl font-bold font-sans">
                {loadingData ? "..." : historyItems[0]?.tank_score != null ? `${historyItems[0].tank_score}/100` : "None"}
              </div>
              <span className="text-[11px] text-white/70">
                {historyItems[0]?.level ? `Rating: ${historyItems[0].level}` : "Awaiting first analysis"}
              </span>
            </div>

            <div className="rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/20 space-y-1">
              <span className="text-xs font-mono text-foam uppercase">Active Detector Mode</span>
              <div className="text-3xl font-bold font-sans capitalize">
                {status?.mode || "Baseline"}
              </div>
              <span className="text-[11px] text-white/70">Classical CV (validation active)</span>
            </div>
          </div>

          {/* Stress-score trend chart */}
          <div className="rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-sans font-semibold text-sm text-white">Stress Score Trend (FSI)</h3>
                <span className="text-xs text-foam">Historical index from /api/v1/insights</span>
              </div>
              <span className="text-xs font-mono text-foam">
                {insights?.level ? `Status: ${insights.level}` : "Trend data available"}
              </span>
            </div>

            {insights?.series && insights.series.length > 0 ? (
              <div className="h-32 flex items-end gap-3 pt-6 border-b border-white/20">
                {(insights.series as TrendPoint[]).slice(-10).map((pt: TrendPoint, idx: number) => {
                  const score = pt.score || 0;
                  const heightPercent = Math.max(12, Math.min(100, score));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full rounded-t bg-foam transition-all group-hover:bg-white"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <span className="text-[10px] font-mono text-white/70">{score}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs font-mono text-foam">
                No trend entries recorded yet. Upload a video or generate sample analyses to render points.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. RESOURCES & ABOUT TEASERS */}
      <section className="w-full bg-sand py-20 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-2xl p-8 bg-white border border-hair space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-deep font-semibold">
                Documentation & Literature
              </span>
              <h3 className="font-display italic text-2xl text-ink font-normal">
                Scientific Resource Library
              </h3>
              <p className="text-xs text-ink-2 leading-relaxed">
                Review academic literature on aquatic biomechanics, OpenCV kinematics parameters, and open sample datasets.
              </p>
            </div>
            <Link
              href="/resources"
              className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-azure hover:text-deep pt-4 border-t border-hair"
            >
              <span>Explore resources</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="rounded-2xl p-8 bg-white border border-hair space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-deep font-semibold">
                Academic Stewardship
              </span>
              <h3 className="font-display italic text-2xl text-ink font-normal">
                About the Team & Institution
              </h3>
              <p className="text-xs text-ink-2 leading-relaxed">
                Developed in the Department of Computer Science & Engineering at Atria Institute of Technology, Bengaluru.
              </p>
            </div>
            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-azure hover:text-deep pt-4 border-t border-hair"
            >
              <span>Learn about the project</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
