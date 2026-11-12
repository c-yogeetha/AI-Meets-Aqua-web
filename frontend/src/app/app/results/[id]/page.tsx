"use client";

import React, { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Gauge } from "@/components/ui/Gauge";
import { ReliabilityBadge, type ReliabilityData } from "@/components/ui/ReliabilityBadge";
import { VideoPlayer, type VideoPlayerHandle, type KeyMomentItem } from "@/components/ui/VideoPlayer";
import { TimelineChart, type TimelineDataPoint } from "@/components/ui/TimelineChart";
import { FishRow, type FishItemData } from "@/components/ui/FishRow";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  Download,
  Trash2,
  AlertTriangle,
  Activity,
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

  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
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
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      showToast("Analysis moved to recycle bin (7-day retention)", "info");
      router.push("/app/history");
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
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(seconds);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    try {
      setIsDownloadingPdf(true);
      const filename = `matsya-report-${result.job_id.slice(0, 8)}.pdf`;
      await downloadFile(`/api/v1/results/${result.job_id}/report.pdf`, filename);
      showToast("PDF report downloaded successfully", "success");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to download PDF report";
      showToast(msg, "danger");
    } finally {
      setIsDownloadingPdf(false);
    }
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
          <div className="glass-card p-10 border-border/40">
            <Activity className="w-12 h-12 text-aqua mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold text-foam mb-2">Analysis Still Processing</h2>
            <p className="text-xs text-foam/70 mb-6">
              This video is currently being processed by the computer vision engine.
            </p>
            <Link
              href={`/app/jobs/${jobId}`}
              className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2"
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
            <h2 className="text-xl font-bold text-foam mb-2">Analysis in Recycle Bin</h2>
            <p className="text-xs text-foam/70 mb-6">
              This analysis has been deleted and is stored in the recycle bin.
            </p>
            <Link
              href="/app/history"
              className="btn-secondary px-6 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2"
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
          <h2 className="text-xl font-bold text-foam mb-2">Analysis Not Found</h2>
          <p className="text-xs text-foam/70 mb-6">
            {apiErr?.message || "Could not retrieve analysis result. It may have been permanently removed."}
          </p>
          <Link
            href="/app/analyse"
            className="btn-gold px-6 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2"
          >
            Start New Analysis
          </Link>
        </div>
      </div>
    );
  }

  // Loading skeleton
  if (isLoading || !result) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-aqua mb-3" />
        <span className="text-xs text-foam/60 font-mono">Loading analysis results...</span>
      </div>
    );
  }

  // Data mappings for UI components
  const fishList: FishItemData[] = (result.fish || []).map((f) => {
    const numericId = parseInt(String(f.id).replace(/\D/g, "") || "1", 10);
    return {
      id: numericId,
      fish_id: numericId,
      score: f.score,
      status: f.stressed ? "Stressed" : "Normal",
      stressed: f.stressed,
      flags: f.flags || [],
      explanation: f.explanation || (f.stressed ? "Elevated movement / surface gasping observed." : "Normal swimming behaviour."),
      confidence: f.confidence || 0.95,
      metrics: {
        speed_bl_s: f.metrics?.speed_bl_s,
        erratic_turn_count: f.metrics?.direction_change_rate,
        surface_time_frac: f.metrics?.surface_ratio,
        bottom_time_frac: f.metrics?.bottom_ratio,
        freezing_time_frac: f.metrics?.inactivity_ratio,
        isolation_distance_cm: f.metrics?.isolation_ratio,
      },
    };
  });

  const timelinePoints: TimelineDataPoint[] = (result.timeline || []).map((pt) => ({
    t: pt.t,
    score: pt.score,
  }));

  const keyMoments: KeyMomentItem[] = (result.key_moments || []).map((km) => ({
    time_s: km.t,
    label: km.label,
    description: km.behaviour,
    fish_id: km.fish ? parseInt(String(km.fish).replace(/\D/g, "") || "1", 10) : undefined,
  }));

  const reliabilityData: ReliabilityData | undefined = result.reliability
    ? {
        score: result.reliability.score,
        level: result.reliability.level,
        reasons: result.reliability.reasons || [],
        tips: result.reliability.tips || [],
        metrics: result.reliability.metrics as unknown as Record<string, unknown>,
      }
    : undefined;

  const isDemo = result.mode === "mock";
  const fishTracked = result.fish?.length || result.tank?.goldfish_count || 0;
  const stressedCount = result.fish?.filter((f) => f.stressed).length || 0;

  return (
    <div className="space-y-8">
      {/* 1. Header with Mode, Reliability & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foam">
              {result.tank?.name || "Aquarium Tank"}
            </h1>
            <span data-testid="result-mode">
              <StatusChip
                label={isDemo ? "Sample data" : "Real analysis"}
                status={isDemo ? "mock" : "real"}
              />
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-foam/60">
            <span>
              Recorded:{" "}
              {new Date(result.created_at).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              IST
            </span>
            <span>•</span>
            <span className="capitalize">{result.video?.view || "side"} view</span>
            <span>•</span>
            <span>Job: {result.job_id.slice(0, 8)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Download PDF Button */}
          <button
            data-testid="download-pdf"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="btn-gold px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isDownloadingPdf ? "Generating..." : "Download PDF Report"}</span>
          </button>

          {/* Delete Result */}
          <button
            data-testid="delete-result"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="p-2.5 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
            title="Move to recycle bin"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Transparent Reliability Badge & Advisory Banner (placed above score) */}
      {reliabilityData && (
        <ReliabilityBadge reliability={reliabilityData} />
      )}

      {/* 3. Summary Strip: Gauge & Key Metrics */}
      <div className="glass-card p-6 border-border/40 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        {/* Left: Gauge */}
        <div className="md:col-span-1 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border/30 pb-4 md:pb-0 md:pr-4">
          <Gauge
            score={result.tank_score}
            level={result.level}
            size={160}
          />
          <div className="mt-2 text-center">
            <span
              data-testid="result-score"
              className="font-mono text-2xl font-bold text-foam"
            >
              {result.tank_score}
            </span>
            <span className="text-xs text-foam/50 font-mono"> / 100</span>
            <div
              data-testid="result-level"
              className="text-xs font-mono font-semibold uppercase tracking-wider text-aqua mt-0.5"
            >
              {result.level}
            </div>
          </div>
        </div>

        {/* Right: Quick Spec Grid */}
        <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-lagoon/20 border border-border/30">
            <span className="text-foam/40 block text-[10px] uppercase">Goldfish Tracked</span>
            <span className="font-bold text-foam text-base">
              {fishTracked}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-lagoon/20 border border-border/30">
            <span className="text-foam/40 block text-[10px] uppercase">Stressed Individuals</span>
            <span className="font-bold text-warn text-base">
              {stressedCount}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-lagoon/20 border border-border/30">
            <span className="text-foam/40 block text-[10px] uppercase">Video Duration</span>
            <span className="font-bold text-foam text-base">
              {result.video?.duration_s?.toFixed(1) || "10.0"}s
            </span>
          </div>

          <div className="p-3 rounded-lg bg-lagoon/20 border border-border/30">
            <span className="text-foam/40 block text-[10px] uppercase">Resolution & FPS</span>
            <span className="font-bold text-foam text-base">
              {result.video?.width}x{result.video?.height} @ {result.video?.fps?.toFixed(0)}fps
            </span>
          </div>

          <div className="p-3 rounded-lg bg-lagoon/20 border border-border/30">
            <span className="text-foam/40 block text-[10px] uppercase">Camera Elevation</span>
            <span className="font-bold text-foam text-base capitalize">
              {result.video?.view || "side"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-lagoon/20 border border-border/30">
            <span className="text-foam/40 block text-[10px] uppercase">Engine Execution</span>
            <span className="font-bold text-aqua text-base">
              {result.analysis_time_s?.toFixed(1) || "1.2"}s
            </span>
          </div>
        </div>
      </div>

      {/* 4. 12-Column Analysis Grid: Left 7 Video/Timeline, Right 5 Fish Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Annotated Video & Stress Timeline */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wider text-foam/70">
                Annotated Trajectory Video
              </h2>
              <span className="text-[11px] font-mono text-foam/50">
                Boundaries & Trajectories Overlaid
              </span>
            </div>

            <VideoPlayer
              ref={videoPlayerRef}
              mp4Url={result.annotated_video_url || ""}
              webmUrl={result.annotated_video_alt_url || undefined}
              posterUrl={result.key_moments?.[0]?.frame_url}
              keyMoments={keyMoments}
              onTimeUpdate={(t) => setVideoCurrentTime(t)}
            />
          </div>

          {/* Timeline Chart */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wider text-foam/70">
                Continuous Stress Timeline
              </h2>
              <span className="text-[11px] font-mono text-foam/50">
                Click chart to seek video
              </span>
            </div>

            <TimelineChart
              timeline={timelinePoints}
              currentTime={videoCurrentTime}
              onSeek={handleSeek}
            />
          </div>
        </div>

        {/* Right Column (5 cols): Individual Goldfish Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-foam/70">
              Goldfish Breakdown ({fishList.length})
            </h2>
            <span className="text-[11px] font-mono text-foam/50">
              ID & Metric Profiles
            </span>
          </div>

          <div className="space-y-3">
            {fishList.length === 0 ? (
              <div className="glass-card p-8 text-center border-border/40 text-foam/50 text-xs">
                No individual goldfish trajectories isolated in this video.
              </div>
            ) : (
              fishList.map((fish) => (
                <FishRow key={fish.id} fish={fish} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* 5. Actionable Caretaker Recommendations */}
      {result.suggestions && result.suggestions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border/30">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-foam/70">
              Caretaker Action Recommendations
            </h2>
            <span className="text-[11px] font-mono text-foam/50">
              Deterministic Rule Engine Output
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.suggestions.map((sug, idx) => {
              const isDone = doneSuggestions[idx];
              const isHigh = sug.priority === "high";
              const isMed = sug.priority === "medium";

              return (
                <div
                  key={idx}
                  data-testid={`suggestion-${idx}`}
                  className={`glass-card p-5 border-border/40 transition-all ${
                    isDone ? "opacity-50 bg-white/2" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider ${
                        isHigh
                          ? "bg-danger/20 text-danger border border-danger/30"
                          : isMed
                          ? "bg-warn/20 text-warn border border-warn/30"
                          : "bg-aqua/20 text-aqua border border-aqua/30"
                      }`}
                    >
                      {sug.priority} Priority
                    </span>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono text-foam/60 hover:text-foam">
                      <input
                        type="checkbox"
                        checked={Boolean(isDone)}
                        onChange={() => toggleSuggestionDone(idx)}
                        className="w-3.5 h-3.5 rounded border-border/60 text-aqua focus:ring-0 bg-transparent cursor-pointer"
                      />
                      <span>Done</span>
                    </label>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-foam/40 block text-[10px] font-mono uppercase">
                        Observed Behaviour
                      </span>
                      <p className="text-foam font-medium">{sug.behaviour}</p>
                    </div>

                    <div>
                      <span className="text-foam/40 block text-[10px] font-mono uppercase">
                        Possible Cause
                      </span>
                      <p className="text-foam/80">{sug.cause}</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-lagoon/30 border border-aqua/20 mt-2">
                      <span className="text-aqua block text-[10px] font-mono uppercase font-semibold">
                        Recommended Action
                      </span>
                      <p className="text-foam font-semibold text-xs mt-0.5">{sug.action}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Warnings and Protocol Footnote */}
      <div className="space-y-3 pt-4 border-t border-border/30">
        {result.warnings && result.warnings.length > 0 && (
          <div className="space-y-2">
            {result.warnings.map((warn, idx) => (
              <div
                key={idx}
                data-testid={`warning-${idx}`}
                className="p-3.5 rounded-xl bg-warn/10 border border-warn/30 text-warn text-xs flex items-start gap-2.5 font-mono"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer & Science link */}
        <div className="p-4 rounded-xl bg-abyss border border-border/40 text-foam/60 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 flex-shrink-0 text-aqua mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong>Method note:</strong> Stress scores are derived using four classical behavioural cues:
              surface preference, velocity variance, freezing episodes, and erratic turning.
              View complete thresholds and formulas on the{" "}
              <Link href="/science#scoring" className="text-aqua underline hover:text-foam">
                Science & Scoring Methodology
              </Link>{" "}
              page.
            </p>
            <p className="text-[11px] text-foam/40 pt-1">
              {result.disclaimer ||
                "Matsya provides observational behavioral indicators, not clinical laboratory diagnoses. Verify water chemistry parameters directly."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
