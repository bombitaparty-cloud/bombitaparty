"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { Video } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/animations/Reveal";
import { PlayButton } from "./PlayButton";
import { VideoModal } from "./VideoModal";

function VideoCard({ video, onOpen, large }: { video: Video; onOpen: () => void; large?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || !video.preview) return;
        setHovering(true);
        requestAnimationFrame(() => ref.current?.play().catch(() => {}));
      }}
      onPointerLeave={() => {
        ref.current?.pause();
        setHovering(false);
      }}
      data-cursor="Play"
      aria-label={`Play ${video.title}`}
      className={cn("group relative block w-full overflow-hidden text-left", large ? "aspect-[16/10] md:aspect-[21/9]" : "aspect-video")}
    >
      <Image
        src={video.poster}
        alt=""
        fill
        sizes={large ? "100vw" : "(min-width: 768px) 50vw, 100vw"}
        quality={75}
        className="img-cine object-cover transition-transform duration-[1.4s] ease-[var(--ease-expo)] group-hover:scale-105"
      />
      {video.preview && (
        <video
          ref={ref}
          src={hovering ? video.preview : undefined}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-700", hovering ? "opacity-100" : "opacity-0")}
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-transparent" />
      <span className="pointer-events-none absolute inset-0 border border-gold-400/0 transition-colors duration-500 group-hover:border-gold-400/60" />
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-8">
        <span>
          {video.subtitle && <span className="eyebrow block text-gold-400">{video.subtitle}</span>}
          <span className={cn("mt-2 block font-display tracking-wide", large ? "text-5xl md:text-8xl" : "text-3xl md:text-4xl")}>
            {video.title}
          </span>
        </span>
        <span className="flex items-center gap-4">
          {video.duration && <span className="text-xs tabular-nums tracking-[0.2em] text-white/70">{video.duration}</span>}
          <PlayButton size="sm" />
        </span>
      </span>
    </button>
  );
}

export function VideoGrid({ videos }: { videos: Video[] }) {
  const [active, setActive] = useState<Video | null>(null);
  const [featured, ...rest] = [...videos].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  return (
    <>
      {featured && <VideoCard video={featured} large onOpen={() => setActive(featured)} />}
      <Reveal stagger={0.08} className="mt-5 grid gap-5 md:grid-cols-2">
        {rest.map((v) => (
          <VideoCard key={v.id} video={v} onOpen={() => setActive(v)} />
        ))}
      </Reveal>
      <VideoModal
        open={!!active}
        onClose={() => setActive(null)}
        sources={active?.sources ?? ""}
        poster={active?.poster}
        portrait={active?.portrait}
        title={active?.title ?? ""}
      />
    </>
  );
}
