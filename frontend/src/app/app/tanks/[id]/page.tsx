"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type TankCreate, ApiError } from "@/lib/api";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  Activity,
  Trash2,
  Edit2,
  Video,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { showToast } from "@/lib/toast";

export default function TankDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const tankId = typeof params?.id === "string" ? params.id : "";

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editVolume, setEditVolume] = useState("");
  const [editCount, setEditCount] = useState("");
  const [editTemp, setEditTemp] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Queries
  const {
    data: tank,
    isLoading: tankLoading,
    isError: tankError,
  } = useQuery({
    queryKey: ["tank", tankId],
    queryFn: () => api.getTank(tankId),
    enabled: Boolean(tankId),
  });

  const { data: history } = useQuery({
    queryKey: ["history", tankId],
    queryFn: () => api.getHistory(tankId),
    enabled: Boolean(tankId),
  });

  const { data: insights } = useQuery({
    queryKey: ["insights", tankId],
    queryFn: () => api.getInsights(tankId),
    enabled: Boolean(tankId),
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: (data: Partial<TankCreate>) => api.updateTank(tankId, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["tank", tankId] });
      queryClient.invalidateQueries({ queryKey: ["tanks"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setIsEditing(false);
      showToast(`Tank "${updated.name}" updated`, "success");
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Failed to update tank";
      setEditError(msg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.deleteTank(tankId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tanks"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      showToast("Tank deleted", "info");
      router.push("/app/tanks");
    },
  });

  const startEdit = () => {
    if (!tank) return;
    setEditName(tank.name);
    setEditVolume(tank.volume_l.toString());
    setEditCount(tank.goldfish_count.toString());
    setEditTemp(tank.water_temp_c !== null && tank.water_temp_c !== undefined ? tank.water_temp_c.toString() : "");
    setEditError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    const vol = parseFloat(editVolume);
    const count = parseInt(editCount, 10);
    const temp = editTemp ? parseFloat(editTemp) : null;

    if (!editName.trim()) {
      setEditError("Tank name cannot be empty");
      return;
    }
    if (isNaN(vol) || vol <= 0) {
      setEditError("Volume must be greater than 0");
      return;
    }
    if (isNaN(count) || count < 1 || count > 20) {
      setEditError("Fish count must be between 1 and 20");
      return;
    }

    editMutation.mutate({
      name: editName.trim(),
      volume_l: vol,
      goldfish_count: count,
      water_temp_c: temp,
    });
  };

  const handleDelete = () => {
    if (!tank) return;
    if (window.confirm(`Are you sure you want to delete "${tank.name}"? This removes all associated videos and results.`)) {
      deleteMutation.mutate();
    }
  };

  if (tankLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-aqua mb-2" />
        <span className="text-xs text-foam/60 font-mono">Loading tank profile...</span>
      </div>
    );
  }

  if (tankError || !tank) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="glass-card p-8 border-border/40">
          <AlertTriangle className="w-10 h-10 text-danger mx-auto mb-3" />
          <h2 className="font-semibold text-foam text-base mb-1">Tank Not Found</h2>
          <p className="text-xs text-foam/60 mb-6">
            The requested enclosure could not be retrieved or has been removed.
          </p>
          <Link href="/app/tanks" className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Tanks</span>
          </Link>
        </div>
      </div>
    );
  }

  const items = history?.items || [];
  const fsi = insights?.fsi ?? null;

  return (
    <div className="space-y-8">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/tanks"
            className="p-2 rounded-lg text-foam/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foam">
              {tank.name}
            </h1>
            <p className="text-xs text-foam/60 font-mono mt-0.5">
              Enclosure ID: {tank.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={startEdit}
            className="btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Tank</span>
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
            title="Delete tank"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Link
            href={`/app/analyse`}
            className="btn-gold px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Analyse Video</span>
          </Link>
        </div>
      </div>

      {/* Tank Specs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-border/40">
          <span className="text-[10px] uppercase font-mono tracking-wider text-foam/50 block mb-1">
            Volume
          </span>
          <span className="font-mono text-xl font-bold text-foam">
            {tank.volume_l} Litres
          </span>
        </div>

        <div className="glass-card p-4 border-border/40">
          <span className="text-[10px] uppercase font-mono tracking-wider text-foam/50 block mb-1">
            Goldfish Count
          </span>
          <span className="font-mono text-xl font-bold text-foam">
            {tank.goldfish_count}
          </span>
        </div>

        <div className="glass-card p-4 border-border/40">
          <span className="text-[10px] uppercase font-mono tracking-wider text-foam/50 block mb-1">
            Water Temperature
          </span>
          <span className="font-mono text-xl font-bold text-foam">
            {tank.water_temp_c !== null ? `${tank.water_temp_c}°C` : "Unrecorded"}
          </span>
        </div>

        <div className="glass-card p-4 border-border/40">
          <span className="text-[10px] uppercase font-mono tracking-wider text-foam/50 block mb-1">
            FSI Rating
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold text-foam">
              {fsi !== null ? fsi : "N/A"}
            </span>
            {insights?.level && (
              <StatusChip
                label={insights.level}
                variant={
                  insights.level === "Critical"
                    ? "prototype"
                    : insights.level === "Elevated"
                    ? "validation"
                    : "real"
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* Analysis History for this tank */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-foam/70">
            Analysis History ({items.length})
          </h2>
        </div>

        {items.length === 0 ? (
          <div className="glass-card p-10 text-center border-border/40">
            <Activity className="w-8 h-8 text-aqua/50 mx-auto mb-2" />
            <h3 className="font-semibold text-foam text-xs mb-1">No video analyses yet</h3>
            <p className="text-[11px] text-foam/60 mb-4 max-w-xs mx-auto">
              Upload a 10–30s recording to begin monitoring stress levels for this enclosure.
            </p>
            <Link
              href="/app/analyse"
              className="btn-gold px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Start First Analysis</span>
            </Link>
          </div>
        ) : (
          <div className="glass-card border-border/40 overflow-hidden divide-y divide-border/20">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/app/results/${item.id}`}
                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foam group-hover:text-aqua transition-colors">
                      {new Date(item.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-[10px] font-mono text-foam/40">
                      {item.mode || "classical"}
                    </span>
                  </div>
                  <span className="text-[11px] text-foam/60 block">
                    {item.stressed_count}/{item.fish_count} goldfish stressed
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <StatusChip
                    label={`${item.tank_score} (${item.level})`}
                    variant={
                      item.level === "Critical"
                        ? "prototype"
                        : item.level === "Elevated"
                        ? "validation"
                        : "real"
                    }
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Edit Tank Modal Dialog */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-abyss/80 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 border-border/60 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-semibold text-sm text-foam">Edit Tank Profile</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 rounded text-foam/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foam/80 mb-1">
                  Tank Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foam/80 mb-1">
                    Volume (L)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editVolume}
                    onChange={(e) => setEditVolume(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foam/80 mb-1">
                    Fish Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editCount}
                    onChange={(e) => setEditCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foam/80 mb-1">
                  Water Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editTemp}
                  onChange={(e) => setEditTemp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary px-3 py-2 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editMutation.isPending}
                  className="btn-gold px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                >
                  {editMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
