import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-abyss/90 backdrop-blur-md py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🐟</span>
              <span className="font-display font-bold text-lg text-white">AI Meets Aqua</span>
            </div>
            <p className="text-sm text-foam/70 leading-relaxed max-w-sm">
              Computer vision and behavioural analysis for early goldfish stress detection in shared aquatic tanks.
            </p>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wider text-aqua font-semibold mb-3">
              Project Team
            </h4>
            <div className="text-sm text-foam/80 space-y-1">
              <p>C Yogeetha, Mamata, Sambrama M</p>
              <p>Lakshmi Chandrashekara, M Vijayalaxmi, Ropashree D</p>
              <p className="text-xs text-foam/50 pt-1">
                Atria Institute of Technology, Department of CSE
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-wider text-aqua font-semibold mb-3">
              Navigation
            </h4>
            <ul className="text-sm text-foam/70 space-y-1.5">
              <li>
                <Link href="/" className="hover:text-aqua transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/analyse" className="hover:text-aqua transition-colors">
                  Analyse Tank Video
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-aqua transition-colors">
                  History & Recycle Bin
                </Link>
              </li>
              <li>
                <Link href="/testing" className="hover:text-aqua transition-colors">
                  System Testing & Verification
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-aqua transition-colors">
                  Alert Preferences
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-foam/50 gap-4">
          <div>© 2026 AI Meets Aqua. Built for SIP / CIE 2026.</div>
          <div className="flex items-center gap-4">
            <span>Atria Institute of Technology</span>
            <span>•</span>
            <span>Department of CSE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
