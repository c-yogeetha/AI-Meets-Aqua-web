import Link from "next/link";
import resourceData from "@/data/showcase-resources.json";
import type { ShowcaseResource } from "@/lib/showcase-types";

const resources = resourceData as ShowcaseResource[];

export default function ShowcaseResources() {
  return (
    <main className="max-w-7xl mx-auto px-6 sm:px-12 py-16 sm:py-24 space-y-10">
      <header className="space-y-3 border-b border-hair pb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-aqua">Resources / static index</p>
        <h1 className="font-serif text-4xl sm:text-5xl text-ink">Research & artifact library</h1>
        <p className="text-sm text-ink-2 max-w-2xl">A locally bundled index of project resources. Items marked synthetic are generated examples, not measured aquarium observations.</p>
      </header>
      {resources.length === 0 ? <p className="hairline-panel p-8 text-sm text-ink-2">No public resources have been included in this build.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {resources.map((item) => (
            <article key={item.id} className="hairline-panel bg-trench/30 overflow-hidden flex flex-col">
              {item.previewUrl ? <video src={item.previewUrl} muted controls preload="metadata" className="w-full aspect-video object-cover bg-abyss" /> : item.thumbUrl ? <img src={item.thumbUrl} alt="" className="w-full aspect-video object-contain bg-abyss" /> : null}
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-aqua"><span>{item.category}</span><span>·</span><span>{item.type}</span></div>
                <h2 className="font-serif text-xl text-ink">{item.title}</h2>
                <p className="text-xs leading-relaxed text-ink-2">{item.description}</p>
                {item.synthetic && <span className="text-[10px] font-mono uppercase text-warn">Synthetic project material</span>}
                <div className="mt-auto pt-3">{item.fileUrl ? <a href={item.fileUrl} download className="text-xs font-mono text-aqua hover:underline">Download resource →</a> : <span className="text-xs text-ink-3">No bundled file</span>}</div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="border-t border-hair pt-5"><Link href="/app" className="text-xs font-mono text-aqua hover:underline">Browse featured analyses →</Link></div>
    </main>
  );
}
