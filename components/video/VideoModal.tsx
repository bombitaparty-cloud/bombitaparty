"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { VideoSources } from "@/lib/cms/types";
import { pickSource, qualityLabel } from "@/lib/utils/video";
import { cn } from "@/lib/utils";
import { useLenis } from "@/components/animations/Providers";

const ease = [0.16, 1, 0.3, 1] as const;
const ORDER = ["2160", "1080", "720"] as const;

/** Fullscreen lightbox player with automatic (and manual) quality up to 4K. */
export function VideoModal({
  open,
  onClose,
  sources,
  poster,
  title,
  portrait,
}: {
  portrait?: boolean;
  open: boolean;
  onClose: () => void;
  sources: VideoSources | string;
  poster?: string;
  title: string;
}) {
  const lenis = useLenis();
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const map: VideoSources = typeof sources === "string" ? { "720": sources } : sources;
  const [manual, setManual] = useState<string | null>(null);
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const l = lenis.current;
    l?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
      l?.start();
      lastFocus.current?.focus?.();
    };
  }, [open, onClose, lenis]);

  // Choose the rendition when the player opens (client-only: depends on screen + network).
  const auto = open && typeof window !== "undefined" ? pickSource(map) : "";
  const current = manual && Object.values(map).includes(manual) ? manual : auto;
  if (open && current !== src) setSrc(current);
  if (!open && (src || manual)) {
    setSrc("");
    setManual(null);
  }

  if (typeof document === "undefined") return null;
  const available = ORDER.filter((k) => map[k]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-[125] flex items-center justify-center bg-ink-950/95 p-4 backdrop-blur-md md:p-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease }}
          onClick={onClose}
        >
          <motion.div
            className={cn(
              "relative overflow-hidden border border-gold-500/30 bg-black shadow-[0_40px_120px_-20px_rgba(0,0,0,.9)]",
              portrait ? "aspect-[9/16] h-[min(84svh,calc((100vw-2rem)*16/9))]" : "aspect-video w-full max-w-7xl",
            )}
            initial={{ scale: 0.92, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.8, ease }}
            onClick={(e) => e.stopPropagation()}
          >
            {src && (
              <video key={src} src={src} poster={poster} className="h-full w-full object-cover" controls autoPlay playsInline preload="auto" />
            )}
          </motion.div>

          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow hidden text-mute sm:block">{title}</p>
            {available.length > 1 && (
              <div role="radiogroup" aria-label="Video quality" className="flex border border-white/15">
                {available.map((k) => {
                  const url = map[k]!;
                  const active = url === src;
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setManual(url)}
                      className={cn(
                        "h-9 px-3 text-[0.6rem] font-bold uppercase tracking-[0.18em] transition-colors",
                        active ? "bg-gold-400 text-ink-950" : "text-white/70 hover:text-white",
                      )}
                    >
                      {qualityLabel(url)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close video"
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
