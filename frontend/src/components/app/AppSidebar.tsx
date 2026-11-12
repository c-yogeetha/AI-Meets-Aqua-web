"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  LayoutDashboard,
  Box,
  Video,
  History,
  LineChart,
  Bell,
  FileText,
  Settings,
  ArrowLeft,
  X,
} from "lucide-react";

interface AppSidebarProps {
  onCloseMobile?: () => void;
}

const NAV_ITEMS = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/tanks", label: "Tanks", icon: Box },
  { href: "/app/analyse", label: "Analyse video", icon: Video },
  { href: "/app/history", label: "History", icon: History },
  { href: "/app/insights", label: "Insights", icon: LineChart },
  { href: "/app/alerts", label: "Alerts", icon: Bell },
  { href: "/app/reports", label: "Reports", icon: FileText },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();

  const { data: systemStatus } = useQuery({
    queryKey: ["system-status"],
    queryFn: () => api.getSystemStatus(),
    refetchInterval: 30000,
  });

  const isActive = (href: string) => {
    if (href === "/app") {
      return pathname === "/app";
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside
      data-testid="app-sidebar"
      className="flex flex-col h-full w-60 bg-abyss border-r border-border/40 select-none"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-14 px-5 border-b border-border/40">
        <Link href="/app" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-lagoon/50 border border-aqua/40 flex items-center justify-center text-aqua group-hover:border-aqua transition-colors">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-aqua stroke-current fill-none stroke-2"
            >
              <path
                d="M3 12C7 7 17 5 21 12C17 19 7 17 3 12Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="17" cy="11.5" r="1" className="fill-aqua" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-sm tracking-wide text-foam">
              MATSYA
            </span>
            <span className="text-[10px] text-foam/50 font-mono leading-none">
              v0.9.0
            </span>
          </div>
        </Link>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-foam/60 hover:text-white hover:bg-white/5"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] uppercase font-mono tracking-widest text-foam/40 px-3 py-1 font-semibold">
          Platform
        </div>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                active
                  ? "bg-lagoon/60 text-aqua border-l-2 border-aqua font-semibold"
                  : "text-foam/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  active ? "text-aqua" : "text-foam/60"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Status & Back to Site */}
      <div className="p-3 border-t border-border/40 space-y-2 bg-trench/40">
        {/* System Status Dot */}
        <div
          data-testid="system-status"
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-abyss/60 border border-border/40 text-[11px]"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-ok" />
            </span>
            <span className="font-mono text-foam/80 capitalize">
              {systemStatus?.mode || "Ready"}
            </span>
          </div>
          <span className="font-mono text-[10px] text-foam/40">
            {systemStatus?.queue_length !== undefined ? `${systemStatus.queue_length} queued` : "active"}
          </span>
        </div>

        {/* Back to Site */}
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-foam/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-foam/60" />
          <span>Back to public site</span>
        </Link>
      </div>
    </aside>
  );
}
