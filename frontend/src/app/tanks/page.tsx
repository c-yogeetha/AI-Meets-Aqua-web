"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Tank, type TankCreate, ApiError } from "@/lib/api";
import { Plus, Trash2, Fish, Droplets, AlertCircle, Loader2 } from "lucide-react";
import { showToast } from "@/lib/toast";

export default function TanksPage() {
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [volumeL, setVolumeL] = useState("60");
  const [goldfishCount, setGoldfishCount] = useState("3");
  const [waterTempC, setWaterTempC] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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
      setName("");
      setVolumeL("60");
      setGoldfishCount("3");
      setWaterTempC("");
      setFormError(null);
      showToast(`Tank "${created.name}" created successfully`, "success");
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Failed to create tank. Please verify your inputs.");
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (tankId: string) => api.deleteTank(tankId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tanks"] });
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

  const handleDelete = (tank: Tank) => {
    if (window.confirm(`Are you sure you want to delete "${tank.name}"? This removes all associated videos and results.`)) {
      deleteMutation.mutate(tank.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">Tank Management</h1>
        <p className="text-foam/70 text-sm">
          Configure tank profiles with dimensions and fish counts for accurate behavioural scoring.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Create Tank Form */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-aqua" />
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
                <label className="block text-xs font-semibold text-foam/80 mb-1">Tank Name *</label>
                <input
                  type="text"
                  data-testid="new-tank-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Living room 60L"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-aqua transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foam/80 mb-1">Volume (Litres) *</label>
                  <input
                    type="number"
                    step="any"
                    data-testid="new-tank-volume"
                    value={volumeL}
                    onChange={(e) => setVolumeL(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-aqua transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foam/80 mb-1">Fish Count (1-20) *</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    data-testid="new-tank-count"
                    value={goldfishCount}
                    onChange={(e) => setGoldfishCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-aqua transition-colors"
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
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-aqua transition-colors"
                />
              </div>

              <button
                type="submit"
                data-testid="new-tank-submit"
                disabled={createMutation.isPending}
                className="btn-gold w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-2"
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
        <div className="lg:col-span-2">
          {isLoading && (
            <div className="py-20 flex flex-col items-center justify-center text-foam/50 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-aqua" />
              <span className="text-sm">Loading tanks...</span>
            </div>
          )}

          {isError && (
            <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>Failed to load tanks: {(error as Error)?.message || "Server error"}</span>
            </div>
          )}

          {!isLoading && !isError && tanks && tanks.length === 0 && (
            <div className="glass-card p-12 text-center border-dashed border-white/20">
              <Droplets className="w-12 h-12 text-aqua/50 mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-1">No tanks registered yet</h3>
              <p className="text-sm text-foam/60 max-w-sm mx-auto mb-6">
                Add your aquarium profile on the left to start analysing behavioural footage.
              </p>
            </div>
          )}

          {!isLoading && !isError && tanks && tanks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tanks.map((tank) => (
                <div
                  key={tank.id}
                  data-testid={`tank-card-${tank.id}`}
                  className="glass-card p-5 border-white/10 relative group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-white text-base group-hover:text-aqua transition-colors truncate pr-6">
                      {tank.name}
                    </h3>
                    <button
                      onClick={() => handleDelete(tank)}
                      disabled={deleteMutation.isPending}
                      className="text-foam/40 hover:text-danger p-1 rounded transition-colors"
                      title="Delete tank profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-foam/80 mb-3">
                    <div className="flex items-center gap-1.5 bg-white/5 p-2 rounded-lg">
                      <Droplets className="w-4 h-4 text-aqua flex-shrink-0" />
                      <span>{tank.volume_l} Litres</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 p-2 rounded-lg">
                      <Fish className="w-4 h-4 text-gold flex-shrink-0" />
                      <span>{tank.goldfish_count} Goldfish</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-foam/50 pt-2 border-t border-white/5">
                    <span>
                      {tank.water_temp_c !== null ? `${tank.water_temp_c}°C` : "Temp unrecorded"}
                    </span>
                    <span>{new Date(tank.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
