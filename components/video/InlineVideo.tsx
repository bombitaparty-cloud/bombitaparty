"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { PlayButton } from "./PlayButton";
import { VideoModal } from "./VideoModal";
import { playInline } from "@/lib/utils/video";
import { cn } from "@/lib/utils";

/**
 * Event video: a muted preview plays while it is on screen (nothing loads
 * before that), and a tap opens the fullscreen player with sound.
 * Vertical footage is detected from the file and shown in a 9:16 frame.
 */
export function InlineVideo({ src, poster, title }: { src: string; poster: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onMeta = () => setPortrait(v.videoHeight > v.videoWidth);
    v.addEventListener("loadedmetadata", onMeta);
    // Fetch only the header up front so the frame gets the right shape before it scrolls in.
    v.muted = true;
    v.setAttribute("muted", "");
    v.preload = "metadata";
    v.dataset.src = src;
    v.src = src;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) playInline(v, src);
        else v.pause();
      },
      { rootMargin: "200px" },
    );
    io.observe(v);
    return () => {
      io.disconnect();
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, [src]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-cursor="Play"
        aria-label={`Play video: ${title}`}
        className={cn(
          "group relative mx-auto block w-full overflow-hidden border border-white/10",
          portrait ? "aspect-[9/16] max-w-md" : "aspect-video",
        )}
      >
        <Image src={poster} alt="" fill sizes={portrait ? "448px" : "(min-width: 1024px) 70vw, 100vw"} quality={75} className="img-cine object-cover" />
        <video
          ref={ref}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-expo)] group-hover:scale-105"
        />
        <span className="absolute inset-0 bg-ink-950/30 transition-colors duration-500 group-hover:bg-ink-950/10" />
        <span className="absolute inset-0 flex items-center justify-center">
          <PlayButton ring={`${title} • Bombita • `} />
        </span>
      </button>
      <VideoModal open={open} onClose={() => setOpen(false)} sources={src} poster={poster} title={title} portrait={portrait} />
    </>
  );
}
