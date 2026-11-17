"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  if (process.env.NEXT_PUBLIC_SHOWCASE === "1") {
    const isGallery = pathname === "/app" || pathname === "/app/";
    const isFeaturedResult = /^\/app\/results\/[a-z0-9-]+\/?$/.test(pathname || "");
    const liveUrl = process.env.NEXT_PUBLIC_LIVE_APP_URL;
    return (
      <div className="min-h-screen bg-abyss text-ink">
        <div role="status" data-testid="showcase-read-only-banner" className="border-b border-aqua/30 bg-lagoon/20 px-4 py-3 text-center text-xs text-ink-2">
          <span className="font-semibold text-aqua">Read-only showcase.</span> Uploading, tank changes and deleting analyses are disabled here.
          {liveUrl ? (
            <a href={liveUrl} className="ml-2 inline-flex items-center font-semibold text-aqua underline underline-offset-4">Open live app →</a>
          ) : (
            <span className="ml-2 text-ink-3">The owner has not configured the live app URL.</span>
          )}
        </div>
        {isGallery || isFeaturedResult ? children : (
          <main className="max-w-2xl mx-auto px-6 py-20 text-center space-y-4">
            <h1 className="font-serif text-3xl text-ink">This feature is available in the live app.</h1>
            <p className="text-sm text-ink-2">The static showcase is read-only. It cannot accept uploads, create or edit tanks, or delete results.</p>
            {liveUrl ? <a href={liveUrl} className="btn-primary-gold inline-flex px-5 py-3 text-xs font-mono uppercase tracking-wider">Open live app</a> : <p className="text-xs text-ink-3">Live app URL is not configured.</p>}
            <div><Link href="/app" className="text-xs font-mono text-aqua hover:underline">Return to featured analyses</Link></div>
          </main>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-abyss text-ink overflow-hidden font-sans">
      {/* Desktop Fixed Left Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-abyss/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-abyss border-r border-border/40 z-10 animate-in slide-in-from-left duration-200">
            <AppSidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppTopbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
