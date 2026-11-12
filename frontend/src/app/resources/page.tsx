"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  FileText,
  Video,
  Database,
  Cpu,
  Layers,
  Presentation,
  Archive,
  ExternalLink,
  Download,
  Eye,
  X,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  HardDrive,
  Calendar,
} from "lucide-react";
import { api, type ResourceItem, type ResourcesResponse } from "@/lib/api";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { downloadFile } from "@/lib/download";

const CATEGORIES = [
  { id: "all", label: "All Resources", icon: Layers },
  { id: "literature", label: "Literature", icon: FileText },
  { id: "footage", label: "Footage", icon: Video },
  { id: "datasets", label: "Datasets", icon: Database },
  { id: "models", label: "Models", icon: Cpu },
  { id: "design", label: "Design", icon: Layers },
  { id: "presentations", label: "Presentations", icon: Presentation },
  { id: "other", label: "Other", icon: Archive },
];

const TYPES = ["all", "pdf", "video", "csv", "xlsx", "slides", "docx", "image", "model", "notebook", "zip"];

export default function ResourcesPage() {
  const [data, setData] = useState<ResourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState<"featured" | "newest" | "title">("featured");

  // Preview Drawer
  const [activePreview, setActivePreview] = useState<ResourceItem | null>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<string[][] | null>(null);

  const driveUrl = process.env.NEXT_PUBLIC_DRIVE_URL;

  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.listResources({
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        type: selectedType !== "all" ? selectedType : undefined,
        q: search.trim() ? search.trim() : undefined,
      });
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load resource library";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedType, search]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const items = useMemo(() => {
    if (!data?.items) return [];
    const list = [...data.items];
    if (sortBy === "featured") {
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    } else if (sortBy === "newest") {
      list.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sortBy === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [data?.items, sortBy]);

  const openPreview = (item: ResourceItem) => {
    setActivePreview(item);
    if (item.type === "csv" && item.metadata?.preview_rows) {
      setCsvPreviewRows(item.metadata.preview_rows as string[][]);
    } else {
      setCsvPreviewRows(null);
    }
  };

  const closePreview = () => {
    setActivePreview(null);
    setCsvPreviewRows(null);
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 KB";
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  const formatDuration = (sec?: number | null) => {
    if (!sec) return null;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-12 py-16 sm:py-24 space-y-12">
      {/* Editorial Header */}
      <div className="space-y-4">
        <SectionLabel number="RESOURCES" title="DOCUMENTATION & ARTIFACTS" />
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-ink">
              Research & Artifact Library
            </h1>
            <p className="text-base text-ink-2 leading-relaxed">
              Open collection of literature reviews, synthetic benchmark datasets, architecture
              specifications, and video recordings generated and curated during the Matsya project.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-full hairline-panel bg-trench/40 text-xs text-ink-2 self-start lg:self-end">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-aqua" />
              <strong className="text-ink">{data?.total ?? 0}</strong> artifacts
            </span>
            <span className="w-1 h-1 rounded-full bg-ink-3" />
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gold" />
              <strong className="text-ink">{data?.categories?.literature ?? 0}</strong> papers
            </span>
            <span className="w-1 h-1 rounded-full bg-ink-3" />
            <span className="flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-ok" />
              <strong className="text-ink">{data?.categories?.footage ?? 0}</strong> clips
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Left Filter Rail + Right Editorial List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Filter Rail */}
        <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-28">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-3" />
            <input
              type="text"
              data-testid="resource-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, tags, authors..."
              className="w-full pl-9 pr-3 py-2 rounded-md hairline-panel bg-trench/60 text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-aqua"
            />
          </div>

          {/* Category Chips List */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono tracking-widest text-ink-3 uppercase block">
              Categories
            </span>
            <div className="flex flex-row lg:flex-col flex-wrap gap-1">
              {CATEGORIES.map((cat) => {
                const count = cat.id === "all" ? data?.total : data?.categories?.[cat.id] || 0;
                const isSelected = selectedCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    data-testid={`resource-filter-${cat.id}`}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-xs font-mono transition-colors ${
                      isSelected
                        ? "bg-aqua/15 text-aqua font-semibold border border-aqua/30"
                        : "text-ink-2 hover:bg-trench/40 hover:text-ink border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </span>
                    <span className="text-[10px] text-ink-3">({count ?? 0})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type Filter */}
          <div className="space-y-2 pt-2 border-t border-hair">
            <span className="text-[11px] font-mono tracking-widest text-ink-3 uppercase block">
              File Format
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase transition-colors ${
                    selectedType === t
                      ? "bg-aqua text-abyss font-bold"
                      : "bg-trench/60 text-ink-2 hover:text-ink border border-hair"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div className="space-y-2 pt-2 border-t border-hair">
            <span className="text-[11px] font-mono tracking-widest text-ink-3 uppercase block">
              Sort By
            </span>
            <div className="grid grid-cols-3 gap-1">
              {(["featured", "newest", "title"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`py-1 text-center rounded text-[10px] font-mono capitalize transition-colors ${
                    sortBy === s
                      ? "bg-trench text-aqua font-semibold border border-hair-strong"
                      : "text-ink-3 hover:text-ink-2"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Editorial List */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="py-24 text-center space-y-3 hairline-panel p-8">
              <div className="w-6 h-6 border-2 border-aqua border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-ink-3">Accessing resource catalog...</p>
            </div>
          ) : error ? (
            <div className="hairline-panel p-8 text-center space-y-2 border-danger/30 bg-danger/5">
              <AlertCircle className="w-6 h-6 text-danger mx-auto" />
              <p className="text-xs text-danger font-mono">{error}</p>
              <button
                onClick={loadResources}
                className="text-xs text-aqua hover:underline font-mono pt-2"
              >
                Retry Request
              </button>
            </div>
          ) : items.length === 0 ? (
            /* Empty State */
            <div className="hairline-panel p-12 text-center space-y-4 bg-trench/20 border-dashed">
              <Archive className="w-10 h-10 text-ink-3 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-serif text-lg text-ink font-medium">No public resources available</h3>
                <p className="text-xs text-ink-2 max-w-md mx-auto leading-relaxed">
                  No public resources are currently published. Curated literature, datasets, and project files
                  will appear here once ingested and designated public.
                </p>
              </div>
              {driveUrl && (
                <div className="pt-2">
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-trench text-aqua hover:bg-current text-xs font-mono transition-colors border border-hair"
                  >
                    <span>Browse Project Drive Folder</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            /* Resource Cards List */
            <div className="space-y-3">
              {items.map((item) => {
                const durStr = formatDuration(item.duration_s);
                return (
                  <article
                    key={item.id}
                    data-testid={`resource-card-${item.id}`}
                    className="hairline-panel p-5 bg-trench/30 hover:bg-trench/50 transition-all flex flex-col sm:flex-row gap-5 items-start"
                  >
                    {/* Thumbnail */}
                    <div className="w-full sm:w-36 h-24 sm:h-24 rounded-md overflow-hidden bg-abyss flex-shrink-0 border border-hair flex items-center justify-center relative">
                      {item.has_thumb ? (
                        <img
                          src={api.getResourceThumbUrl(item.id)}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 text-ink-3">
                          <FileText className="w-6 h-6 text-aqua" />
                          <span className="text-[9px] font-mono uppercase">{item.type}</span>
                        </div>
                      )}
                      {item.featured && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-gold text-abyss">
                          Featured
                        </span>
                      )}
                    </div>

                    {/* Metadata & Description */}
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-current/40 text-aqua border border-aqua/20">
                          {item.type}
                        </span>
                        <span className="text-xs text-ink-3 font-mono">
                          {item.category}
                        </span>
                        {item.year && (
                          <span className="flex items-center gap-1 text-xs text-ink-3 font-mono">
                            <Calendar className="w-3 h-3" />
                            {item.year}
                          </span>
                        )}
                        {durStr && (
                          <span className="flex items-center gap-1 text-xs text-ink-3 font-mono">
                            <Clock className="w-3 h-3" />
                            {durStr}
                          </span>
                        )}
                        {item.size_bytes > 0 && (
                          <span className="flex items-center gap-1 text-xs text-ink-3 font-mono">
                            <HardDrive className="w-3 h-3" />
                            {formatSize(item.size_bytes)}
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-base text-ink font-semibold leading-snug">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-ink-2 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* Author & Tags */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-ink-3 font-mono">
                        {item.author && <span>By {item.author}</span>}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {item.tags.slice(0, 3).map((tg) => (
                              <span key={tg} className="text-[10px] text-ink-3/80">
                                #{tg}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto items-stretch justify-end self-end sm:self-center flex-shrink-0">
                      {item.has_preview && (
                        <button
                          type="button"
                          data-testid={`resource-view-${item.id}`}
                          onClick={() => openPreview(item)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-current/40 text-aqua hover:bg-current transition-colors border border-aqua/30"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      )}

                      {item.has_file && (
                        <button
                          type="button"
                          data-testid={`resource-download-${item.id}`}
                          onClick={() => downloadFile(`/api/v1/resources/${item.id}/file`, item.title)}
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-trench text-ink hover:text-aqua transition-colors border border-hair"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      )}

                      {!item.has_file && item.external_url && (
                        <a
                          href={item.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-trench text-gold hover:text-white transition-colors border border-gold/30"
                        >
                          <span>Open on Drive</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Library Footer Notice */}
          <div className="pt-8 text-center text-xs text-ink-3 border-t border-hair space-y-2">
            <p>
              Original files are also available in the project folder.{" "}
              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-aqua hover:underline inline-flex items-center gap-1 font-mono"
                >
                  <span>Open Drive Directory</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Viewer Drawer / Modal */}
      {activePreview && (
        <div
          data-testid="resource-preview"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-abyss/85 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-trench rounded-lg hairline-panel border-hair-strong flex flex-col overflow-hidden shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-hair bg-abyss/40">
              <div className="min-w-0 pr-4">
                <span className="text-[10px] font-mono uppercase text-aqua tracking-widest block mb-1">
                  Preview: {activePreview.type}
                </span>
                <h2 className="font-serif text-lg font-semibold text-ink truncate">
                  {activePreview.title}
                </h2>
              </div>
              <button
                onClick={closePreview}
                className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-white/5 transition-colors"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-abyss/60">
              {activePreview.type === "pdf" ? (
                <div className="w-full h-[65vh] rounded border border-hair overflow-hidden bg-white/5">
                  <iframe
                    src={api.getResourcePreviewUrl(activePreview.id)}
                    className="w-full h-full"
                    title={activePreview.title}
                  />
                </div>
              ) : activePreview.type === "video" ? (
                <div className="w-full rounded border border-hair overflow-hidden bg-black flex items-center justify-center">
                  <video
                    controls
                    autoPlay
                    playsInline
                    src={api.getResourcePreviewUrl(activePreview.id)}
                    className="w-full max-h-[60vh]"
                  />
                </div>
              ) : activePreview.type === "image" ? (
                <div className="w-full rounded border border-hair overflow-hidden bg-black flex items-center justify-center p-4">
                  <img
                    src={api.getResourcePreviewUrl(activePreview.id)}
                    alt={activePreview.title}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                </div>
              ) : activePreview.type === "csv" && csvPreviewRows ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono text-ink-3">
                    <span>Preview of first {csvPreviewRows.length} rows:</span>
                    <span>Total rows: {String(activePreview.metadata?.row_count ?? "N/A")}</span>
                  </div>
                  <div className="overflow-x-auto rounded border border-hair">
                    <table className="w-full text-left text-xs font-mono">
                      {Boolean(activePreview.metadata?.columns) && (
                        <thead className="bg-trench text-ink uppercase text-[10px]">
                          <tr>
                            {(activePreview.metadata?.columns as string[]).map((col: string, idx: number) => (
                              <th key={idx} className="py-2 px-3 border-b border-hair">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody className="divide-y divide-hair bg-abyss/40">
                        {csvPreviewRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white/5">
                            {row.map((val, cIdx) => (
                              <td key={cIdx} className="py-1.5 px-3 text-ink-2 truncate max-w-[200px]">
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : activePreview.type === "slides" && activePreview.metadata?.slide_titles ? (
                <div className="space-y-4">
                  <p className="text-xs text-ink-2">Slide structure overview ({String(activePreview.metadata.slide_count ?? "")} slides):</p>
                  <ul className="space-y-2 text-xs font-mono text-ink-2 list-decimal pl-5">
                    {(activePreview.metadata.slide_titles as string[]).map((st: string, idx: number) => (
                      <li key={idx} className="leading-snug">{st}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="space-y-4 text-center py-12">
                  <FileSpreadsheet className="w-12 h-12 text-aqua/60 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="font-serif text-base text-ink">{activePreview.title}</h3>
                    <p className="text-xs text-ink-3 font-mono">
                      Format: {activePreview.type.toUpperCase()} • Size: {formatSize(activePreview.size_bytes)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-hair bg-abyss/40">
              <span className="text-xs font-mono text-ink-3">
                {activePreview.id}
              </span>
              <div className="flex items-center gap-3">
                {activePreview.has_file && (
                  <button
                    onClick={() => downloadFile(`/api/v1/resources/${activePreview.id}/file`, activePreview.title)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-mono bg-aqua text-abyss font-semibold hover:bg-foam transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                )}
                {activePreview.external_url && (
                  <a
                    href={activePreview.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-mono bg-trench text-gold hover:text-white transition-colors border border-gold/30"
                  >
                    <span>Open on Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
