"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { api, type Job, ApiError } from "@/lib/api";
import {
  CheckCircle2,
  CircleDot,
  Circle,
  AlertTriangle,
  RotateCcw,
  History,
  Activity,
  XCircle,
} from "lucide-react";
import { showToast } from "@/lib/toast";

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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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
      if (data?.status === "done" || data?.status === "failed" || data?.status === "cancelled") {
        return false;
      }
      return 1500;
    },
  });

  // Track elapsed seconds
  useEffect(() => {
    if (job?.status === "done" || job?.status === "failed" || job?.status === "cancelled") {
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [job?.status]);

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () => api.cancelJob(jobId),
    onSuccess: () => {
      showToast("Analysis cancelled", "info");
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Failed to cancel job";
      showToast(msg, "danger");
    },
  });

  // Redirect to results once done
  useEffect(() => {
    if (job?.status === "done") {
      const timer = setTimeout(() => {
        router.push(`/app/results/${jobId}`);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [job?.status, jobId, router]);

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
  const isFailed = job?.status === "failed" || job?.status === "cancelled";
  const isDone = job?.status === "done";
  const progressPercent = job ? Math.min(100, Math.max(0, Math.round(job.progress))) : 0;

  if (isError) {
    const apiErr = error instanceof ApiError ? error : null;
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="glass-card p-10 border-danger/30">
          <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foam mb-2">Job Not Found</h2>
          <p className="text-xs text-foam/70 mb-6">
            {apiErr?.status === 404
              ? "The requested analysis job does not exist or has been removed."
              : "An unexpected error occurred while checking job progress."}
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="glass-card p-8 sm:p-12 border-border/40 text-center relative overflow-hidden">
        {/* Animated aquatic background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-lagoon/20 rounded-full blur-3xl pointer-events-none" />

        {isFailed ? (
          /* Failed / Cancelled state */
          <div className="space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/30 text-danger flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foam mb-1">
                {job?.status === "cancelled" ? "Analysis Cancelled" : "Analysis Failed"}
              </h1>
              <div
                data-testid="job-error"
                className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs max-w-md mx-auto my-3"
              >
                {job?.error || "An error occurred during video analysis."}
              </div>
              <p className="text-xs text-foam/60 max-w-sm mx-auto">
                Check video conditions: ensure lighting is adequate, the camera is stationary, and at least one goldfish is visible.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/app/analyse"
                data-testid="job-retry"
                className="btn-gold px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </Link>
              <Link
                href="/app/history"
                className="btn-secondary px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lagoon/50 border border-aqua/30 text-aqua text-[11px] font-mono uppercase tracking-wider mb-3">
                <Activity className="w-3.5 h-3.5" />
                <span>
                  {isDone
                    ? "Analysis Complete"
                    : isLoading
                    ? "Connecting to engine..."
                    : `Stage: ${job?.stage || "Processing"}`}
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foam mb-2">
                {isDone ? "Redirecting to Results..." : "Analysing Tank Video"}
              </h1>
              <p className="text-xs text-foam/70 max-w-md mx-auto">
                Our computer vision pipeline is tracking goldfish paths, measuring velocity, and checking behavioural indicators.
              </p>
              {elapsedSeconds > 90 && (
                <div className="mt-3 p-2.5 rounded-lg bg-warn/10 border border-warn/30 text-warn text-[11px] max-w-md mx-auto">
                  Analysis is taking longer than usual. High-resolution videos or dense schooling may require additional processing time.
                </div>
              )}
            </div>

            {/* Stepper */}
            <div data-testid="job-stepper" className="pt-2">
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
                          ? "bg-lagoon/60 border-aqua text-aqua shadow-aqua-glow"
                          : "bg-abyss/40 border-border/30 text-foam/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:flex-col">
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-ok" />
                        ) : isCurrent ? (
                          <CircleDot className="w-4 h-4 text-aqua animate-spin" />
                        ) : (
                          <Circle className="w-4 h-4 text-foam/30" />
                        )}
                        <span className="text-[11px] font-medium leading-tight">{st.label}</span>
                      </div>
                      <span className="text-[10px] sm:hidden font-mono text-foam/60">
                        {idx + 1}/5
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress Bar & Elapsed */}
            <div className="space-y-2 max-w-md mx-auto pt-2">
              <div className="flex justify-between text-xs font-mono text-foam/80">
                <span className="capitalize">{job?.stage || "queued"}</span>
                <span className="font-semibold text-aqua">{progressPercent}%</span>
              </div>
              <div
                data-testid="job-progress"
                className="w-full h-2.5 rounded-full bg-abyss overflow-hidden p-0.5 border border-border/40"
              >
                <div
                  className="h-full bg-gradient-to-r from-gold via-aqua to-ok rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-foam/50 pt-1">
                <span>Elapsed: {elapsedSeconds}s</span>
                <span>Job ID: {jobId.slice(0, 8)}</span>
              </div>
            </div>

            {/* Cancel Job Option */}
            {!isDone && (
              <div className="pt-4">
                <button
                  data-testid="job-cancel"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="text-xs font-mono text-foam/50 hover:text-danger transition-colors inline-flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Analysis</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
