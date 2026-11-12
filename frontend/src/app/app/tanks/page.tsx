"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Tank, type TankCreate, ApiError } from "@/lib/api";
import {
  Plus,
  Trash2,
  Edit2,
  Droplets,
  AlertCircle,
  Loader2,
  ArrowRight,
  X,
} from "lucide-react";
import { showToast } from "@/lib/toast";

export default function TanksPage() {
  const queryClient = useQueryClient();

  // Create Form state
  const [name, setName] = useState("");
  const [volumeL, setVolumeL] = useState("60");
  const [goldfishCount, setGoldfishCount] = useState("3");
  const [waterTempC, setWaterTempC] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Edit state
  const [editingTank, setEditingTank] = useState<Tank | null>(null);
  const [editName, setEditName] = useState("");
  const [editVolume, setEditVolume] = useState("");
  const [editCount, setEditCount] = useState("");
  const [editTemp, setEditTemp] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // Queries
  const { data: tanks, isLoading, isError, error } = useQuery({
    queryKey: ["tanks"],
    queryFn: () => api.listTanks(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (newTank: TankCreate) => api.createTank(newTank),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["tanks"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setName("");
      setVolumeL("60");
      setGoldfishCount("3");
      setWaterTempC("");
      setFormError(null);
      showToast(`Tank "${created.name}" created`, "success");
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to create tank. Please verify your inputs.");
      }
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TankCreate> }) =>
      api.updateTank(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["tanks"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      setEditingTank(null);
      showToast(`Tank "${updated.name}" updated`, "success");
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Failed to update tank";
      setEditError(msg);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (tankId: string) => api.deleteTank(tankId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tanks"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      showToast("Tank and associated data deleted", "info");
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : "Failed to delete tank";
      showToast(msg, "danger");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const vol = parseFloat(volumeL);
    const count = parseInt(goldfishCount, 10);
    const temp = waterTempC ? parseFloat(waterTempC) : null;

    if (!name.trim()) {
      setFormError("Tank name cannot be empty");
      return;
    }
    if (isNaN(vol) || vol <= 0) {
      setFormError("Volume must be greater than 0");
      return;
    }
    if (isNaN(count) || count < 1 || count > 20) {
      setFormError("Goldfish count must be between 1 and 20");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      volume_l: vol,
      goldfish_count: count,
      water_temp_c: temp,
    });
  };

  const startEdit = (tank: Tank) => {
    setEditingTank(tank);
    setEditName(tank.name);
    setEditVolume(tank.volume_l.toString());
    setEditCount(tank.goldfish_count.toString());
    setEditTemp(tank.water_temp_c !== null && tank.water_temp_c !== undefined ? tank.water_temp_c.toString() : "");
    setEditError(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTank) return;
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
      setEditError("Goldfish count must be between 1 and 20");
      return;
    }

    editMutation.mutate({
      id: editingTank.id,
      data: {
        name: editName.trim(),
        volume_l: vol,
        goldfish_count: count,
        water_temp_c: temp,
      },
    });
  };

  const handleDelete = (tank: Tank) => {
    if (window.confirm(`Are you sure you want to delete "${tank.name}"? This removes all associated videos and results.`)) {
      deleteMutation.mutate(tank.id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foam">
          Tank Enclosures
        </h1>
        <p className="text-xs text-foam/60 font-mono mt-0.5">
          Configure aquarium profiles, volumes, and fish counts for baseline behavioural scoring
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Create Tank Form */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 border-border/40">
            <h2 className="text-sm font-semibold text-foam uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-aqua" />
              <span>Add New Tank</span>
            </h2>

            {formError && (
              <div
                data-testid="tank-error"
                className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foam/80 mb-1">
                  Tank Name *
                </label>
                <input
                  type="text"
                  data-testid="tank-form-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Quarantine 60L"
                  className="w-full px-3 py-2 rounded-xl bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foam/80 mb-1">
                    Volume (Litres) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    data-testid="tank-form-volume"
                    value={volumeL}
                    onChange={(e) => setVolumeL(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foam/80 mb-1">
                    Goldfish Count *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    data-testid="tank-form-count"
                    value={goldfishCount}
                    onChange={(e) => setGoldfishCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foam/80 mb-1">
                  Water Temperature (°C, optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={waterTempC}
                  onChange={(e) => setWaterTempC(e.target.value)}
                  placeholder="e.g. 21.5"
                  className="w-full px-3 py-2 rounded-xl bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua transition-colors"
                />
              </div>

              <button
                type="submit"
                data-testid="tank-form-submit"
                disabled={createMutation.isPending}
                className="btn-gold w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 mt-2"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create Tank</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Existing Tanks */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading && (
            <div className="py-20 flex flex-col items-center justify-center text-foam/50 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-aqua" />
              <span className="text-xs font-mono">Loading tank profiles...</span>
            </div>
          )}

          {isError && (
            <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>Failed to load tanks: {(error as Error)?.message || "Server error"}</span>
            </div>
          )}

          {!isLoading && !isError && tanks && tanks.length === 0 && (
            <div className="glass-card p-12 text-center border-dashed border-border/60">
              <Droplets className="w-12 h-12 text-aqua/50 mx-auto mb-3" />
              <h3 className="font-semibold text-foam text-sm mb-1">No tanks registered yet</h3>
              <p className="text-xs text-foam/60 max-w-sm mx-auto">
                Add your aquarium enclosure using the form to start tracking goldfish behavioural metrics.
              </p>
            </div>
          )}

          {!isLoading && !isError && tanks && tanks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tanks.map((tank) => (
                <div
                  key={tank.id}
                  data-testid={`tank-card-${tank.id}`}
                  className="glass-card p-5 border-border/40 hover:border-aqua/50 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <Link
                        href={`/app/tanks/${tank.id}`}
                        className="font-semibold text-foam text-sm group-hover:text-aqua transition-colors truncate pr-3 block"
                      >
                        {tank.name}
                      </Link>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(tank)}
                          className="p-1 rounded text-foam/40 hover:text-foam hover:bg-white/5 transition-colors"
                          title="Edit tank"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tank)}
                          disabled={deleteMutation.isPending}
                          className="p-1 rounded text-foam/40 hover:text-danger hover:bg-white/5 transition-colors"
                          title="Delete tank"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-foam/80 mb-3">
                      <div className="bg-lagoon/30 p-2 rounded-lg border border-border/30">
                        <span className="text-foam/40 block text-[10px]">Volume</span>
                        <span>{tank.volume_l} Litres</span>
                      </div>
                      <div className="bg-lagoon/30 p-2 rounded-lg border border-border/30">
                        <span className="text-foam/40 block text-[10px]">Fish</span>
                        <span>{tank.goldfish_count} Goldfish</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-foam/50 pt-2 border-t border-border/30">
                    <span>
                      {tank.water_temp_c !== null ? `${tank.water_temp_c}°C` : "No temp"}
                    </span>
                    <Link
                      href={`/app/tanks/${tank.id}`}
                      className="text-aqua hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Tank Modal Dialog */}
      {editingTank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-abyss/80 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 border-border/60 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-semibold text-sm text-foam">Edit Tank Profile</h3>
              <button
                onClick={() => setEditingTank(null)}
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
                  onClick={() => setEditingTank(null)}
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
