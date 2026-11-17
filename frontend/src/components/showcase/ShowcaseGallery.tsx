import Link from "next/link";
import featuredData from "@/data/showcase-index.json";
import type { ShowcaseEntry } from "@/lib/showcase-types";

const featured = featuredData as ShowcaseEntry[];

const liveUrl = process.env.NEXT_PUBLIC_LIVE_APP_URL || "";

export default function ShowcaseGallery() {
  return (
    <main className="min-h-screen bg-abyss text-ink px-6 sm:px-12 py-16 sm:py-24">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-hair pb-8">
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-aqua">Matsya / Showcase archive</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-ink">Featured analyses</h1>
            <p className="text-sm text-ink-2 max-w-2xl leading-relaxed">
              A static, read-only collection of selected analysis snapshots. Each entry identifies its source and whether it is a synthetic demonstration or an open-licence clip.
            </p>
          </div>
          {liveUrl ? (
            <a className="btn-primary-gold text-xs uppercase font-mono tracking-wider py-2.5 px-5" href={liveUrl}>
              Open live app
            </a>
          ) : (
            <span className="text-xs font-mono text-ink-3">Live app URL will be set by the owner</span>
          )}
        </header>

        {featured.length === 0 ? (
          <section className="hairline-panel bg-trench/30 p-8 sm:p-12 space-y-3">
            <p className="font-mono text-xs uppercase tracking-wider text-aqua">No public analyses yet</p>
            <h2 className="font-serif text-2xl text-ink">The archive is intentionally empty.</h2>
            <p className="text-sm text-ink-2 max-w-2xl leading-relaxed">
              No analysis has been cleared for public display. Synthetic examples and open-licence footage will be labelled explicitly when added; unvalidated detector output will not be presented as verified performance.
            </p>
          </section>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {featured.map((item) => (
              <article key={item.id} className="hairline-panel bg-trench/30 overflow-hidden flex flex-col">
                {item.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.posterUrl} alt="" className="w-full aspect-video object-cover bg-abyss" />
                ) : item.videoUrl ? (
                  <video src={item.videoUrl} muted playsInline preload="metadata" className="w-full aspect-video object-cover bg-abyss" />
                ) : null}
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-aqua">{item.badge}</span>
                  <h2 className="font-serif text-xl text-ink">{item.title}</h2>
                  <p className="text-xs text-ink-2 leading-relaxed">{item.description}</p>
                  <div className="mt-auto pt-3 flex items-center justify-between gap-3 text-[11px] font-mono text-ink-3">
                    <span>{item.tankName || "Aquarium analysis"}</span>
                    <Link href={`/app/results/${item.id}`} className="text-aqua hover:underline">View snapshot →</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="pt-5 border-t border-hair flex flex-wrap gap-4 text-xs font-mono text-ink-3">
          <Link href="/validation" className="hover:text-aqua">Validation and limits</Link>
          <Link href="/resources" className="hover:text-aqua">Resource library</Link>
          <Link href="/" className="hover:text-aqua">Back to Matsya</Link>
        </div>
      </div>
    </main>
  );
}
