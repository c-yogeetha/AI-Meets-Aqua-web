"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusChip } from "@/components/ui/StatusChip";
import { ARCHITECTURE_NODES, type ArchitectureNode } from "@/content/architecture";
import { api, type SystemStatusResponse } from "@/lib/api";
import { ExternalLink } from "lucide-react";

export default function HowItWorksPage() {
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(ARCHITECTURE_NODES[0]);
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);

  useEffect(() => {
    api
      .getSystemStatus()
      .then(setSystemStatus)
      .catch(() => {});
  }, []);

  const activeMode = systemStatus?.mode || "baseline";

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-12 py-16 sm:py-24 space-y-20">
      {/* Intro Header */}
      <div className="space-y-4">
        <SectionLabel number="ENGINEERING" title="SYSTEM ARCHITECTURE & PIPELINE" />
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-ink">
          From Raw Aquarium Video to Actionable Insight
        </h1>
        <p className="text-base text-ink-2 max-w-2xl leading-relaxed">
          Matsya decomposes complex aquatic video into six discrete, deterministic stages without reliance on cloud inference or proprietary external APIs.
        </p>
      </div>

      {/* Interactive Architecture Diagram */}
      <section id="architecture" className="space-y-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2 border-b border-hair">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-aqua">Interactive Architecture</div>
            <h2 className="font-serif text-2xl font-medium text-ink mt-0.5">Subsystem Topology</h2>
          </div>
          <Link
            href="/api/docs"
            className="text-xs font-mono uppercase tracking-wider text-aqua hover:underline flex items-center gap-1"
          >
            <span>API reference (OpenAPI)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SVG Diagram Canvas */}
          <div className="lg:col-span-7 hairline-panel p-6 bg-trench/40 space-y-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-3">
              Click any subsystem block to inspect its specification:
            </div>

            <div className="space-y-3">
              {ARCHITECTURE_NODES.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNode(node)}
                    className={`w-full p-3.5 rounded border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-aqua bg-deep/80 shadow-md ring-1 ring-aqua"
                        : "border-hair bg-abyss hover:border-hair-strong hover:bg-abyss/80"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                          {node.layer}
                        </span>
                        <span className="text-hair-strong">/</span>
                        <span className="font-medium text-ink text-sm">{node.name}</span>
                      </div>
                      <div className="text-xs text-ink-3 font-mono mt-0.5">
                        {node.technology}
                      </div>
                    </div>
                    <StatusChip status={node.status} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Node Inspector Panel */}
          <div className="lg:col-span-5 hairline-panel p-6 bg-trench/60 space-y-4">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-hair">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-aqua">
                      Subsystem Detail ({selectedNode.layer})
                    </span>
                    <h3 className="font-serif text-xl font-medium text-ink mt-0.5">
                      {selectedNode.name}
                    </h3>
                  </div>
                  <StatusChip status={selectedNode.status} />
                </div>

                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3 block mb-1">
                    Description & Role
                  </span>
                  <p className="text-xs text-ink-2 leading-relaxed">
                    {selectedNode.description}
                  </p>
                </div>

                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3 block mb-1">
                    Technology Stack
                  </span>
                  <div className="font-mono text-xs text-aqua p-2 rounded bg-abyss border border-hair">
                    {selectedNode.technology}
                  </div>
                </div>

                <div>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3 block mb-1">
                    Source Code Location
                  </span>
                  <div className="font-mono text-xs text-ink-2 p-2 rounded bg-abyss border border-hair">
                    {selectedNode.fileLocation}
                  </div>
                </div>

                {selectedNode.inputs && (
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3 block mb-1">
                      Data Inputs
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.inputs.map((inp, idx) => (
                        <span
                          key={idx}
                          className="font-mono text-[10px] px-2 py-0.5 rounded bg-abyss border border-hair text-ink-3"
                        >
                          {inp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs font-mono text-ink-3">
                Select a subsystem from the topology diagram.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Analyzer Modes Table */}
      <section id="modes" className="space-y-6 scroll-mt-24">
        <div className="space-y-1 pb-2 border-b border-hair">
          <div className="font-mono text-xs uppercase tracking-wider text-aqua">Execution Strategies</div>
          <h2 className="font-serif text-2xl font-medium text-ink">Analyzer Modes Comparison</h2>
          <p className="text-xs text-ink-3">
            Matsya provides configurable analysis backends. The currently active server mode is highlighted.
          </p>
        </div>

        <div className="hairline-panel overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-hair bg-abyss/60 text-ink-3 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Analyzer Mode</th>
                <th className="py-3 px-4">Status & State</th>
                <th className="py-3 px-4">Algorithm & Mechanism</th>
                <th className="py-3 px-4">Suitability & Dependencies</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hair">
              <tr className={activeMode === "baseline" ? "bg-aqua/5 font-medium" : ""}>
                <td className="py-3.5 px-4">
                  <div className="font-mono text-ink">baseline</div>
                  {activeMode === "baseline" && (
                    <span className="text-[10px] font-mono text-aqua font-semibold uppercase">
                      (ACTIVE MODE)
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <StatusChip status="implemented" label="Implemented" />
                </td>
                <td className="py-3.5 px-4 text-xs text-ink-2">
                  Fused 3-cue: MOG2 motion subtractor + circular hue clustering + distance transform watershed splitting + template coasting.
                </td>
                <td className="py-3.5 px-4 text-xs text-ink-3">
                  Production ready. Requires zero external GPU or neural network weights. Pure OpenCV.
                </td>
              </tr>
              <tr className={activeMode === "onnx" ? "bg-aqua/5 font-medium" : ""}>
                <td className="py-3.5 px-4">
                  <div className="font-mono text-ink">onnx</div>
                  {activeMode === "onnx" && (
                    <span className="text-[10px] font-mono text-aqua font-semibold uppercase">
                      (ACTIVE MODE)
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <StatusChip status="prototype" label="Integrated / Awaiting weights" />
                </td>
                <td className="py-3.5 px-4 text-xs text-ink-2">
                  ONNX Runtime inference with YOLOv8/v11 architecture trained on annotated goldfish datasets.
                </td>
                <td className="py-3.5 px-4 text-xs text-ink-3">
                  Awaits trained checkpoint in <code className="text-aqua">weights/matsya_detector.onnx</code>. Falls back to baseline if absent.
                </td>
              </tr>
              <tr className={activeMode === "external" ? "bg-aqua/5 font-medium" : ""}>
                <td className="py-3.5 px-4">
                  <div className="font-mono text-ink">external</div>
                  {activeMode === "external" && (
                    <span className="text-[10px] font-mono text-aqua font-semibold uppercase">
                      (ACTIVE MODE)
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <StatusChip status="implemented" label="Implemented" />
                </td>
                <td className="py-3.5 px-4 text-xs text-ink-2">
                  Subprocess adapter delegating frame processing to an external research binary or harness.
                </td>
                <td className="py-3.5 px-4 text-xs text-ink-3">
                  Used for benchmarking against legacy academic command-line tools.
                </td>
              </tr>
              <tr className={activeMode === "mock" ? "bg-aqua/5 font-medium" : ""}>
                <td className="py-3.5 px-4">
                  <div className="font-mono text-ink">mock</div>
                  {activeMode === "mock" && (
                    <span className="text-[10px] font-mono text-aqua font-semibold uppercase">
                      (ACTIVE MODE)
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <StatusChip status="mock" label="Mock" />
                </td>
                <td className="py-3.5 px-4 text-xs text-ink-2">
                  Deterministic synthetic trajectory generator mimicking normal swimming and darting.
                </td>
                <td className="py-3.5 px-4 text-xs text-ink-3">
                  Fast unit test execution and offline UI development without video decoding overhead.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Six Pipeline Chapters */}
      <section id="chapters" className="space-y-16">
        <div className="space-y-2 pb-2 border-b border-hair">
          <div className="font-mono text-xs uppercase tracking-wider text-aqua">Detailed Walkthrough</div>
          <h2 className="font-serif text-3xl font-medium text-ink">The Six Processing Chapters</h2>
        </div>

        {/* Chapter 1: Upload */}
        <div id="upload" className="space-y-4 scroll-mt-24">
          <SectionLabel number="01" title="UPLOAD & INGESTION" />
          <h3 className="font-serif text-2xl font-medium text-ink">Container Validation & Probe</h3>
          <p className="text-sm text-ink-2 leading-relaxed prose-readable">
            When a video is submitted, the backend streams the file directly to disk while validating container integrity with <code className="text-aqua">ffprobe</code>. It verifies video codecs (H.264, VP9, HEVC), checks dimension constraints (minimum 320x240, maximum 4K), and reads duration and frame rates.
          </p>
        </div>

        {/* Chapter 2: Clean */}
        <div id="clean" className="space-y-4 scroll-mt-24">
          <SectionLabel number="02" title="CLEAN & QUALITY PROBE" />
          <h3 className="font-serif text-2xl font-medium text-ink">Video Quality Gate & Reliability Rating</h3>
          <p className="text-sm text-ink-2 leading-relaxed prose-readable">
            Before tracking commences, <code className="text-aqua">quality.py</code> probes 5 sample frames across the duration. It measures mean brightness (HSV Value), contrast (RMS deviation), sharpness (Laplacian variance), and camera stability (phase correlation translation). It assigns a transparent reliability rating (0–100, High/Medium/Low) with specific deduction reasons and tips.
          </p>
        </div>

        {/* Chapter 3: Detect */}
        <div id="detect" className="space-y-4 scroll-mt-24">
          <SectionLabel number="03" title="DETECT" />
          <h3 className="font-serif text-2xl font-medium text-ink">Fused 3-Cue Candidate Extraction</h3>
          <p className="text-sm text-ink-2 leading-relaxed prose-readable">
            Fish detection integrates three complementary cues: MOG2 motion segmentation, circular k-means hue clustering restricted to goldfish orange/red and white/silver spectrums, and local contrast masking. Merged fish blobs are split using distance-transform local maxima seeds with watershed segmentation.
          </p>
        </div>

        {/* Chapter 4: Track */}
        <div id="track" className="space-y-4 scroll-mt-24">
          <SectionLabel number="04" title="TRACK" />
          <h3 className="font-serif text-2xl font-medium text-ink">Hungarian Data Association & Template Coasting</h3>
          <p className="text-sm text-ink-2 leading-relaxed prose-readable">
            Detected bounding boxes are associated across consecutive frames using the Hungarian algorithm, balancing Euclidean centroid distance, bounding box aspect ratio, and Bhattacharyya distance between HSV color histograms. When a fish rests stationary, template matching coasts the track for up to 12 seconds with zero velocity attribution.
          </p>
        </div>

        {/* Chapter 5: Score */}
        <div id="score" className="space-y-4 scroll-mt-24">
          <SectionLabel number="05" title="SCORE" />
          <h3 className="font-serif text-2xl font-medium text-ink">Kinematic Feature Extraction & Rule Scoring</h3>
          <p className="text-sm text-ink-2 leading-relaxed prose-readable">
            Continuous trajectories are discretized into 5-second sliding windows. Kinematic metrics (mean and peak body-length speed, acute turns per second, surface lingering ratio, and nearest-neighbor distance) are matched against deterministic rules from <code className="text-aqua">config/scoring.yaml</code> to assign penalties.
          </p>
        </div>

        {/* Chapter 6: Advise */}
        <div id="advise" className="space-y-4 scroll-mt-24">
          <SectionLabel number="06" title="ADVISE" />
          <h3 className="font-serif text-2xl font-medium text-ink">Context-Aware Caretaker Recommendations</h3>
          <p className="text-sm text-ink-2 leading-relaxed prose-readable">
            Observed behavioural anomalies trigger prioritized action items from <code className="text-aqua">config/rules.yaml</code>. Caretakers receive practical steps such as verifying aerator performance for surface gasping, checking ammonia and nitrite levels for erratic darting, or assessing conspecific aggression for isolated fish.
          </p>
        </div>
      </section>
    </div>
  );
}
