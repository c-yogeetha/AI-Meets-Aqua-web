import React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

export function Footer() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <footer className="w-full border-t border-hair bg-abyss text-ink-2 py-12 px-6 sm:px-12 font-sans text-sm">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand & Sanskrit note */}
        <div className="md:col-span-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl font-semibold text-ink">Matsya</span>
          </div>
          <p className="text-xs text-ink-3 leading-relaxed">
            Matsya, an AI Meets Aqua project: behavioural stress analysis for goldfish using non-invasive classical computer vision.
          </p>
          <p className="text-[11px] font-mono text-ink-3 italic">
            Matsya is the Sanskrit word for fish.
          </p>
          {contactEmail && (
            <div className="pt-2">
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-aqua hover:underline"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{contactEmail}</span>
              </a>
            </div>
          )}
        </div>

        {/* Link Column 1: Site */}
        <div className="space-y-3">
          <div className="font-mono text-xs uppercase tracking-wider text-ink">Site</div>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/" className="hover:text-aqua transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/science" className="hover:text-aqua transition-colors">
                Science & Methodology
              </Link>
            </li>
            <li>
              <Link href="/how-it-works" className="hover:text-aqua transition-colors">
                How It Works
              </Link>
            </li>
            <li>
              <Link href="/resources" className="hover:text-aqua transition-colors">
                Resource Library
              </Link>
            </li>
            <li>
              <Link href="/validation" className="hover:text-aqua transition-colors">
                Validation & Tests
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-aqua transition-colors">
                About & Team
              </Link>
            </li>
          </ul>
        </div>

        {/* Link Column 2: Application */}
        <div className="space-y-3">
          <div className="font-mono text-xs uppercase tracking-wider text-ink">Application</div>
          <ul className="space-y-2 text-xs">
            <li>
              <a
                href="/app"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Dashboard Overview (opens in a new tab)"
                className="hover:text-aqua transition-colors"
              >
                Dashboard Overview
              </a>
            </li>
            <li>
              <a
                href="/app/analyse"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Analyse Video (opens in a new tab)"
                className="hover:text-aqua transition-colors"
              >
                Analyse Video
              </a>
            </li>
            <li>
              <a
                href="/app/tanks"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Tank Management (opens in a new tab)"
                className="hover:text-aqua transition-colors"
              >
                Tank Management
              </a>
            </li>
            <li>
              <a
                href="/app/history"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Analysis History (opens in a new tab)"
                className="hover:text-aqua transition-colors"
              >
                Analysis History
              </a>
            </li>
            <li>
              <a
                href="/app/insights"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="FSI Insights (opens in a new tab)"
                className="hover:text-aqua transition-colors"
              >
                FSI Insights
              </a>
            </li>
            <li>
              <a
                href="/app/settings"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Settings (opens in a new tab)"
                className="hover:text-aqua transition-colors"
              >
                Settings
              </a>
            </li>
          </ul>
        </div>

        {/* Link Column 3: Technical & Institutional */}
        <div className="space-y-3">
          <div className="font-mono text-xs uppercase tracking-wider text-ink">Institution</div>
          <p className="text-xs text-ink-3 leading-relaxed">
            Developed by C Yogeetha, Mamata, Sambrama M, Lakshmi Chandrashekara, M Vijayalaxmi, and Ropashree D.
          </p>
          <p className="text-xs text-ink-3">
            Department of Computer Science & Engineering,<br />
            Atria Institute of Technology, Bengaluru.
          </p>
          <div className="pt-2">
            {process.env.NEXT_PUBLIC_SHOWCASE === "1" ? (
              <a href="/openapi.json" className="text-xs font-mono text-aqua hover:underline">API schema (OpenAPI) &rarr;</a>
            ) : (
              <Link href="/api/docs" className="text-xs font-mono text-aqua hover:underline">API schema (OpenAPI) &rarr;</Link>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer strip */}
      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-hair flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-ink-3">
        <div className="flex flex-wrap items-center gap-4">
          <p className="prose-readable">
            Disclaimer: Behavioural indicators to support caretaker decisions; not a clinical diagnosis.
          </p>
          <a
            href="https://github.com/c-yogeetha/AI-Meets-Aqua-web"
            target="_blank"
            rel="noopener noreferrer"
            className="text-aqua hover:underline"
          >
            GitHub Repository
          </a>
          <Link href="/resources" className="text-aqua hover:underline">
            Data Attributions & Licenses
          </Link>
        </div>
        <p className="font-mono shrink-0">
          Matsya Project &copy; {new Date().getFullYear()} (MIT License)
        </p>
      </div>
    </footer>
  );
}
