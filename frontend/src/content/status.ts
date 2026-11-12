export type StatusKind = "implemented" | "prototype" | "validation" | "planned" | "mock" | "real";

export interface StatusItem {
  id: string;
  name: string;
  category: string;
  status: StatusKind;
  statusLabel: string;
  detail: string;
  dynamicKey?: "onnx_detector";
}

export const SYSTEM_STATUS_ITEMS: StatusItem[] = [
  {
    id: "upload-validation",
    name: "Video upload and validation",
    category: "Platform",
    status: "implemented",
    statusLabel: "Implemented",
    detail: "Same-origin upload, ffprobe metadata validation, video quality probe, brightness/contrast/sharpness/shake checks.",
  },
  {
    id: "detector-classical",
    name: "Classical detector",
    category: "Vision",
    status: "implemented",
    statusLabel: "Implemented",
    detail: "MOG2 background subtraction with circular hue clustering, static decor suppression, watershed blob splitting, template coasting up to 12s.",
  },
  {
    id: "detector-learned",
    name: "Learned detector",
    category: "Vision",
    status: "prototype",
    statusLabel: "Awaiting trained weights",
    detail: "YOLO/ONNX runtime detector adapter. Ready for model weights in weights/matsya_detector.onnx.",
    dynamicKey: "onnx_detector",
  },
  {
    id: "scoring-rules",
    name: "Stress scoring rules",
    category: "Analysis",
    status: "implemented",
    statusLabel: "Implemented",
    detail: "Deterministic rules for speed, erratic turns, bottom freezing, and surface gasping. Note: thresholds are not clinically validated.",
  },
  {
    id: "history-reports",
    name: "History, FSI, alerts, PDF reports",
    category: "Application",
    status: "implemented",
    statusLabel: "Implemented",
    detail: "Permanent and bin history, Fish Stress Index trend calculation, high-stress alert badges, and server-side PDF generation with ReportLab.",
  },
  {
    id: "live-camera",
    name: "Live camera stream analysis",
    category: "Hardware",
    status: "planned",
    statusLabel: "Planned",
    detail: "Continuous RTSP/WebRTC ingest pipeline for dedicated tank cameras.",
  },
  {
    id: "water-sensor",
    name: "Water sensor integration",
    category: "Telemetry",
    status: "planned",
    statusLabel: "Planned",
    detail: "Direct correlation of behavioural scores with temperature, pH, ammonia, and dissolved oxygen probes.",
  },
];
