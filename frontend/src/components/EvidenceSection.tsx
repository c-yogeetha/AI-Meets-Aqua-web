"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Video, Table, BookOpen } from "lucide-react";

export interface ResourceItem {
  id: string;
  title: string;
  category: string;
  type: "pdf" | "video" | "csv" | "document" | string;
  description: string;
  date?: string;
  download_url?: string;
  external_url?: string;
}

export function EvidenceSection() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/resources?featured=true")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setResources(data.slice(0, 4));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getIcon = (type?: string) => {
    switch ((type || "").toLowerCase()) {
      case "video":
        return <Video className="w-4 h-4 text-aqua" />;
      case "csv":
      case "table":
        return <Table className="w-4 h-4 text-warn" />;
      case "pdf":
      default:
        return <FileText className="w-4 h-4 text-ink-2" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-aqua block mb-1">
            Documentation & Evidence
          </span>
          <h3 className="font-serif text-2xl font-medium text-ink">
            Featured Research Materials
          </h3>
        </div>
        <Link
          href="/resources"
          className="text-xs font-mono uppercase tracking-wider text-aqua hover:underline flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>Browse the library</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="hairline-panel p-8 text-center text-xs font-mono text-ink-3">
          Loading evidence catalog...
        </div>
      ) : resources.length === 0 ? (
        <div className="hairline-panel p-8 text-center space-y-2 bg-trench/30">
          <BookOpen className="w-8 h-8 text-ink-3 mx-auto" />
          <p className="text-sm text-ink-2 font-medium">Resource library catalog initialized</p>
          <p className="text-xs text-ink-3 max-w-md mx-auto">
            Technical briefs, benchmark sheets, and calibration datasets will be available in the resource library.
          </p>
          <div className="pt-2">
            <Link
              href="/resources"
              className="btn-secondary-aqua text-xs font-mono uppercase tracking-wider py-1.5 px-4"
            >
              Open Resource Library
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {resources.map((item) => (
            <div
              key={item.id}
              className="hairline-panel p-4 flex flex-col justify-between hover:border-aqua/40 transition-colors bg-trench/40"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono uppercase text-[10px] text-ink-3 px-1.5 py-0.5 rounded bg-abyss border border-hair">
                    {item.category}
                  </span>
                  {getIcon(item.type)}
                </div>
                <h4 className="font-sans font-medium text-ink text-sm leading-snug">
                  {item.title}
                </h4>
                <p className="text-xs text-ink-3 line-clamp-3 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-hair flex items-center justify-between text-[11px] font-mono">
                <span className="text-ink-3">{item.date || "Recent"}</span>
                <Link
                  href="/resources"
                  className="text-aqua hover:underline flex items-center gap-1"
                >
                  View &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
