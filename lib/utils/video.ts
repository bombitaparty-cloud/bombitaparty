"use client";

import type { VideoSources } from "@/lib/cms/types";

interface NetworkInfo {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
}

const connection = (): NetworkInfo | undefined =>
  (navigator as Navigator & { connection?: NetworkInfo }).connection;

/** True on a fast, non-metered connection (unknown → assume fast on desktop). */
export function isFastConnection() {
  const c = connection();
  if (!c) return window.innerWidth >= 1024;
  if (c.saveData) return false;
  if (c.effectiveType && c.effectiveType !== "4g") return false;
  return (c.downlink ?? 10) >= 5;
}

/**
 * Picks the best rendition for the viewer's screen: 4K only for ≥2560 physical
 * pixels on a fast connection, 1080p for desktops, 720p for phones.
 */
export function pickSource(sources: VideoSources): string {
  const px = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
  const fast = isFastConnection();
  const order: (keyof VideoSources)[] =
    fast && px >= 2560 ? ["2160", "1080", "720"] : fast && px >= 1280 ? ["1080", "720", "2160"] : ["720", "1080", "2160"];
  for (const k of order) if (sources[k]) return sources[k]!;
  return Object.values(sources)[0] ?? "";
}

export const qualityLabel = (src: string) =>
  /2160/.test(src) ? "4K" : /1080/.test(src) ? "HD 1080p" : /720/.test(src) ? "720p" : "";

/**
 * Start a muted, inline, looping background video in a way iOS Safari accepts.
 * React renders `muted` as a property only (not an attribute in SSR HTML), and
 * iOS refuses to autoplay anything it doesn't see as muted + playsinline — so we
 * force both before assigning the source. If iOS still blocks (Low Power Mode),
 * retry on the first tap.
 */
export function playInline(v: HTMLVideoElement, src?: string) {
  v.muted = true;
  v.defaultMuted = true;
  v.setAttribute("muted", "");
  v.playsInline = true;
  v.setAttribute("playsinline", "");
  v.setAttribute("webkit-playsinline", "");
  if (src && !v.dataset.src) {
    v.dataset.src = src;
    v.src = src;
  }
  const attempt = v.play();
  if (attempt) {
    attempt.catch(() => {
      const retry = () => void v.play().catch(() => {});
      window.addEventListener("touchstart", retry, { once: true, passive: true });
      window.addEventListener("click", retry, { once: true });
    });
  }
}
