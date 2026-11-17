export interface ShowcaseEntry {
  id: string;
  title: string;
  kind: "synthetic" | "open_licence";
  badge: string;
  description: string;
  tankName: string | null;
  createdAt: string | null;
  score: number | null;
  level: string | null;
  fishCount: number | null;
  analysisTimeSeconds: number | null;
  videoUrl: string | null;
  pdfUrl: string | null;
  posterUrl: string | null;
  creator: string | null;
  sourceUrl: string | null;
  license: string | null;
  attribution: string | null;
}

export interface ShowcaseResource {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  year: number | null;
  sizeBytes: number;
  fileUrl: string | null;
  thumbUrl: string | null;
  previewUrl: string | null;
  synthetic: boolean;
}
