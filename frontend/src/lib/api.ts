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
export type DemoSeed = components["schemas"]["DemoSeedResponse"];

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

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
  getBaseUrl(): string {
    return API_BASE;
  },

  async getHealth(): Promise<{ status: string }> {
    return request<{ status: string }>("/health");
  },

  async getSystemInfo(): Promise<SystemInfo> {
    return request<SystemInfo>("/api/v1/system/info");
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

  async deleteTank(tankId: string): Promise<void> {
    return request<void>(`/api/v1/tanks/${tankId}`, {
      method: "DELETE",
    });
  },

  async uploadVideo(formData: FormData, signal?: AbortSignal): Promise<{ job_id: string; video_id: string }> {
    return request<{ job_id: string; video_id: string }>("/api/v1/videos", {
      method: "POST",
      body: formData,
      signal,
    });
  },

  async getJob(jobId: string): Promise<Job> {
    return request<Job>(`/api/v1/jobs/${jobId}`);
  },

  async getResult(jobId: string): Promise<Result> {
    return request<Result>(`/api/v1/results/${jobId}`);
  },

  async deleteResult(jobId: string): Promise<void> {
    return request<void>(`/api/v1/results/${jobId}`, {
      method: "DELETE",
    });
  },

  async getHistory(tankId?: string, limit = 50): Promise<HistoryResponse> {
    const params = new URLSearchParams();
    if (tankId) params.set("tank_id", tankId);
    if (limit) params.set("limit", limit.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<HistoryResponse>(`/api/v1/history${query}`);
  },

  async getInsights(tankId?: string): Promise<Insights> {
    const query = tankId ? `?tank_id=${encodeURIComponent(tankId)}` : "";
    return request<Insights>(`/api/v1/insights${query}`);
  },

  async listTrash(): Promise<TrashItem[]> {
    return request<TrashItem[]>("/api/v1/trash");
  },

  async restoreTrash(jobId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/v1/results/${jobId}/restore`, {
      method: "POST",
    });
  },

  async purgeTrash(): Promise<{ purged: number }> {
    return request<{ purged: number }>("/api/v1/trash/purge", {
      method: "POST",
    });
  },

  async listAlerts(unread?: boolean): Promise<Alert[]> {
    const query = typeof unread === "boolean" ? `?unread=${unread}` : "";
    return request<Alert[]>(`/api/v1/alerts${query}`);
  },

  async markAlertRead(alertId: string): Promise<Alert> {
    return request<Alert>(`/api/v1/alerts/${alertId}/read`, {
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

  getVideoUrl(jobId: string): string {
    return `${API_BASE}/api/v1/results/${jobId}/video`;
  },

  getPdfUrl(jobId: string): string {
    return `${API_BASE}/api/v1/results/${jobId}/pdf`;
  },

  getFrameUrl(jobId: string, frameId: string): string {
    return `${API_BASE}/api/v1/results/${jobId}/frames/${frameId}`;
  },
};
