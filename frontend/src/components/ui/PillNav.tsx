"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ExternalLink } from "lucide-react";

const NAV_LINKS = [
  { name: "Science", href: "/science", testId: "nav-science" },
  { name: "How it works", href: "/how-it-works", testId: "nav-how-it-works" },
  { name: "Resources", href: "/resources", testId: "nav-resources" },
  { name: "Validation", href: "/validation", testId: "nav-validation" },
  { name: "About", href: "/about", testId: "nav-about" },
];

export function PillNav() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const driveUrl = process.env.NEXT_PUBLIC_DRIVE_URL;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Trap focus & Escape key for mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  return (
    <>
      <header className="fixed top-5 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
        <nav
          data-testid="pill-nav"
          className={`pointer-events-auto flex items-center justify-between gap-4 sm:gap-8 rounded-full border border-hair backdrop-blur-md bg-trench/80 shadow-lg px-4 sm:px-6 transition-all duration-200 max-w-5xl w-full ${
            isScrolled ? "py-2 shadow-2xl" : "py-3"
          }`}
        >
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-aqua group-hover:scale-105 transition-transform"
              aria-hidden="true"
            >
              <path
                d="M4 16C10 9 24 6 29 16C24 26 10 23 4 16Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="23" cy="15" r="1.5" fill="currentColor" />
              <path
                d="M26 16L30 12M26 16L30 20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-serif text-lg font-semibold tracking-tight text-ink group-hover:text-foam">
              Matsya
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 font-sans text-sm">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-testid={link.testId}
                  className={`relative py-1 transition-colors ${
                    isActive ? "text-aqua font-medium" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-aqua rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            {driveUrl && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="drive-link"
                className="text-xs font-mono uppercase tracking-wider text-ink-3 hover:text-aqua flex items-center gap-1 transition-colors"
              >
                <span>Project files</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Link
              href="/app"
              data-testid="nav-open-app"
              className="btn-primary-gold text-xs uppercase font-mono tracking-wider py-1.5 px-4"
            >
              Open app
            </Link>
          </div>

          {/* Mobile hamburger button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            className="md:hidden p-1.5 rounded-full text-ink-2 hover:text-ink hover:bg-hair"
          >
            {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-50 bg-abyss/95 backdrop-blur-lg flex flex-col p-6 md:hidden animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-6 border-b border-hair">
            <Link
              href="/"
              onClick={() => setDrawerOpen(false)}
              className="font-serif text-xl font-semibold text-ink"
            >
              Matsya
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="p-2 text-ink-2 hover:text-ink rounded-full hover:bg-hair"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col gap-4 py-8 flex-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-testid={`${link.testId}-mobile`}
                  onClick={() => setDrawerOpen(false)}
                  className={`text-lg font-serif py-2 border-b border-hair/40 ${
                    isActive ? "text-aqua font-semibold" : "text-ink-2"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            {driveUrl && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="drive-link-mobile"
                className="text-sm font-mono text-ink-3 hover:text-aqua flex items-center gap-2 py-2"
              >
                <span>Project files</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          <div className="pt-6 border-t border-hair">
            <Link
              href="/app"
              onClick={() => setDrawerOpen(false)}
              className="btn-primary-gold w-full text-center py-3 text-sm uppercase font-mono tracking-wider"
            >
              Open app
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
