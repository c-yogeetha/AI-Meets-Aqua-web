import { notFound } from "next/navigation";
import LiveResultPage from "./LiveResultPage";
import ShowcaseResult from "@/components/showcase/ShowcaseResult";
import showcase from "@/data/showcase-index.json";
import type { ShowcaseEntry } from "@/lib/showcase-types";

export const dynamicParams = true;

export function generateStaticParams() {
  if (process.env.NEXT_PUBLIC_SHOWCASE !== "1") return [];
  return (showcase as ShowcaseEntry[]).map((item) => ({ id: item.id }));
}

export default async function ResultRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (process.env.NEXT_PUBLIC_SHOWCASE === "1") {
    const item = (showcase as ShowcaseEntry[]).find((entry) => entry.id === id);
    if (!item) notFound();
    return <ShowcaseResult item={item} />;
  }
  return <LiveResultPage initialJobId={id} />;
}
