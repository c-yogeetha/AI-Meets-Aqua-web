"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type TankCreate, ApiError } from "@/lib/api";
import {
  UploadCloud,
  FileVideo,
  AlertCircle,
  Plus,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { showToast } from "@/lib/toast";

export default function AnalysePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stepper state
  const [showConditionsEnvelope, setShowConditionsEnvelope] = useState(false);

  // Step 1: Tank state
  const [selectedTankId, setSelectedTankId] = useState<string>("");
  const [showNewTank, setShowNewTank] = useState(false);
  const [newTankName, setNewTankName] = useState("");
  const [newTankVolume, setNewTankVolume] = useState("60");
  const [newTankCount, setNewTankCount] = useState("3");
  const [tankError, setTankError] = useState<string | null>(null);

  // Step 2: Upload state
  const [file, setFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Step 3: Context parameters
  const [cameraView, setCameraView] = useState<"side" | "front" | "top">("side");
  const [waterTemp, setWaterTemp] = useState<string>("");
  const [daysSinceChange, setDaysSinceChange] = useState<string>("");
  const [hoursSinceFeeding, setHoursSinceFeeding] = useState<string>("");

  // Step 4: Submission & Progress
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

    // Validate extension
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
    videoEl.src = objectUrl;
  };

  const handleFileDrop = (e: React.DragEvent) => {
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

  // Submit flow
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // double-submit protection

    if (!selectedTankId || !file) {
      setUploadError("Please select a tank and choose a video file.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tank_id", selectedTankId);
    formData.append("view", cameraView);
    if (waterTemp) formData.append("water_temp_c", waterTemp);
    if (daysSinceChange) formData.append("last_water_change_days", daysSinceChange);
    if (hoursSinceFeeding) formData.append("last_fed_hours", hoursSinceFeeding);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await api.uploadVideo(
        formData,
        (percent) => setUploadProgress(percent),
        controller.signal
      );
      setUploadProgress(100);
      showToast("Upload complete. Analysis starting...", "success");
      router.push(`/app/jobs/${response.job_id}`);
    } catch (err: unknown) {
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

  const selectedTank = tanks?.find((t) => t.id === selectedTankId);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foam">
          Analyse Tank Video
        </h1>
        <p className="text-xs text-foam/60 font-mono mt-0.5">
          Four-step guided pipeline to measure behavioural stress markers in goldfish
        </p>
      </div>

      {uploadError && (
        <div
          data-testid="upload-error"
          className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Upload Error</div>
            <div className="mt-0.5">{uploadError}</div>
          </div>
        </div>
      )}

      {/* 4-Step Guided Flow Form */}
      <form onSubmit={handleUploadSubmit} className="space-y-6">
        {/* Step 1: Tank Selection */}
        <div data-testid="step-1" className="glass-card p-6 border-border/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foam flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-lagoon/50 text-aqua flex items-center justify-center text-xs font-mono font-bold">
                1
              </span>
              <span>Select Tank Enclosure</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowNewTank(!showNewTank)}
              className="text-xs text-aqua hover:underline inline-flex items-center gap-1 font-mono"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showNewTank ? "Cancel" : "Add New Tank"}</span>
            </button>
          </div>

          {showNewTank ? (
            <div className="p-4 rounded-xl bg-abyss/80 border border-border/60 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-foam/70">
                Quick Tank Registration
              </h3>
              {tankError && (
                <div data-testid="tank-error" className="text-danger text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{tankError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  data-testid="tank-form-name"
                  value={newTankName}
                  onChange={(e) => setNewTankName(e.target.value)}
                  placeholder="Tank Name *"
                  className="px-3 py-2 rounded-lg bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
                />
                <input
                  type="number"
                  data-testid="tank-form-volume"
                  value={newTankVolume}
                  onChange={(e) => setNewTankVolume(e.target.value)}
                  placeholder="Volume (L) *"
                  className="px-3 py-2 rounded-lg bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
                />
                <input
                  type="number"
                  data-testid="tank-form-count"
                  value={newTankCount}
                  onChange={(e) => setNewTankCount(e.target.value)}
                  placeholder="Fish Count *"
                  className="px-3 py-2 rounded-lg bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
                />
              </div>
              <button
                type="button"
                data-testid="tank-form-submit"
                onClick={handleCreateTank}
                disabled={createTankMutation.isPending}
                className="btn-gold px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
              >
                {createTankMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Tank</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {tanksLoading ? (
                <div className="text-xs font-mono text-foam/50 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-aqua" />
                  <span>Loading tanks...</span>
                </div>
              ) : !tanks || tanks.length === 0 ? (
                <p className="text-xs text-foam/60">
                  No tanks found. Click &quot;Add New Tank&quot; above to create one.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {tanks.map((t) => (
                    <label
                      key={t.id}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                        selectedTankId === t.id
                          ? "bg-lagoon/40 border-aqua text-foam font-semibold"
                          : "bg-abyss/60 border-border/40 text-foam/70 hover:border-border/80"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="truncate">{t.name}</span>
                        <input
                          type="radio"
                          name="tankSelection"
                          value={t.id}
                          checked={selectedTankId === t.id}
                          onChange={() => setSelectedTankId(t.id)}
                          className="sr-only"
                        />
                        {selectedTankId === t.id && (
                          <Check className="w-4 h-4 text-aqua flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-foam/50 mt-2 block">
                        {t.volume_l}L • {t.goldfish_count} fish
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Video Selection & Supported Conditions Envelope */}
        <div data-testid="step-2" className="glass-card p-6 border-border/40 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foam flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-lagoon/50 text-aqua flex items-center justify-center text-xs font-mono font-bold">
                2
              </span>
              <span>Upload Video Recording</span>
            </h2>

            <button
              type="button"
              onClick={() => setShowConditionsEnvelope(!showConditionsEnvelope)}
              className="text-xs text-aqua hover:underline inline-flex items-center gap-1 font-mono"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Supported Conditions Envelope</span>
              {showConditionsEnvelope ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Supported Conditions Envelope (Collapsible) */}
          {showConditionsEnvelope && (
            <div className="p-4 rounded-xl bg-abyss/80 border border-border/60 text-xs text-foam/80 space-y-2 font-mono">
              <div className="font-semibold text-aqua uppercase tracking-wider text-[11px]">
                Filming Guidelines for Reliable Tracking:
              </div>
              <ul className="list-disc list-inside space-y-1 text-foam/70">
                <li>Steady camera: mount on tripod or place against a still surface (shake &lt; 6px).</li>
                <li>Duration: 10 to 60 seconds (up to 120s max).</li>
                <li>Even lighting: minimize reflection and avoid strong direct glare on glass.</li>
                <li>Fish count: optimal for 1 to 5 goldfish.</li>
                <li>Side or front elevation: essential for depth/vertical swimming analysis.</li>
              </ul>
            </div>
          )}

          {/* Dropzone */}
          <div
            data-testid="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              file
                ? "border-aqua/60 bg-lagoon/20"
                : "border-border/60 hover:border-aqua/40 bg-abyss/40 hover:bg-abyss/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              data-testid="file-input"
              accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,.mp4,.mov,.avi,.mkv,.webm"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-lagoon/50 border border-aqua/30 flex items-center justify-center text-aqua">
                  <FileVideo className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold text-foam text-sm">{file.name}</div>
                  <div className="text-xs font-mono text-foam/60 mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setVideoPreviewUrl(null);
                  }}
                  className="text-xs text-danger hover:underline mt-1"
                >
                  Choose another file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-lagoon/30 border border-border/50 flex items-center justify-center text-foam/60">
                  <UploadCloud className="w-6 h-6 text-aqua" />
                </div>
                <div>
                  <div className="font-semibold text-foam text-sm">
                    Drag and drop your tank recording here
                  </div>
                  <div className="text-xs text-foam/50 mt-1">
                    or click to browse from your device
                  </div>
                </div>
                <div className="text-[11px] font-mono text-foam/40">
                  Supports MP4, WebM, MOV, AVI (up to 200 MB, 120s)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Camera View & Context Parameters */}
        <div data-testid="step-3" className="glass-card p-6 border-border/40 space-y-4">
          <h2 className="text-sm font-semibold text-foam flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-lagoon/50 text-aqua flex items-center justify-center text-xs font-mono font-bold">
              3
            </span>
            <span>Camera Angle & Environmental Context</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-foam/80 mb-2">
              Camera View Angle *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "side", label: "Side View (Recommended)", testId: "view-side" },
                { id: "front", label: "Front View", testId: "view-front" },
                { id: "top", label: "Top-Down View", testId: "view-top" },
              ].map((item) => (
                <label
                  key={item.id}
                  data-testid={item.testId}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                    cameraView === item.id
                      ? "bg-lagoon/50 border-aqua text-foam font-semibold"
                      : "bg-abyss/60 border-border/40 text-foam/70 hover:border-border/80"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/30">
            <div>
              <label className="block text-xs font-semibold text-foam/80 mb-1">
                Water Temp (°C, optional)
              </label>
              <input
                type="number"
                step="0.1"
                value={waterTemp}
                onChange={(e) => setWaterTemp(e.target.value)}
                placeholder="e.g. 21.5"
                className="w-full px-3 py-2 rounded-xl bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
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
                placeholder="e.g. 5"
                className="w-full px-3 py-2 rounded-xl bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
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
                placeholder="e.g. 3"
                className="w-full px-3 py-2 rounded-xl bg-abyss border border-border/60 text-foam text-xs focus:outline-none focus:border-aqua"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Review and Start */}
        <div data-testid="step-4" className="glass-card p-6 border-border/40 space-y-4">
          <h2 className="text-sm font-semibold text-foam flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-lagoon/50 text-aqua flex items-center justify-center text-xs font-mono font-bold">
              4
            </span>
            <span>Review & Launch Analysis</span>
          </h2>

          <div className="p-4 rounded-xl bg-abyss/80 border border-border/40 text-xs font-mono text-foam/70 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-foam/40 block text-[10px]">Selected Tank</span>
              <span className="text-foam font-semibold">{selectedTank?.name || "None"}</span>
            </div>
            <div>
              <span className="text-foam/40 block text-[10px]">Video File</span>
              <span className="text-foam font-semibold">{file?.name || "None chosen"}</span>
            </div>
            <div>
              <span className="text-foam/40 block text-[10px]">Camera Elevation</span>
              <span className="text-foam font-semibold capitalize">{cameraView}</span>
            </div>
            <div>
              <span className="text-foam/40 block text-[10px]">Water Temp</span>
              <span className="text-foam font-semibold">{waterTemp ? `${waterTemp}°C` : "Unspecified"}</span>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploadProgress !== null && (
            <div data-testid="upload-progress" className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-mono text-foam/80">
                <span>Uploading video stream to engine...</span>
                <span className="text-aqua font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-abyss overflow-hidden border border-border/40">
                <div
                  className="h-full bg-gradient-to-r from-gold to-aqua transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              data-testid="upload-submit"
              disabled={!file || !selectedTankId || isSubmitting}
              className="btn-gold flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading & Queuing Video...</span>
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
                className="px-4 py-3 rounded-xl border border-border/60 text-xs font-mono text-foam/70 hover:text-white hover:bg-white/5"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
