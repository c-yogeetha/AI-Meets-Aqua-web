"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Menu,
  Bell,
  Sparkles,
  Video,
  ChevronRight,
} from "lucide-react";
import { showToast } from "@/lib/toast";

interface AppTopbarProps {
  onOpenMobileMenu: () => void;
}

export function AppTopbar({ onOpenMobileMenu }: AppTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSeeding, setIsSeeding] = useState(false);

  // Alerts query for unread badge
  const { data: alerts } = useQuery({
    queryKey: ["alerts", "unread"],
    queryFn: () => api.listAlerts(true),
    refetchInterval: 15000,
  });

  // System status query
  const { data: systemStatus } = useQuery({
    queryKey: ["system-status"],
    queryFn: () => api.getSystemStatus(),
  });

  const unreadAlertsCount = alerts?.length || 0;

  // Breadcrumbs title helper
  const getPageTitle = () => {
    if (pathname === "/app") return "Overview";
    if (pathname?.startsWith("/app/tanks")) return "Tanks";
    if (pathname?.startsWith("/app/analyse")) return "Analyse Video";
    if (pathname?.startsWith("/app/jobs")) return "Analysis Progress";
    if (pathname?.startsWith("/app/results")) return "Analysis Result";
    if (pathname?.startsWith("/app/history")) return "History & Recycle Bin";
    if (pathname?.startsWith("/app/insights")) return "Insights & Trends";
    if (pathname?.startsWith("/app/alerts")) return "Alert Center";
    if (pathname?.startsWith("/app/reports")) return "Report Center";
    if (pathname?.startsWith("/app/settings")) return "Settings";
    return "Matsya";
  };

  const handleSeedDemo = async () => {
    try {
      setIsSeeding(true);
      const seed = await api.seedDemo();
      queryClient.invalidateQueries({ queryKey: ["tanks"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      showToast("Sample tank and analyses loaded", "success");
      const targetId = seed.result_ids?.[0];
      if (targetId) {
        router.push(`/app/results/${targetId}`);
      }
    } catch {
      showToast("Could not load sample demo data", "danger");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <header
      data-testid="app-topbar"
      className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-abyss/85 backdrop-blur-md border-b border-border/40 select-none"
    >
      {/* Left: Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-lg text-foam/70 hover:text-white hover:bg-white/5"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-mono">
          <Link
            href="/app"
            className="text-foam/50 hover:text-foam transition-colors hidden sm:inline"
          >
            app
          </Link>
          <ChevronRight className="w-3 h-3 text-foam/30 hidden sm:inline" />
          <span className="text-foam font-semibold">{getPageTitle()}</span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* System Status dot in topbar */}
        <div
          data-testid="system-status"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lagoon/30 border border-border/40 text-[11px] font-mono text-foam/70"
          title={`Analyzer mode: ${systemStatus?.mode || "standard"}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-ok" />
          <span>{systemStatus?.mode || "ready"}</span>
        </div>

        {/* Try a sample CTA */}
        <button
          data-testid="cta-sample"
          onClick={handleSeedDemo}
          disabled={isSeeding}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gold/40 bg-gold/10 hover:bg-gold/20 text-gold text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Try a sample</span>
          <span className="sm:hidden">Sample</span>
        </button>

        {/* Analyse Video CTA */}
        <Link
          href="/app/analyse"
          className="btn-gold hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
        >
          <Video className="w-3.5 h-3.5" />
          <span>Analyse</span>
        </Link>

        {/* Alerts Bell */}
        <Link
          href="/app/alerts"
          data-testid="alert-bell"
          className="relative p-2 rounded-lg text-foam/70 hover:text-white hover:bg-white/5 transition-colors"
          aria-label={`Alerts (${unreadAlertsCount} unread)`}
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span
              data-testid="alert-badge"
              className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-mono font-bold leading-none animate-pulse"
            >
              {unreadAlertsCount > 9 ? "9+" : unreadAlertsCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
