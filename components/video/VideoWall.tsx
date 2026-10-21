"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { site } from "@/data/site";
import { bombita } from "@/data/media";
import { cn } from "@/lib/utils";
import { playInline } from "@/lib/utils/video";
import { ScrollX } from "@/components/animations/ScrollX";
import { SplitReveal } from "@/components/animations/Reveal";
import { Marquee } from "@/components/ui/Marquee";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { PlayButton } from "./PlayButton";
import { VideoModal } from "./VideoModal";

/** A vertical clip that loads near the viewport and plays only while visible. */
export function LazyLoop({ src, poster, className }: { src: string; poster: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Data Saver: keep the poster frame, don't download looping footage.
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
    // Only decode while at least a quarter is on screen (fewer simultaneous videos while scrolling).
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) playInline(v, src);
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return (
    <>
      <Image src={poster} alt="" fill sizes="(min-width: 768px) 22vw, 60vw" quality={75} className="object-cover" />
      <video ref={ref} poster={poster} muted loop playsInline preload="none" aria-hidden className={cn("absolute inset-0 h-full w-full object-cover", className)} />
    </>
  );
}

/** "This is Bombita" — a scroll-driven wall of real footage. */
export function VideoWall() {
  // null = closed, "film" = the recap film, otherwise the reel's full clip.
  const [open, setOpen] = useState<null | "film" | keyof typeof bombita.clips>(null);
  const reels = bombita.reels;
  const clip = open && open !== "film" ? bombita.clips[open] : null;

  return (
    <section aria-labelledby="wall-title" className="relative overflow-hidden bg-ink-950 py-20 md:py-28">
      <Marquee
        items={["This is Bombita", "La fiesta se vive", "Uptown NYC"]}
        className="pointer-events-none absolute inset-x-0 top-[62%] -translate-y-1/2 font-display text-[22vw] leading-none text-white/[0.035] md:text-[15vw]"
        duration={50}
        starClassName="text-red-500/20"
      />

      <div className="container-lux relative mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
        <div>
          <SectionLabel>Real footage · Bombita Party</SectionLabel>
          <SplitReveal as="h2" className="mt-5 font-display text-[clamp(3.25rem,9vw,8rem)] uppercase leading-[0.86] tracking-wide">
            <span id="wall-title">
              This is <span className="text-gold-300">Bombita.</span>
            </span>
          </SplitReveal>
        </div>
        <button type="button" onClick={() => setOpen("film")} className="group flex items-center gap-4 self-start md:self-end" aria-label="Play the full Bombita Party film with sound">
          <PlayButton size="sm" />
          <span className="text-left">
            <span className="eyebrow block text-gold-300">Watch the film</span>
            <span className="text-xs uppercase tracking-[0.2em] text-mute">1:21 · sound on</span>
          </span>
        </button>
      </div>

      <ScrollX distance={30} className="relative">
        {reels.map((r, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpen(r.clip ?? "film")}
            data-cursor="Play"
            aria-label={r.clip ? `Play video: ${bombita.clips[r.clip].title}` : `Play the Bombita Party film — ${r.label}`}
            className={cn(
              "group relative mr-3 aspect-[9/16] w-[58vw] shrink-0 overflow-hidden border border-white/10 text-left transition-colors duration-500 hover:border-gold-400/70 sm:w-[34vw] md:mr-5 md:w-[21vw] xl:w-[17vw]",
              i % 2 ? "md:mt-16" : "",
            )}
          >
            <LazyLoop src={r.src} poster={r.poster} className="transition-transform duration-[1.4s] ease-[var(--ease-expo)] group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-transparent to-ink-950/20" />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
              <span className="font-display text-2xl uppercase tracking-wide text-white md:text-3xl">{r.label}</span>
              <span className="h-0.5 w-6 bg-red-500 transition-all duration-500 group-hover:w-10" aria-hidden />
            </span>
          </button>
        ))}
      </ScrollX>

      <VideoModal
        open={open !== null}
        onClose={() => setOpen(null)}
        sources={clip ? clip.src : site.reel.sources}
        poster={clip ? clip.poster : site.reel.poster}
        portrait
        title={clip ? clip.title : "Bombita Party — the recap"}
      />
    </section>
  );
}
