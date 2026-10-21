"use client";

import { useState } from "react";
import Image from "next/image";
import { site } from "@/data/site";
import { img } from "@/data/media";
import { PlayButton } from "@/components/video/PlayButton";
import { VideoModal } from "@/components/video/VideoModal";
import { BrushUnderline } from "@/components/ui/Logo";

/** "See the Bombita experience" banner (ref) — opens the reel. */
export function ExperienceBanner() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-cursor="Play"
        aria-label="Play the Bombita experience reel"
        className="group relative flex w-full flex-col items-start gap-8 overflow-hidden border border-white/10 p-6 text-left md:flex-row md:items-center md:p-10"
      >
        <Image src={img.sparklersCrowd} alt="" fill sizes="100vw" quality={75} className="object-cover opacity-40 transition-transform duration-[1.6s] ease-[var(--ease-expo)] group-hover:scale-105" />
        <span className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/70 to-ink-950/40" />
        <span className="relative flex items-center gap-6">
          <PlayButton size="sm" className="h-16 w-16 md:h-20 md:w-20" />
          <span>
            <span className="block font-display text-3xl leading-[0.95] tracking-wide md:text-5xl">
              See the
              <br />
              Bombita experience
            </span>
            <span className="mt-3 block text-[0.62rem] font-semibold uppercase tracking-[0.35em] text-white/75">
              Photos / Videos / Good vibes
            </span>
          </span>
        </span>
        <span className="relative ml-auto hidden border-l border-white/20 pl-10 md:block">
          <span className="block font-display text-3xl leading-[0.95] tracking-wide">
            Bombita
            <br />
            Party is home.
          </span>
          <BrushUnderline className="mt-2 block h-3 w-28" />
        </span>
      </button>
      <VideoModal open={open} onClose={() => setOpen(false)} sources={site.reel.sources} poster={site.reel.poster} title="The Bombita experience" />
    </>
  );
}
