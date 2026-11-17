import Link from "next/link";
import type { ShowcaseEntry } from "@/lib/showcase-types";

export default function ShowcaseResult({ item }: { item: ShowcaseEntry }) {
  const isSynthetic = item.kind === "synthetic";
  return (
    <main className="min-h-screen bg-abyss text-ink px-6 sm:px-12 py-16 sm:py-20">
      <div className="max-w-5xl mx-auto space-y-8">
        <Link href="/app" className="text-xs font-mono text-aqua hover:underline">← Back to featured analyses</Link>
        <header className="space-y-3 border-b border-hair pb-7">
          <p className="font-mono text-xs uppercase tracking-wider text-aqua">{item.badge}</p>
          <h1 className="font-serif text-3xl sm:text-4xl">{item.title}</h1>
          <p className="text-sm text-ink-2 max-w-3xl leading-relaxed">{item.description}</p>
          {isSynthetic ? (
            <p className="text-xs border border-warn/30 bg-warn/5 text-warn rounded px-3 py-2 inline-block">Synthetic demonstration — not observed aquarium footage.</p>
          ) : (
            <p className="text-xs border border-aqua/30 bg-aqua/5 text-aqua rounded px-3 py-2 inline-block">Open-licence clip, analysed by Matsya. This is not independent detector validation.</p>
          )}
        </header>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="hairline-panel p-4"><div className="text-[10px] uppercase font-mono text-ink-3">Indicative score</div><div className="text-2xl font-mono text-ink mt-1">{item.score ?? "—"}</div></div>
          <div className="hairline-panel p-4"><div className="text-[10px] uppercase font-mono text-ink-3">Reported level</div><div className="text-lg font-mono text-ink mt-2">{item.level || "Not recorded"}</div></div>
          <div className="hairline-panel p-4"><div className="text-[10px] uppercase font-mono text-ink-3">Tracked fish</div><div className="text-2xl font-mono text-ink mt-1">{item.fishCount ?? "—"}</div></div>
          <div className="hairline-panel p-4"><div className="text-[10px] uppercase font-mono text-ink-3">Analysis time</div><div className="text-lg font-mono text-ink mt-2">{item.analysisTimeSeconds != null ? `${item.analysisTimeSeconds.toFixed(1)} s` : "—"}</div></div>
        </section>

        <p className="text-xs text-ink-3 leading-relaxed">Scores in this archive are historical output snapshots and are shown as indicative. They are not a validated stress measure or a veterinary diagnosis.</p>
        {item.videoUrl && (
          <section className="space-y-3">
            <h2 className="font-serif text-2xl">Annotated video</h2>
            <video controls preload="metadata" poster={item.posterUrl || undefined} src={item.videoUrl} className="w-full max-h-[560px] bg-black rounded-lg border border-hair" />
          </section>
        )}
        {item.pdfUrl && <a href={item.pdfUrl} download className="btn-primary-gold inline-flex px-5 py-3 text-xs font-mono uppercase tracking-wider">Download report PDF</a>}
        {item.creator && <section className="hairline-panel p-5 space-y-2"><h2 className="font-mono text-xs uppercase tracking-wider text-aqua">Source attribution</h2><p className="text-sm text-ink-2">{item.creator}{item.sourceUrl ? <> · <a className="underline" href={item.sourceUrl} rel="noreferrer">Source</a></> : null}</p><p className="text-xs text-ink-3">Licence: {item.license || "Not supplied"}. {item.attribution || "Retain the original source credit and licence notice."}</p></section>}
      </div>
    </main>
  );
}
