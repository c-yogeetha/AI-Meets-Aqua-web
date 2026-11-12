import type { components } from "./api-types";

export type Tank = components["schemas"]["TankResponse"];
export type TankCreate = components["schemas"]["TankCreate"];
export type Job = components["schemas"]["JobResponse"];
export type Result = components["schemas"]["ResultResponse"];
export type FishStress = components["schemas"]["FishResult"];
export type TimelinePoint = components["schemas"]["TimelinePoint"];
export type KeyMoment = components["schemas"]["KeyMoment"];
export type Suggestion = components["schemas"]["SuggestionItem"];
export type HistoryItem = components["schemas"]["HistoryItem"];
export type HistoryResponse = components["schemas"]["PagedHistory"];
export type Insights = components["schemas"]["InsightsResponse"];
export type TrashItem = components["schemas"]["TrashItem"];
export type Alert = components["schemas"]["AlertResponse"];
export type AlertSettings = components["schemas"]["AlertSettingsResponse"];
export type AlertSettingsUpdate = components["schemas"]["AlertSettingsUpdate"];
export type SystemInfo = components["schemas"]["SystemInfoResponse"];
export type SystemStatus = components["schemas"]["SystemStatusResponse"];
export type SystemStatusResponse = SystemStatus;
export type ScoringConfig = components["schemas"]["ScoringConfigResponse"];
export type ScoringConfigResponse = ScoringConfig;
export type ResultResponse = Result;
export type SuggestionItem = Suggestion;
export type Overview = components["schemas"]["OverviewResponse"];
export type DemoSeed = components["schemas"]["DemoSeedResponse"];

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  tags: string[];
  author: string;
  year: number;
  size_bytes: number;
  duration_s?: number | null;
  dimensions?: string | null;
  source_url?: string | null;
  external_url?: string | null;
  featured: boolean;
  has_file: boolean;
  has_preview: boolean;
  has_thumb: boolean;
  metadata?: Record<string, unknown>;
}

export interface ResourcesResponse {
  items: ResourceItem[];
  total: number;
  page: number;
  page_size: number;
  categories: Record<string, number>;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, message: string, code = "api_error", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || "";

/**
 * Returns root-relative path by default (same-origin),
 * or prefixes with NEXT_PUBLIC_API_ORIGIN if explicitly configured.
 */
export function apiUrl(path: string): string {
  if (!API_ORIGIN) {
    return path.startsWith("/") ? path : `/${path}`;
  }
  const cleanOrigin = API_ORIGIN.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanOrigin}${cleanPath}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = apiUrl(path);
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: "include",
      headers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network failure connecting to API";
    throw new ApiError(0, msg, "network");
  }

  if (res.status === 204) {
    return {} as T;
  }

  const contentType = res.headers.get("content-type") || "";
  let data: unknown = null;
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    if (data && typeof data === "object" && "error" in data) {
      const errObj = (data as { error: { code?: string; message?: string; details?: unknown } }).error;
      throw new ApiError(res.status, errObj?.message || "An error occurred", errObj?.code, errObj?.details);
    }
    const message = (typeof data === "string" && data) || res.statusText || "Request failed";
    throw new ApiError(res.status, message, `http_${res.status}`);
  }

  return data as T;
}

