export interface ArchitectureNode {
  id: string;
  name: string;
  layer: "frontend" | "gateway" | "api" | "jobs" | "analysis" | "storage";
  technology: string;
  fileLocation: string;
  status: "implemented" | "prototype" | "planned";
  description: string;
  inputs?: string[];
  outputs?: string[];
}

export const ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    id: "node-frontend",
    name: "Web Interface",
    layer: "frontend",
    technology: "Next.js 14, React 18, Tailwind CSS",
    fileLocation: "frontend/src/app",
    status: "implemented",
    description: "Responsive web client providing public science documentation and research dashboard. Communicates exclusively via same-origin /api/v1/ endpoints.",
    inputs: ["User video upload", "User configuration"],
    outputs: ["HTTP multipart requests", "Job polling requests"],
  },
  {
    id: "node-gateway",
    name: "Reverse Proxy & Gateway",
    layer: "gateway",
    technology: "Caddy / Next.js Rewrite Proxy",
    fileLocation: "deploy/Caddyfile & next.config.mjs",
    status: "implemented",
    description: "Serves static frontend assets and routes /api/* requests to the FastAPI backend, eliminating cross-origin complications and enforcing secure headers.",
    inputs: ["Client HTTP requests"],
    outputs: ["Routed API traffic", "Static page delivery"],
  },
  {
    id: "node-api",
    name: "REST API Service",
    layer: "api",
    technology: "FastAPI, Python 3.12, Pydantic",
    fileLocation: "backend/app/main.py",
    status: "implemented",
    description: "Validates incoming requests against strict Pydantic schemas, manages tank metadata, spawns background analysis jobs, and generates PDF reports.",
    inputs: ["Routed API traffic"],
    outputs: ["JSON responses", "PDF reports", "Video media streams"],
  },
  {
    id: "node-jobs",
    name: "Job Execution Engine",
    layer: "jobs",
    technology: "Python Asynchronous Queue",
    fileLocation: "backend/app/analysis/jobs.py",
    status: "implemented",
    description: "Orchestrates multi-stage processing: clean, probe, detect, track, score, and advise. Tracks stage completion percentage and state transitions.",
    inputs: ["New job submission"],
    outputs: ["Stage updates", "Pipeline execution trigger"],
  },
  {
    id: "node-analysis",
    name: "Computer Vision & Scoring Pipeline",
    layer: "analysis",
    technology: "OpenCV, NumPy, SciPy Hungarian Matching",
    fileLocation: "backend/app/analysis/",
    status: "implemented",
    description: "Executes video quality probe, 3-cue classical motion/hue segmentation, distance-transform blob splitting, template coasting, feature extraction, and rule scoring.",
    inputs: ["Raw video file", "Tank parameters"],
    outputs: ["Trajectory points", "Fish metrics", "Annotated H.264/WebM video"],
  },
  {
    id: "node-storage",
    name: "Persistent File & Metadata Storage",
    layer: "storage",
    technology: "Local Filesystem & Atomic JSON I/O",
    fileLocation: "storage/",
    status: "implemented",
    description: "Stores tank configurations, historical results, annotated media, and cached PDF reports with directory mtime invalidation and trash-bin lifecycle.",
    inputs: ["Result objects", "Annotated video files"],
    outputs: ["Stored results", "Purge/restore actions"],
  },
];
