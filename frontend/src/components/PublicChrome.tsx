"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { PillNav } from "@/components/ui/PillNav";
import { Footer } from "@/components/ui/Footer";

export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isApp = pathname?.startsWith("/app");

  if (isApp) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-abyss text-ink">
      <PillNav />
      <div className="flex-1 w-full">{children}</div>
      <Footer />
    </div>
  );
}
