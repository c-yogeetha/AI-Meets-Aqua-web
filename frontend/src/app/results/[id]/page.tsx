"use client";

import React, { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import StressGauge from "@/components/StressGauge";
import StressTimeline from "@/components/StressTimeline";
import {
  Download,
  Trash2,
  AlertTriangle,
  Clock,
  Eye,
  Activity,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { downloadFile } from "@/lib/download";

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = typeof params?.id === "string" ? params.id : "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [expandedFish, setExpandedFish] = useState<Record<string, boolean>>({});
  const [doneSuggestions, setDoneSuggestions] = useState<Record<number, boolean>>({});
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Query result
  const {
    data: result,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["result", jobId],
    queryFn: () => api.getResult(jobId),
    enabled: Boolean(jobId),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.deleteResult(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      showToast("Analysis moved to recycle bin (7-day retention)", "info");
      router.push("/history");
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Failed to delete result";
      showToast(msg, "danger");
    },
  });

  const handleDelete = () => {
    if (window.confirm("Move this analysis to the recycle bin? It can be restored within 7 days.")) {
      deleteMutation.mutate();
    }
  };

  const handleSeek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  const toggleFishExpand = (id: string) => {
    setExpandedFish((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSuggestionDone = (idx: number) => {
    setDoneSuggestions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Error States Handling
  if (isError) {
    const apiErr = error instanceof ApiError ? error : null;

    if (apiErr?.status === 409) {
      return (
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="glass-card p-10 border-white/10">
            <Activity className="w-12 h-12 text-aqua mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold text-white mb-2">Analysis Still Processing</h2>
            <p className="text-sm text-foam/70 mb-6">
              This video is currently being processed by the computer vision engine.
            </p>
            <Link
              href={`/jobs/${jobId}`}
              className="btn-gold px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
            >
              View Processing Progress
            </Link>
          </div>
        </div>
      );
    }

    if (apiErr?.status === 410) {
      return (
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="glass-card p-10 border-danger/30">
            <Trash2 className="w-12 h-12 text-danger mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Analysis in Recycle Bin</h2>
            <p className="text-sm text-foam/70 mb-6">
              This analysis has been deleted and is stored in the recycle bin.
            </p>
            <Link
              href="/history"
              className="btn-secondary px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
            >
              Go to History & Recycle Bin
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div
          data-testid="api-error-banner"
          className="glass-card p-10 border-danger/30"
        >
          <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Analysis Not Found</h2>
          <p className="text-sm text-foam/70 mb-6">
            {apiErr?.message || "Could not retrieve analysis result. It may have been permanently removed."}
          </p>
          <Link
            href="/history"
            className="btn-secondary px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
          >
            Back to History
          </Link>
        </div>
      </div>
    );
  }

  // Loading skeleton
  if (isLoading || !result) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-aqua mb-4" />
        <h2 className="text-lg font-semibold text-white">Loading stress analysis report...</h2>
        <p className="text-xs text-foam/60 mt-1">Calculating behavioural metrics and key frames</p>
      </div>
    );
  }

  const modeBadgeLabel =
    result.mode === "mock"
      ? "Demo data"
      : result.mode === "external"
      ? "AI model"
      : "Baseline analysis";

  const videoSrc = api.apiUrl(result.annotated_video_url || `/api/v1/results/${jobId}/video`);

  const posterSrc =
    result.key_moments && result.key_moments.length > 0
      ? api.apiUrl(result.key_moments[0].frame_url)
      : undefined;

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadFile(api.getPdfUrl(jobId), `matsya-report-${jobId.slice(0, 8)}.pdf`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const stressedCount = result.fish.filter((f) => f.stressed).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header with metadata and primary actions */}
      <div className="glass-card p-6 border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              {result.tank.name}
            </h1>
            <span
              data-testid="result-mode"
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                result.mode === "mock"
                  ? "bg-gold/15 text-gold border-gold/40"
                  : "bg-aqua/15 text-aqua border-aqua/40"
              }`}
            >
              {modeBadgeLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-foam/60">
            <span>Analysed: {new Date(result.created_at).toLocaleString()}</span>
            <span>•</span>
            <span>Job: {result.job_id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            data-testid="download-pdf"
            className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Download PDF</span>
          </button>
          <button
            onClick={handleDelete}
            data-testid="delete-result"
            disabled={deleteMutation.isPending}
            className="px-3 py-2 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* 2. Top Grid: Gauge + Summary Chips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left: Gauge Card */}
        <div className="glass-card p-6 border-white/10 flex flex-col items-center justify-center">
          <h2 className="text-xs uppercase tracking-wider text-aqua font-semibold mb-2">
            Overall Tank Stress Index
          </h2>
          <StressGauge score={result.tank_score} level={result.level} />
        </div>

        {/* Right 2 cols: Summary Chips Grid */}
        <div className="lg:col-span-2 glass-card p-6 border-white/10 flex flex-col justify-between">
          <div>
            <h2 className="text-xs uppercase tracking-wider text-aqua font-semibold mb-4">
              Analysis Highlights
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-foam/60 block">Goldfish Count</span>
                <span className="text-lg font-bold text-white">{result.fish.length}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-foam/60 block">Stressed Fish</span>
                <span className={`text-lg font-bold ${stressedCount > 0 ? "text-danger" : "text-ok"}`}>
                  {stressedCount}
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-foam/60 block">Clip Duration</span>
                <span className="text-lg font-bold text-white">{result.video.duration_s.toFixed(1)}s</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-foam/60 block">Camera Perspective</span>
                <span className="text-lg font-bold text-white capitalize">{result.video.view} view</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 mt-4 flex flex-wrap items-center justify-between text-xs text-foam/70 gap-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-aqua" />
              <span>Engine processing time: {result.analysis_time_s.toFixed(2)}s</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-gold" />
              <span>Resolution: {result.video.width}×{result.video.height}px @ {result.video.fps}fps</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Media Row: Annotated Video Player & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Video Player */}
        <div className="glass-card p-5 border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Annotated Tracking Video</h3>
            <span className="text-[11px] text-foam/60">H.264 MP4 with bounding boxes & trails</span>
          </div>
          <div className="rounded-xl overflow-hidden bg-black/60 border border-white/10 aspect-video flex items-center justify-center relative">
            <video
              ref={videoRef}
              data-testid="result-video"
              controls
              playsInline
              poster={posterSrc}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setVideoCurrentTime(videoRef.current.currentTime);
                }
              }}
              className="w-full h-full object-contain"
            >
              {result.annotated_video_alt_url && (
                <source src={api.apiUrl(result.annotated_video_alt_url)} type="video/webm" />
              )}
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support video playback.
            </video>
          </div>
        </div>

        {/* Timeline Chart */}
        <div>
          <StressTimeline
            timeline={result.timeline}
            fishList={result.fish}
            currentTime={videoCurrentTime}
            onSeek={handleSeek}
          />
        </div>
      </div>

      {/* 4. Fish Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wider uppercase text-aqua">
          Individual Fish Breakdown ({result.fish.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {result.fish.map((fish) => {
            const isExpanded = expandedFish[fish.id];
            const statusLabel = fish.stressed
              ? "Stressed"
              : fish.flags && fish.flags.length > 0
              ? "Watch"
              : "Normal";

            const statusColor =
              statusLabel === "Stressed"
                ? "bg-danger/15 text-danger border-danger/40"
                : statusLabel === "Watch"
                ? "bg-warn/15 text-warn border-warn/40"
                : "bg-ok/15 text-ok border-ok/40";

            return (
              <div
                key={fish.id}
                data-testid={`fish-card-${fish.id}`}
                className="glass-card p-5 border-white/10 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white text-base">{fish.id}</span>
                    <span
                      data-testid={`fish-status-${fish.id}`}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColor}`}
                    >
                      {statusLabel} ({fish.score})
                    </span>
                  </div>

                  {/* Stress Score Bar */}
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full ${
                        fish.score >= 60 ? "bg-danger" : fish.score >= 35 ? "bg-warn" : "bg-ok"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, fish.score))}%` }}
                    />
                  </div>

                  {/* Flag chips */}
                  {fish.flags && fish.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {fish.flags.map((flag) => (
                        <span
                          key={flag}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-foam/90 border border-white/10"
                        >
                          {flag.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Explanation text */}
                  <p className="text-xs text-foam/80 leading-relaxed mb-4">
                    {fish.explanation}
                  </p>
                </div>

                {/* Expandable Metrics */}
                <div className="pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => toggleFishExpand(fish.id)}
                    className="w-full flex items-center justify-between text-xs text-aqua hover:underline"
                  >
                    <span>{isExpanded ? "Hide detailed metrics" : "View behavioural metrics"}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-foam/70 pt-3">
                      <div className="bg-white/5 p-2 rounded-lg">
                        <span className="text-foam/50 block">Speed</span>
                        <span className="font-mono text-white font-semibold">
                          {fish.metrics.speed_bl_s.toFixed(2)} BL/s
                        </span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg">
                        <span className="text-foam/50 block">Turns/sec</span>
                        <span className="font-mono text-white font-semibold">
                          {fish.metrics.direction_change_rate.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg">
                        <span className="text-foam/50 block">Time Alone</span>
                        <span className="font-mono text-white font-semibold">
                          {(fish.metrics.isolation_ratio * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg">
                        <span className="text-foam/50 block">Near Surface</span>
                        <span className="font-mono text-white font-semibold">
                          {(fish.metrics.surface_ratio * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg">
                        <span className="text-foam/50 block">At Bottom</span>
                        <span className="font-mono text-white font-semibold">
                          {(fish.metrics.bottom_ratio * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg">
                        <span className="text-foam/50 block">Inactive Time</span>
                        <span className="font-mono text-white font-semibold">
                          {(fish.metrics.inactivity_ratio * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Key Moments Gallery */}
      {result.key_moments && result.key_moments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-aqua">
            Key Behavioral Moments
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {result.key_moments.map((km, idx) => {
              const frameUrl = km.frame_url.startsWith("http")
                ? km.frame_url
                : `${api.getBaseUrl()}${km.frame_url}`;
              return (
                <div
                  key={idx}
                  data-testid={`key-moment-${idx}`}
                  onClick={() => handleSeek(km.t)}
                  className="glass-card p-2 border-white/10 hover:border-aqua/40 cursor-pointer group transition-all"
                >
                  <div className="aspect-video rounded-lg overflow-hidden bg-black/40 mb-2 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frameUrl}
                      alt={km.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 font-mono text-[9px] text-white">
                      {km.t.toFixed(1)}s
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-white group-hover:text-aqua transition-colors truncate">
                    {km.label}
                  </div>
                  {km.fish && (
                    <div className="text-[10px] text-gold">{km.fish}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Actionable Suggestions */}
      {result.suggestions && result.suggestions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-aqua">
            Actionable Caretaker Recommendations
          </h2>
          <div className="space-y-3">
            {result.suggestions.map((sug, idx) => {
              const isDone = doneSuggestions[idx];
              const priorityBadge =
                sug.priority === "high"
                  ? "bg-danger/20 text-danger border-danger/40"
                  : sug.priority === "medium"
                  ? "bg-warn/20 text-warn border-warn/40"
                  : "bg-aqua/20 text-aqua border-aqua/40";

              return (
                <div
                  key={idx}
                  data-testid={`suggestion-${idx}`}
                  className={`glass-card p-5 border-white/10 transition-all ${
                    isDone ? "opacity-60 bg-white/2" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${priorityBadge}`}>
                          {sug.priority} Priority
                        </span>
                        {sug.fish && sug.fish.length > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-foam/60">
                            <span>Affected:</span>
                            {sug.fish.map((fid) => (
                              <span key={fid} className="font-mono text-gold font-semibold">
                                {fid}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-foam/50 block text-[10px] uppercase font-semibold">Observed Behaviour</span>
                          <span className="text-white font-medium">{sug.behaviour}</span>
                        </div>
                        <div>
                          <span className="text-foam/50 block text-[10px] uppercase font-semibold">Possible Cause</span>
                          <span className="text-foam/80">{sug.cause}</span>
                        </div>
                        <div>
                          <span className="text-foam/50 block text-[10px] uppercase font-semibold">Recommended Action</span>
                          <span className="text-aqua font-medium">{sug.action}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-foam/40 pt-1">
                        Source: {sug.source}
                      </div>
                    </div>

                    {/* Mark as Done Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(isDone)}
                        onChange={() => toggleSuggestionDone(idx)}
                        className="w-4 h-4 rounded border-white/20 text-aqua focus:ring-0 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs text-foam/70 hidden sm:inline">Done</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Warnings and Disclaimer */}
      <div className="space-y-3">
        {result.warnings && result.warnings.length > 0 && (
          <div className="space-y-2">
            {result.warnings.map((warn, idx) => (
              <div
                key={idx}
                data-testid={`warning-${idx}`}
                className="p-3.5 rounded-xl bg-warn/10 border border-warn/30 text-warn text-xs flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        )}

        {/* Care guidance disclaimer */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-foam/60 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 flex-shrink-0 text-aqua mt-0.5" />
          <span>
            <strong>Disclaimer:</strong> {result.disclaimer}
          </span>
        </div>
      </div>
    </div>
  );
}
