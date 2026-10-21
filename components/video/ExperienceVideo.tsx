"use client";

import { useRef, useState } from "react";
import { site } from "@/data/site";
import { reel } from "@/data/media";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { PlayButton } from "./PlayButton";
import { VideoModal } from "./VideoModal";
import { LazyLoop } from "./VideoWall";

/**
 * "Feel the energy": a sticky, scroll-scrubbed sequence. The vertical frame
 * of the recap film grows from a card to full height while the headline
 * splits around it and two side clips drift in. Click opens the film with sound.
 */
export function ExperienceVideo() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);
      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.6 } })
        .fromTo(q("[data-frame]"), { scale: 0.62, rotate: -4 }, { scale: 1, rotate: 0, ease: "none" }, 0)
        .fromTo(q("[data-left]"), { xPercent: 30 }, { xPercent: -10, ease: "none" }, 0)
        .fromTo(q("[data-right]"), { xPercent: -30 }, { xPercent: 10, ease: "none" }, 0)
        .fromTo(q("[data-side='a']"), { yPercent: 40, rotate: -12, autoAlpha: 0 }, { yPercent: -10, rotate: -6, autoAlpha: 1, ease: "none" }, 0)
        .fromTo(q("[data-side='b']"), { yPercent: 60, rotate: 12, autoAlpha: 0 }, { yPercent: -20, rotate: 6, autoAlpha: 1, ease: "none" }, 0)
        .fromTo(q("[data-foot]"), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, ease: "none" }, 0.55);
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="energy-title" className="relative h-[200svh] bg-ink-950">
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_50%,rgba(224,38,47,.14),transparent_70%)]" />

        {/* Headline split around the frame */}
        <h2 id="energy-title" className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-[var(--gutter)] font-display text-[clamp(3rem,11vw,11rem)] uppercase leading-none tracking-wide">
          <span data-left className="will-change-transform [text-shadow:0_10px_40px_rgba(0,0,0,.9)]">Feel the</span>
          <span data-right className="text-gold-300 will-change-transform [text-shadow:0_10px_40px_rgba(0,0,0,.9)]">energy.</span>
        </h2>

        {/* Side clips */}
        <div data-side="a" aria-hidden className="absolute left-[6vw] top-[14%] hidden aspect-[9/16] w-[12vw] overflow-hidden border border-white/15 md:block">
          <LazyLoop src={reel(8).src} poster={reel(8).poster} />
        </div>
        <div data-side="b" aria-hidden className="absolute bottom-[10%] right-[6vw] hidden aspect-[9/16] w-[12vw] overflow-hidden border border-white/15 md:block">
          <LazyLoop src={reel(10).src} poster={reel(10).poster} />
        </div>

        {/* Main vertical frame */}
        <button
          type="button"
          data-frame
          onClick={() => setOpen(true)}
          data-cursor="Play"
          aria-label="Play the Bombita Party recap film with sound"
          className="group relative z-10 aspect-[9/16] h-[86svh] max-w-[92vw] overflow-hidden border border-gold-400/60 shadow-[0_60px_120px_-30px_rgba(0,0,0,.95),0_0_80px_-30px_rgba(224,185,79,.5)] will-change-transform"
        >
          <LazyLoop src={site.reel.preview} poster={site.reel.poster} />
          <span className="absolute inset-0 bg-ink-950/25 transition-colors duration-500 group-hover:bg-ink-950/5" />
          <span className="absolute inset-0 flex items-center justify-center">
            <PlayButton ring="Sound on • Bombita Party • " />
          </span>
        </button>

        <div data-foot className="container-lux pointer-events-none absolute inset-x-0 bottom-6 z-20 flex items-end justify-between gap-6 md:bottom-10">
          <SectionLabel>Bombita experience</SectionLabel>
          <p className="hidden max-w-xs text-right text-sm leading-relaxed text-white/80 md:block">
            <span className="mb-2 block font-display text-2xl tracking-wide text-white">{site.phrases.home}</span>
            Live artists, the city&apos;s best Latin DJs and a crowd that shows up.
          </p>
        </div>
      </div>

      <VideoModal open={open} onClose={() => setOpen(false)} sources={site.reel.sources} poster={site.reel.poster} portrait title="Bombita Party — the recap" />
    </section>
  );
}
