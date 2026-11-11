"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type TankCreate, ApiError } from "@/lib/api";
import {
  UploadCloud,
  FileVideo,
  CheckCircle,
  AlertCircle,
  Plus,
  Loader2,
  Info,
  Camera,
  X,
} from "lucide-react";
import { showToast } from "@/lib/toast";

export default function AnalysePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Tank state
  const [selectedTankId, setSelectedTankId] = useState<string>("");
  const [showNewTank, setShowNewTank] = useState(false);
  const [newTankName, setNewTankName] = useState("");
  const [newTankVolume, setNewTankVolume] = useState("60");
  const [newTankCount, setNewTankCount] = useState("3");
  const [tankError, setTankError] = useState<string | null>(null);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [cameraView, setCameraView] = useState<"side" | "front" | "top">("side");
  const [waterTemp, setWaterTemp] = useState<string>("");
  const [daysSinceChange, setDaysSinceChange] = useState<string>("");
  const [hoursSinceFeeding, setHoursSinceFeeding] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tanks Query
  const { data: tanks, isLoading: tanksLoading } = useQuery({
    queryKey: ["tanks"],
    queryFn: () => api.listTanks(),
  });

  // Select first tank automatically once loaded
  useEffect(() => {
    if (tanks && tanks.length > 0 && !selectedTankId) {
      setSelectedTankId(tanks[0].id);
    }
  }, [tanks, selectedTankId]);

  // Clean up preview object url
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // Tank creation mutation
  const createTankMutation = useMutation({
    mutationFn: (data: TankCreate) => api.createTank(data),
    onSuccess: (tank) => {
      queryClient.invalidateQueries({ queryKey: ["tanks"] });
      setSelectedTankId(tank.id);
      setShowNewTank(false);
      setNewTankName("");
      setTankError(null);
      showToast(`Tank "${tank.name}" created`, "success");
    },
    onError: (err: unknown) => {
      setTankError(err instanceof ApiError ? err.message : "Failed to create tank");
    },
  });

  const handleCreateTank = (e: React.FormEvent) => {
    e.preventDefault();
    setTankError(null);
    const vol = parseFloat(newTankVolume);
    const count = parseInt(newTankCount, 10);
    if (!newTankName.trim()) {
      setTankError("Tank name cannot be empty");
      return;
    }
    if (isNaN(vol) || vol <= 0) {
      setTankError("Volume must be greater than 0");
      return;
    }
    if (isNaN(count) || count < 1 || count > 20) {
      setTankError("Fish count must be between 1 and 20");
      return;
    }
    createTankMutation.mutate({
      name: newTankName.trim(),
      volume_l: vol,
      goldfish_count: count,
    });
  };

  // Video validation
  const validateAndSetFile = (candidate: File) => {
    setUploadError(null);

    // Validate size (max 200MB)
    const maxBytes = 200 * 1024 * 1024;
    if (candidate.size > maxBytes) {
      setUploadError(`File is too large (${(candidate.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed is 200 MB.`);
      return;
    }

    // Validate extension / mime
    const nameLower = candidate.name.toLowerCase();
    const validExts = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    if (!validExts.some((ext) => nameLower.endsWith(ext))) {
      setUploadError("Unsupported format. Please upload an MP4, MOV, AVI, MKV, or WebM video.");
      return;
    }

    const objectUrl = URL.createObjectURL(candidate);
    setVideoPreviewUrl(objectUrl);
    setFile(candidate);

    // Check duration with hidden video element
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.onloadedmetadata = () => {
      if (videoEl.duration > 120) {
        setUploadError(`Video duration is ${videoEl.duration.toFixed(0)}s. Maximum allowed is 120 seconds.`);
      }
    };
    videoEl.onerror = () => {
      // Browser might not decode some codecs directly, backend will validate
    };
    videoEl.src = objectUrl;
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedTankId) {
      setUploadError("Please select a tank and choose a video file.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tank_id", selectedTankId);
    formData.append("view", cameraView);
    if (waterTemp) formData.append("water_temp_c", waterTemp);
    if (daysSinceChange) formData.append("last_water_change_days", daysSinceChange);
    if (hoursSinceFeeding) formData.append("last_feeding_hours", hoursSinceFeeding);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Simulate progress while uploading
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (!prev) return 20;
        if (prev >= 90) return 90;
        return prev + 15;
      });
    }, 300);

    try {
      const response = await api.uploadVideo(formData, controller.signal);
      clearInterval(progressInterval);
      setUploadProgress(100);
      showToast("Upload complete. Analysis starting...", "success");
      router.push(`/jobs/${response.job_id}`);
    } catch (err: unknown) {
      clearInterval(progressInterval);
      setUploadProgress(null);
      setIsSubmitting(false);
      if (err instanceof ApiError) {
        setUploadError(err.message);
      } else {
        setUploadError("Upload failed. Please check network connection and try again.");
      }
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsSubmitting(false);
      setUploadProgress(null);
      showToast("Upload cancelled", "info");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">Analyse Tank Video</h1>
        <p className="text-foam/70 text-sm">
          Upload 30 to 60 seconds of steady aquarium footage to calculate stress scores and identify behavioural risks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tank Selection + Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-wider uppercase text-aqua">1. Choose Tank</h2>
              <button
                type="button"
                onClick={() => setShowNewTank(!showNewTank)}
                className="text-xs text-gold hover:underline flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showNewTank ? "Cancel" : "New Tank"}</span>
              </button>
            </div>

            {/* Inline new tank form */}
            {showNewTank && (
              <form onSubmit={handleCreateTank} className="mb-5 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="font-semibold text-xs text-white">Create New Tank</div>
                {tankError && (
                  <div data-testid="tank-error" className="text-danger text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{tankError}</span>
                  </div>
                )}
                <div>
                  <input
                    type="text"
                    data-testid="new-tank-name"
                    value={newTankName}
                    onChange={(e) => setNewTankName(e.target.value)}
                    placeholder="Tank Name"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-deep border border-white/15 text-white focus:outline-none focus:border-aqua"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    data-testid="new-tank-volume"
                    value={newTankVolume}
                    onChange={(e) => setNewTankVolume(e.target.value)}
                    placeholder="Litres"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-deep border border-white/15 text-white focus:outline-none focus:border-aqua"
                  />
                  <input
                    type="number"
                    min="1"
                    max="20"
                    data-testid="new-tank-count"
                    value={newTankCount}
                    onChange={(e) => setNewTankCount(e.target.value)}
                    placeholder="Goldfish"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-deep border border-white/15 text-white focus:outline-none focus:border-aqua"
                  />
                </div>
                <button
                  type="submit"
                  data-testid="new-tank-submit"
                  disabled={createTankMutation.isPending}
                  className="w-full btn-gold py-1.5 rounded-lg text-xs font-semibold"
                >
                  {createTankMutation.isPending ? "Creating..." : "Save Tank"}
                </button>
              </form>
            )}

            {/* Existing tanks picker */}
            {tanksLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-aqua" />
              </div>
            ) : tanks && tanks.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {tanks.map((tank) => (
                  <button
                    key={tank.id}
                    type="button"
                    onClick={() => setSelectedTankId(tank.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                      selectedTankId === tank.id
                        ? "bg-aqua/10 border-aqua text-white shadow-aqua-glow"
                        : "bg-white/5 border-white/10 text-foam/80 hover:border-white/20"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-white">{tank.name}</div>
                      <div className="text-[11px] text-foam/60 mt-0.5">
                        {tank.volume_l}L • {tank.goldfish_count} fish
                        {tank.water_temp_c ? ` • ${tank.water_temp_c}°C` : ""}
                      </div>
                    </div>
                    {selectedTankId === tank.id && <CheckCircle className="w-4 h-4 text-aqua flex-shrink-0" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-foam/50">
                No tanks found. Please add a tank profile above to continue.
              </div>
            )}
          </div>

          {/* Filming Guide Card */}
          <div className="glass-card p-6 border-white/10 bg-ocean/20">
            <h3 className="text-sm font-semibold text-aqua flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4" />
              <span>Filming Guide</span>
            </h3>
            <ul className="text-xs text-foam/80 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-aqua font-bold">•</span>
                <span><strong>Side or front view:</strong> Best angle for speed, direction and depth analysis.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-aqua font-bold">•</span>
                <span><strong>Steady camera:</strong> Mount on a tripod or rest against a stable surface.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-aqua font-bold">•</span>
                <span><strong>Duration:</strong> 30 to 60 seconds (up to 120s max).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-aqua font-bold">•</span>
                <span><strong>Even lighting:</strong> Minimize reflection and front-glass glare.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-aqua font-bold">•</span>
                <span><strong>Fish count:</strong> Optimal for 1 to 5 goldfish.</span>
              </li>
              <li className="flex items-start gap-2 text-warn/90 pt-1">
                <Info className="w-4 h-4 flex-shrink-0 text-warn mt-0.5" />
                <span>Top view disables the vertical-position signal (surface gasping & bottom inactivity).</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right 2 Columns: Video Upload + Parameters Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleUploadSubmit} className="glass-card p-6 sm:p-8 border-white/10 space-y-6">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-aqua">
              2. Upload Video & Parameters
            </h2>

            {uploadError && (
              <div
                data-testid="upload-error"
                className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Upload Problem</div>
                  <div className="text-xs text-danger/90 mt-0.5">{uploadError}</div>
                </div>
              </div>
            )}

            {/* Drag & Drop Zone */}
            <div
              data-testid="upload-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                file
                  ? "border-aqua/60 bg-aqua/5"
                  : "border-white/20 hover:border-aqua/40 bg-white/5 hover:bg-white/10"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                data-testid="upload-input"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,.mp4,.mov,.avi,.mkv,.webm"
                onChange={handleFileChange}
                className="hidden"
              />

              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-aqua/20 flex items-center justify-center text-aqua">
                    <FileVideo className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{file.name}</div>
                    <div className="text-xs text-foam/60 mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyse
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setVideoPreviewUrl(null);
                    }}
                    className="mt-1 text-xs text-foam/50 hover:text-danger flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Change file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-foam/60 group-hover:text-aqua">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="font-semibold text-white text-sm">
                      Click to choose video or drag & drop here
                    </span>
                    <p className="text-xs text-foam/50 mt-1">
                      MP4, MOV, AVI, MKV up to 200 MB (120s max duration)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Video preview if available */}
            {videoPreviewUrl && (
              <div className="rounded-xl overflow-hidden bg-black/40 border border-white/10 max-h-56 flex justify-center">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="max-h-56 w-auto"
                />
              </div>
            )}

            {/* Camera View Radio */}
            <div>
              <label className="block text-xs font-semibold text-foam/80 mb-2">
                Camera Perspective *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "side", label: "Side View", testId: "view-side" },
                  { id: "front", label: "Front View", testId: "view-front" },
                  { id: "top", label: "Top View", testId: "view-top" },
                ].map((item) => (
                  <label
                    key={item.id}
                    data-testid={item.testId}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                      cameraView === item.id
                        ? "bg-aqua/15 border-aqua text-white shadow-aqua-glow"
                        : "bg-white/5 border-white/10 text-foam/70 hover:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="cameraView"
                      value={item.id}
                      checked={cameraView === item.id}
                      onChange={() => setCameraView(item.id as "side" | "front" | "top")}
                      className="sr-only"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Optional Context Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10">
              <div>
                <label className="block text-xs font-semibold text-foam/80 mb-1">
                  Water Temp (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={waterTemp}
                  onChange={(e) => setWaterTemp(e.target.value)}
                  placeholder="e.g. 22.0"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-aqua"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foam/80 mb-1">
                  Days Since Water Change
                </label>
                <input
                  type="number"
                  min="0"
                  value={daysSinceChange}
                  onChange={(e) => setDaysSinceChange(e.target.value)}
                  placeholder="e.g. 7"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-aqua"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foam/80 mb-1">
                  Hours Since Feeding
                </label>
                <input
                  type="number"
                  min="0"
                  value={hoursSinceFeeding}
                  onChange={(e) => setHoursSinceFeeding(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-aqua"
                />
              </div>
            </div>

            {/* Upload Progress Bar */}
            {uploadProgress !== null && (
              <div data-testid="upload-progress" className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-foam/80">
                  <span>Uploading video to analysis engine...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold to-aqua transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                data-testid="upload-submit"
                disabled={!file || !selectedTankId || isSubmitting}
                className="btn-gold flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading & Queuing...</span>
                  </>
                ) : (
                  <>
                    <FileVideo className="w-4 h-4" />
                    <span>Start Stress Analysis</span>
                  </>
                )}
              </button>

              {isSubmitting && (
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="px-4 py-3 rounded-xl border border-white/20 text-xs font-medium text-foam/80 hover:text-white hover:bg-white/5"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