export const api = {
  apiUrl(path: string): string {
    return apiUrl(path);
  },

  getBaseUrl(): string {
    return apiUrl("");
  },

  async getHealth(): Promise<{ status: string }> {
    return request<{ status: string }>("/api/v1/health");
  },

  async getSystemStatus(): Promise<SystemStatus> {
    return request<SystemStatus>("/api/v1/system/status");
  },

  async getSystemInfo(): Promise<SystemInfo> {
    return request<SystemInfo>("/api/v1/system/info");
  },

  async getScoringConfig(): Promise<ScoringConfig> {
    return request<ScoringConfig>("/api/v1/config/scoring");
  },

  async getOverview(): Promise<Overview> {
    return request<Overview>("/api/v1/overview");
  },

  async listTanks(): Promise<Tank[]> {
    return request<Tank[]>("/api/v1/tanks");
  },

  async createTank(tank: TankCreate): Promise<Tank> {
    return request<Tank>("/api/v1/tanks", {
      method: "POST",
      body: JSON.stringify(tank),
    });
  },

  async getTank(tankId: string): Promise<Tank> {
    return request<Tank>(`/api/v1/tanks/${tankId}`);
  },

  async updateTank(tankId: string, tank: Partial<TankCreate>): Promise<Tank> {
    return request<Tank>(`/api/v1/tanks/${tankId}`, {
      method: "PUT",
      body: JSON.stringify(tank),
    });
  },

  async deleteTank(tankId: string): Promise<void> {
    return request<void>(`/api/v1/tanks/${tankId}`, {
      method: "DELETE",
    });
  },

  async uploadVideo(
    formData: FormData,
    onProgressOrSignal?: ((percent: number) => void) | AbortSignal,
    maybeSignal?: AbortSignal
  ): Promise<{ job_id: string; video_id: string }> {
    let onProgress: ((percent: number) => void) | undefined;
    let signal: AbortSignal | undefined;

    if (typeof onProgressOrSignal === "function") {
      onProgress = onProgressOrSignal;
      signal = maybeSignal;
    } else if (onProgressOrSignal instanceof AbortSignal) {
      signal = onProgressOrSignal;
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = apiUrl("/api/v1/videos");
      xhr.open("POST", url, true);
      xhr.withCredentials = true;

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            onProgress(pct);
          }
        };
      }

      if (signal) {
        signal.addEventListener("abort", () => {
          xhr.abort();
          reject(new ApiError(0, "Upload aborted by user", "aborted"));
        });
      }

      xhr.onload = () => {
        let jsonResponse: { error?: { code?: string; message?: string; details?: unknown }; job_id?: string; video_id?: string } | null = null;
        try {
          jsonResponse = JSON.parse(xhr.responseText);
        } catch {
          // ignore
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ job_id: jsonResponse?.job_id || "", video_id: jsonResponse?.video_id || "" });
        } else {
          if (jsonResponse && jsonResponse.error) {
            reject(
              new ApiError(
                xhr.status,
                jsonResponse.error.message || "Upload failed",
                jsonResponse.error.code || `http_${xhr.status}`,
                jsonResponse.error.details
              )
            );
          } else {
            reject(new ApiError(xhr.status, xhr.statusText || "Upload failed", `http_${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new ApiError(0, "Network failure during upload", "network"));
      };

      xhr.send(formData);
    });
  },

  async getJob(jobId: string): Promise<Job> {
    return request<Job>(`/api/v1/jobs/${jobId}`);
  },

  async cancelJob(jobId: string): Promise<{ status: string; job_id: string; success: boolean }> {
    return request<{ status: string; job_id: string; success: boolean }>(`/api/v1/jobs/${jobId}/cancel`, {
      method: "POST",
    });
  },

  async getResult(jobId: string): Promise<Result> {
    return request<Result>(`/api/v1/results/${jobId}`);
  },

  async deleteResult(jobId: string, permanent = false): Promise<void> {
    const query = permanent ? "?permanent=true" : "";
    return request<void>(`/api/v1/results/${jobId}${query}`, {
      method: "DELETE",
    });
  },

  async restoreResult(jobId: string): Promise<{ status: string }> {
    return request<{ status: string }>(`/api/v1/results/${jobId}/restore`, {
      method: "POST",
    });
  },

  async restoreTrash(jobId: string): Promise<{ status: string }> {
    return this.restoreResult(jobId);
  },

  async getHistory(
    paramsOrTankId?:
      | string
      | {
          tank_id?: string;
          page?: number;
          page_size?: number;
          level?: string;
        }
  ): Promise<HistoryResponse> {
    const q = new URLSearchParams();
    if (typeof paramsOrTankId === "string") {
      if (paramsOrTankId) q.set("tank_id", paramsOrTankId);
    } else if (paramsOrTankId) {
      if (paramsOrTankId.tank_id) q.set("tank_id", paramsOrTankId.tank_id);
      if (paramsOrTankId.page) q.set("page", String(paramsOrTankId.page));
      if (paramsOrTankId.page_size) q.set("page_size", String(paramsOrTankId.page_size));
      if (paramsOrTankId.level) q.set("level", paramsOrTankId.level);
    }
    const qs = q.toString() ? `?${q.toString()}` : "";
    return request<HistoryResponse>(`/api/v1/history${qs}`);
  },

  async getInsights(tankId?: string): Promise<Insights> {
    const q = tankId ? `?tank_id=${encodeURIComponent(tankId)}` : "";
    return request<Insights>(`/api/v1/insights${q}`);
  },

  async getTrash(): Promise<TrashItem[]> {
    return request<TrashItem[]>("/api/v1/trash");
  },

  async listTrash(): Promise<TrashItem[]> {
    return this.getTrash();
  },

  async purgeTrash(): Promise<{ purged: number }> {
    return request<{ purged: number }>("/api/v1/trash/purge", {
      method: "POST",
    });
  },

  async listAlerts(unreadOnly?: boolean): Promise<Alert[]> {
    const alerts = await request<Alert[]>("/api/v1/alerts");
    if (unreadOnly) {
      return alerts.filter((a) => !a.read);
    }
    return alerts;
  },

  async markAlertRead(alertId: string): Promise<Alert> {
    return request<Alert>(`/api/v1/alerts/${alertId}/read`, {
      method: "POST",
    });
  },

  async markAllAlertsRead(): Promise<{ status: string }> {
    return request<{ status: string }>("/api/v1/alerts/read-all", {
      method: "POST",
    });
  },

  async getAlertSettings(): Promise<AlertSettings> {
    return request<AlertSettings>("/api/v1/settings/alerts");
  },

  async updateAlertSettings(update: AlertSettingsUpdate): Promise<AlertSettings> {
    return request<AlertSettings>("/api/v1/settings/alerts", {
      method: "PUT",
      body: JSON.stringify(update),
    });
  },

  async seedDemo(): Promise<DemoSeed> {
    return request<DemoSeed>("/api/v1/demo/seed", {
      method: "POST",
    });
  },

  getVideoUrl(jobId: string, format?: "webm"): string {
    return apiUrl(`/api/v1/results/${jobId}/video${format ? `?format=${format}` : ""}`);
  },

  getPdfUrl(jobId: string): string {
    return apiUrl(`/api/v1/results/${jobId}/report.pdf`);
  },

  getFrameUrl(jobId: string, frameId: string): string {
    return apiUrl(`/api/v1/results/${jobId}/frames/${frameId}`);
  },

  async listResources(params?: {
    category?: string;
    type?: string;
    q?: string;
    featured?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<ResourcesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.q) searchParams.set("q", params.q);
    if (params?.featured !== undefined) searchParams.set("featured", String(params.featured));
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.page_size) searchParams.set("page_size", String(params.page_size));
    const qs = searchParams.toString();
    return request<ResourcesResponse>(`/api/v1/resources${qs ? `?${qs}` : ""}`);
  },

  async getResource(id: string): Promise<ResourceItem> {
    return request<ResourceItem>(`/api/v1/resources/${id}`);
  },

  getResourceFileUrl(id: string): string {
    return apiUrl(`/api/v1/resources/${id}/file`);
  },

  getResourcePreviewUrl(id: string): string {
    return apiUrl(`/api/v1/resources/${id}/preview`);
  },

  getResourceThumbUrl(id: string): string {
    return apiUrl(`/api/v1/resources/${id}/thumb`);
  },
};
