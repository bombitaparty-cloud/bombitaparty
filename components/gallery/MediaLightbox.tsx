"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryItem } from "@/lib/media/types";
import { useLenis } from "@/components/animations/Providers";

const ease = [0.16, 1, 0.3, 1] as const;

export const longDate = (d: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

/**
 * Full-screen viewer for gallery photos and videos. Full-resolution files are
 * only requested here — the grid shows thumbnails. Keyboard (←/→/Esc) + swipe.
 */
export function MediaLightbox({
  items,
  index,
  total,
  onNearEnd,
  onChange,
  onClose,
}: {
  items: GalleryItem[];
  index: number | null;
  /** Full count (the grid may not have loaded every page yet). */
  total?: number;
  /** Called when the viewer gets close to the last loaded item. */
  onNearEnd?: () => void;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const lenis = useLenis();
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const open = index !== null;

  const go = useCallback(
    (dir: 1 | -1) => {
      if (index === null) return;
      onChange((index + dir + items.length) % items.length);
    },
    [index, items.length, onChange],
  );

  useEffect(() => {
    if (!open) return;
    const l = lenis.current;
    l?.stop();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      l?.start();
    };
  }, [open, go, onClose, lenis]);

  // Warm the neighbours so swiping feels instant (display size only), and fetch the next page early.
  useEffect(() => {
    if (index === null) return;
    if (index >= items.length - 3) onNearEnd?.();
    for (const d of [1, -1]) {
      const n = items[(index + d + items.length) % items.length];
      if (n?.type === "image" && n.display) new window.Image().src = n.display.url;
    }
  }, [index, items, onNearEnd]);

  if (typeof document === "undefined") return null;
  const item = index !== null ? items[index] : null;
  const label = item ? item.title || item.caption || `${item.type === "video" ? "Video" : "Photo"} from ${longDate(item.date)}` : "";

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={item.type === "video" ? "Video player" : "Photo viewer"}
          className="fixed inset-0 z-[125] flex items-center justify-center bg-ink-950/97 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <AnimatePresence mode="wait">
            <motion.figure
              key={item.id}
              className="relative flex h-[78svh] w-[94vw] max-w-6xl flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              onClick={(e) => e.stopPropagation()}
            >
              {item.type === "video" && item.video ? (
                <video
                  key={item.video.url}
                  src={item.video.url}
                  poster={item.poster?.url ?? item.thumb.url}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="max-h-full max-w-full bg-black"
                  style={{ aspectRatio: item.width && item.height ? `${item.width} / ${item.height}` : undefined }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- already-optimized CDN renditions
                <img
                  src={(item.display ?? item.thumb).url}
                  srcSet={[item.display && `${item.display.url} ${item.display.w}w`, item.large && `${item.large.url} ${item.large.w}w`].filter(Boolean).join(", ") || undefined}
                  sizes="94vw"
                  alt={label}
                  width={item.width ?? undefined}
                  height={item.height ?? undefined}
                  decoding="async"
                  className="max-h-full max-w-full object-contain"
                  style={{ backgroundImage: `url(${item.thumb.url})`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" }}
                />
              )}
              {(item.title || item.caption) && (
                <figcaption className="mt-3 max-w-2xl text-center text-sm text-white/80">
                  {item.title && <span className="font-semibold text-white">{item.title}</span>}
                  {item.title && item.caption ? " — " : ""}
                  {item.caption}
                </figcaption>
              )}
            </motion.figure>
          </AnimatePresence>

          <p className="eyebrow absolute inset-x-4 bottom-5 text-center text-mute tabular-nums">
            <span className="hidden sm:inline">{longDate(item.date)} · </span>
            {index! + 1} / {Math.max(total ?? 0, items.length)}
          </p>
          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous"
                className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-ink-950/40 text-white transition-colors hover:border-gold-400 hover:text-gold-300 md:left-8"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="Next"
                className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-ink-950/40 text-white transition-colors hover:border-gold-400 hover:text-gold-300 md:right-8"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-gold-400 hover:text-gold-300 md:right-8 md:top-8"
          >
            <X className="h-5 w-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
