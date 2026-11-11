"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api, type Job, ApiError } from "@/lib/api";
import {
  CheckCircle2,
  CircleDot,
  Circle,
  AlertTriangle,
  RotateCcw,
  History,
  Sparkles,
} from "lucide-react";

const STAGES = [
  { id: "cleaning", label: "Cleaning video", testId: "job-stage-cleaning" },
  { id: "detecting", label: "Detecting goldfish", testId: "job-stage-detecting" },
  { id: "tracking", label: "Tracking fish", testId: "job-stage-tracking" },
  { id: "analysing", label: "Analysing behaviour", testId: "job-stage-analysing" },
  { id: "rendering", label: "Preparing report", testId: "job-stage-rendering" },
];

export default function JobProgressPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = typeof params?.id === "string" ? params.id : "";

  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.getJob(jobId),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const data = query.state.data as Job | undefined;
      if (data?.status === "done" || data?.status === "failed") {
        return false;
      }
      return 1500;
    },
  });

  // Redirect to results once done
  useEffect(() => {
    if (job?.status === "done") {
      const timer = setTimeout(() => {
        router.push(`/results/${jobId}`);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [job?.status, jobId, router]);

  // Determine stage index
  const getStageIndex = (stage: string | null | undefined): number => {
    if (!stage) return 0;
    const s = stage.toLowerCase();
    if (s === "queued" || s === "cleaning") return 0;
    if (s === "detecting") return 1;
    if (s === "tracking") return 2;
    if (s === "analysing") return 3;
    if (s === "rendering" || s === "done") return 4;
    return 0;
  };

  const currentStageIndex = getStageIndex(job?.stage);
  const isFailed = job?.status === "failed";
  const isDone = job?.status === "done";
  const progressPercent = job ? Math.min(100, Math.max(0, Math.round(job.progress))) : 0;

  if (isError) {
    const apiErr = error instanceof ApiError ? error : null;
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="glass-card p-10 border-danger/30">
          <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Job Not Found</h2>
          <p className="text-sm text-foam/70 mb-6">
            {apiErr?.status === 404
              ? "The requested analysis job does not exist or has been removed."
              : "An unexpected error occurred while checking job progress."}
          </p>
          <Link
            href="/analyse"
            className="btn-gold px-6 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
          >
            Start New Analysis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <div className="glass-card p-8 sm:p-12 border-white/10 text-center relative overflow-hidden">
        {/* Animated aquatic background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-aqua/10 rounded-full blur-3xl pointer-events-none" />

        {/* Looping Swimming Fish Animation */}
        {!isFailed && (
          <div className="relative h-20 mb-6 flex items-center justify-center">
            <div className="relative animate-bounce duration-1000">
              <span className="text-5xl block transform -scale-x-100">🐟</span>
              <span className="absolute -top-1 -right-2 text-xs text-aqua animate-ping">🫧</span>
              <span className="absolute -bottom-1 -left-2 text-[10px] text-foam/60 animate-pulse">🫧</span>
            </div>
          </div>
        )}

        {isFailed ? (
          /* Failed state */
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-danger/10 border border-danger/30 text-danger flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white mb-2">Analysis Failed</h1>
              <div
                data-testid="job-error"
                className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm max-w-md mx-auto"
              >
                {job?.error || "An error occurred during video analysis."}
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 pt-4">
              <Link
                href="/analyse"
                data-testid="job-retry"
                className="btn-gold px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </Link>
              <Link
                href="/history"
                className="btn-secondary px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                <span>Back to History</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Processing / Done state */
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aqua/10 border border-aqua/30 text-aqua text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isDone
                    ? "Analysis Complete"
                    : isLoading
                    ? "Connecting to engine..."
                    : `Stage: ${job?.stage || "Processing"}`}
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold text-white mb-2">
                {isDone ? "Redirecting to Results..." : "Analysing Tank Video"}
              </h1>
              <p className="text-sm text-foam/70 max-w-md mx-auto">
                Our computer vision pipeline is tracking goldfish paths, measuring velocity, and checking behavioural indicators.
              </p>
            </div>

            {/* Stepper */}
            <div data-testid="job-stepper" className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {STAGES.map((st, idx) => {
                  const isCompleted = isDone || currentStageIndex > idx;
                  const isCurrent = !isDone && currentStageIndex === idx;

                  return (
                    <div
                      key={st.id}
                      data-testid={st.testId}
                      className={`p-3 rounded-xl border text-center transition-all flex sm:flex-col items-center justify-between sm:justify-center gap-2 ${
                        isCompleted
                          ? "bg-ok/10 border-ok/30 text-ok"
                          : isCurrent
                          ? "bg-aqua/15 border-aqua text-aqua shadow-aqua-glow animate-pulse"
                          : "bg-white/5 border-white/10 text-foam/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:flex-col">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-ok" />
                        ) : isCurrent ? (
                          <CircleDot className="w-5 h-5 text-aqua animate-spin" />
                        ) : (
                          <Circle className="w-5 h-5 text-foam/30" />
                        )}
                        <span className="text-xs font-medium leading-tight">{st.label}</span>
                      </div>
                      <span className="text-[10px] sm:hidden font-mono text-foam/60">
                        {idx + 1}/5
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 max-w-md mx-auto pt-2">
              <div className="flex justify-between text-xs text-foam/80">
                <span className="capitalize">{job?.stage || "queued"}</span>
                <span className="font-mono font-semibold text-aqua">{progressPercent}%</span>
              </div>
              <div
                data-testid="job-progress"
                className="w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/10"
              >
                <div
                  className="h-full bg-gradient-to-r from-gold via-aqua to-ok rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
