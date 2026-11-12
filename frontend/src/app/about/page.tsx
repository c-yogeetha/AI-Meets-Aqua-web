"use client";

import React from "react";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusChip } from "@/components/ui/StatusChip";
import { Mail, MapPin, Building, ExternalLink } from "lucide-react";

export default function AboutPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  const TEAM_MEMBERS = [
    { name: "C Yogeetha", role: "Project Author & Researcher" },
    { name: "Mamata", role: "Project Author & Researcher" },
    { name: "Sambrama M", role: "Project Author & Researcher" },
    { name: "Lakshmi Chandrashekara", role: "Project Author & Researcher" },
    { name: "M Vijayalaxmi", role: "Faculty Advisor & Guide" },
    { name: "Ropashree D", role: "Faculty Advisor & Guide" },
  ];

  const MILESTONES = [
    {
      date: "August 2026",
      title: "Problem Definition & Literature Survey",
      description: "Explored non-invasive kinematic observation methods for ornamental aquaculture and identified the need for classical computer vision baselines.",
      evidenceLink: "/resources",
      evidenceLabel: "Review Literature",
    },
    {
      date: "September 2026",
      title: "Dataset Generation & Classical Pipeline",
      description: "Built the synthetic benchmark suite of 14 stress conditions and implemented MOG2 background subtraction with circular hue clustering.",
      evidenceLink: "/validation",
      evidenceLabel: "Benchmark Suite",
    },
    {
      date: "October 2026",
      title: "Quality Probing & Reliability Scoring",
      description: "Engineered automated frame quality probing (sharpness, brightness, shake) with honest confidence deductions and transparent caretaker tips.",
      evidenceLink: "/how-it-works#clean",
      evidenceLabel: "Quality Probe",
    },
    {
      date: "November 2026",
      title: "Production Release & Hardening",
      description: "Finalized same-origin architecture, multi-browser ReportLab PDF generation, full test suite coverage, and deployed research interface.",
      evidenceLink: "/science",
      evidenceLabel: "Science Brief",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-12 py-16 sm:py-24 space-y-20">
      {/* Intro Header */}
      <div className="space-y-4">
        <SectionLabel number="ABOUT" title="ORIGIN & INSTITUTION" />
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-ink">
          Non-Invasive Aquatic Kinematic Telemetry
        </h1>
        <p className="text-base text-ink-2 max-w-2xl leading-relaxed">
          Matsya was engineered to bridge classical computer vision research and practical aquatic animal welfare monitoring without expensive specialized hardware.
        </p>
      </div>

      {/* Problem & Objectives */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="hairline-panel p-6 bg-trench/40 space-y-3">
          <h2 className="font-serif text-xl font-medium text-ink">The Problem Statement</h2>
          <p className="text-xs text-ink-2 leading-relaxed">
            Aquarium and aquaculture caretakers struggle to detect physiological distress before irreversible physical damage or mortality occurs. Existing manual visual checks miss subtle alterations in speed, schooling, and depth, while invasive sensor tagging inflicts acute physical trauma on small ornamental fish.
          </p>
        </div>

        <div className="hairline-panel p-6 bg-trench/40 space-y-3">
          <h2 className="font-serif text-xl font-medium text-ink">Core Project Objectives</h2>
          <ul className="text-xs text-ink-2 space-y-2 leading-relaxed list-disc list-inside">
            <li>Develop non-invasive optical tracking requiring only standard RGB video.</li>
            <li>Eliminate cloud API dependencies through deterministic local classical algorithms.</li>
            <li>Provide honest, transparent reliability ratings when video conditions are degraded.</li>
            <li>Generate instant actionable guidance to aid caretakers in water management.</li>
          </ul>
        </div>
      </section>

      {/* Team & Institution */}
      <section className="space-y-6">
        <div className="space-y-1 pb-2 border-b border-hair">
          <div className="font-mono text-xs uppercase tracking-wider text-aqua">Research Team</div>
          <h2 className="font-serif text-2xl font-medium text-ink">Authors & Department</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Team list: editorial styling */}
          <div className="md:col-span-7 hairline-panel p-6 bg-trench/40 divide-y divide-hair">
            {TEAM_MEMBERS.map((member, idx) => (
              <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <div className="font-serif text-base font-medium text-ink">
                    {member.name}
                  </div>
                  <div className="text-xs text-ink-3 font-mono mt-0.5">
                    {member.role}
                  </div>
                </div>
                <span className="font-mono text-xs text-aqua">0{idx + 1}</span>
              </div>
            ))}
          </div>

          {/* Institution card */}
          <div className="md:col-span-5 hairline-panel p-6 bg-trench/60 space-y-4">
            <div className="flex items-center gap-2 text-aqua font-mono text-xs uppercase tracking-wider">
              <Building className="w-4 h-4" />
              <span>Host Institution</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-medium text-ink">
                Department of Computer Science & Engineering
              </h3>
              <p className="text-sm text-ink-2">
                Atria Institute of Technology
              </p>
              <div className="flex items-center gap-1.5 text-xs text-ink-3 pt-1">
                <MapPin className="w-3.5 h-3.5 text-aqua shrink-0" />
                <span>Anandanagar, Bengaluru, Karnataka, India</span>
              </div>
            </div>

            {contactEmail && (
              <div className="pt-3 border-t border-hair">
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-2 text-xs font-mono text-aqua hover:underline"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{contactEmail}</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Milestone Timeline */}
      <section className="space-y-6">
        <div className="space-y-1 pb-2 border-b border-hair">
          <div className="font-mono text-xs uppercase tracking-wider text-aqua">Development Roadmap</div>
          <h2 className="font-serif text-2xl font-medium text-ink">Project Milestones</h2>
        </div>

        <div className="space-y-4">
          {MILESTONES.map((m, idx) => (
            <div
              key={idx}
              className="hairline-panel p-5 bg-trench/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 sm:max-w-xl">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-aqua font-semibold">{m.date}</span>
                  <span className="text-hair-strong">/</span>
                  <span className="text-ink font-medium">{m.title}</span>
                </div>
                <p className="text-xs text-ink-3 leading-relaxed">
                  {m.description}
                </p>
              </div>

              {m.evidenceLink && (
                <Link
                  href={m.evidenceLink}
                  className="text-xs font-mono uppercase tracking-wider text-aqua hover:underline flex items-center gap-1 self-start sm:self-auto shrink-0"
                >
                  <span>{m.evidenceLabel}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Implemented Today vs Planned */}
      <section className="space-y-6">
        <div className="space-y-1 pb-2 border-b border-hair">
          <div className="font-mono text-xs uppercase tracking-wider text-aqua">Maturity Matrix</div>
          <h2 className="font-serif text-2xl font-medium text-ink">Implemented Today vs. Planned</h2>
        </div>

        <div className="hairline-panel overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-hair bg-abyss/60 text-ink-3 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Capability</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Current Scope</th>
                <th className="py-3 px-4">Future Expansion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hair">
              <tr>
                <td className="py-3.5 px-4 font-medium text-ink">Video Ingestion</td>
                <td className="py-3.5 px-4"><StatusChip status="implemented" label="Implemented" /></td>
                <td className="py-3.5 px-4 text-xs text-ink-2">Local file upload up to 200MB, ffprobe verification</td>
                <td className="py-3.5 px-4 text-xs text-ink-3">Direct RTSP IP camera continuous streaming</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-ink">Optical Tracking</td>
                <td className="py-3.5 px-4"><StatusChip status="implemented" label="Implemented" /></td>
                <td className="py-3.5 px-4 text-xs text-ink-2">Classical MOG2 + Hungarian matching + template coasting</td>
                <td className="py-3.5 px-4 text-xs text-ink-3">Fine-tuned YOLOv11 ONNX inference weights</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-ink">Species Support</td>
                <td className="py-3.5 px-4"><StatusChip status="prototype" label="Calibrated" /></td>
                <td className="py-3.5 px-4 text-xs text-ink-2">Common goldfish (Carassius auratus)</td>
                <td className="py-3.5 px-4 text-xs text-ink-3">Discus, angelfish, koi, and zebrafish</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-ink">Water Chemistry</td>
                <td className="py-3.5 px-4"><StatusChip status="planned" label="Planned" /></td>
                <td className="py-3.5 px-4 text-xs text-ink-2">Indirect behavioral proxy inference</td>
                <td className="py-3.5 px-4 text-xs text-ink-3">Hardware sensor telemetry integration (pH, DO, NH3)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
