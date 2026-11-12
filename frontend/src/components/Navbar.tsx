"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Sparkles, Check, Settings as SettingsIcon, AlertCircle, Fish } from "lucide-react";
import { api, type Alert } from "@/lib/api";
import { showToast } from "@/lib/toast";

export default function Navbar() {
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [openAlerts, setOpenAlerts] = useState(false);
  const knownAlertIdsRef = useRef<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll alerts every 5 seconds
  useEffect(() => {
    let mounted = true;

    async function checkAlerts() {
      try {
        const unread = await api.listAlerts(true);
        if (!mounted) return;

        // Check for newly arrived alerts
        const prevIds = knownAlertIdsRef.current;
        if (prevIds.size > 0) {
          for (const alert of unread) {
            if (!prevIds.has(alert.id)) {
              showToast(alert.message, alert.severity === "critical" ? "danger" : "warn", "Tank Stress Alert");
            }
          }
        }
        knownAlertIdsRef.current = new Set(unread.map((a) => a.id));
        setAlerts(unread);
      } catch {
        // Silently tolerate backend offline
      }
    }

    checkAlerts();
    const interval = setInterval(checkAlerts, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenAlerts(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (alertId: string) => {
    try {
      await api.markAlertRead(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {
      // Ignored
    }
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/tanks", label: "Tanks" },
    { href: "/analyse", label: "Analyse", testId: "nav-analyse" },
    { href: "/history", label: "History", testId: "nav-history" },
    { href: "/testing", label: "Testing", testId: "nav-testing" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-abyss/80 border-b border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-gold to-aqua flex items-center justify-center p-0.5 shadow-gold-glow">
            <div className="w-full h-full bg-abyss rounded-[10px] flex items-center justify-center">
              <Fish className="w-5 h-5 text-aqua" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg tracking-tight text-white group-hover:text-aqua transition-colors">
              Matsya
            </span>
            <span className="text-[10px] uppercase tracking-wider text-foam/60 font-semibold -mt-1 font-mono">
              Fish Stress Pipeline
            </span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                data-testid={link.testId}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "text-aqua bg-white/5"
                    : "text-foam/80 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right action group */}
        <div className="flex items-center gap-3">
          {/* Alert bell dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpenAlerts(!openAlerts)}
              data-testid="alert-bell"
              className="relative p-2 rounded-lg text-foam/80 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {alerts.length > 0 && (
                <span
                  data-testid="alert-badge"
                  className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                >
                  {alerts.length > 9 ? "9+" : alerts.length}
                </span>
              )}
            </button>

            {openAlerts && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-deep border border-white/10 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 px-1">
                  <span className="font-semibold text-xs tracking-wider uppercase text-foam/80">
                    Active Alerts
                  </span>
                  <Link
                    href="/settings"
                    onClick={() => setOpenAlerts(false)}
                    className="text-xs text-aqua hover:underline flex items-center gap-1"
                  >
                    <SettingsIcon className="w-3 h-3" /> Settings
                  </Link>
                </div>

                <div className="py-2 max-h-72 overflow-y-auto space-y-2">
                  {alerts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-foam/50">
                      No active stress alerts. All tanks clear!
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                          alert.severity === "critical"
                            ? "bg-danger/10 border-danger/30 text-danger"
                            : "bg-warn/10 border-warn/30 text-warn"
                        }`}
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-white/90 leading-relaxed">{alert.message}</p>
                          <span className="text-[10px] text-foam/50 block mt-1">
                            {new Date(alert.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleMarkRead(alert.id)}
                          title="Mark as read"
                          className="p-1 rounded hover:bg-white/10 text-foam/70 hover:text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Analyse CTA button */}
          <Link
            href="/analyse"
            className="btn-gold px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-gold-glow"
          >
            <Sparkles className="w-4 h-4 text-abyss" />
            <span>Analyse Video</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
