import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official Bombita Party artwork (client-supplied, /public/logos):
 *   bombita-lockup.png   — mascot + BOMBITA + PARTY (full logo)
 *   bombita-logo.png     — mascot + BOMBITA (no PARTY line)
 *   bombita-mark.png     — mascot with gold ring (top part of the lockup)
 *   bombita-wordmark.png — gold dry-brush BOMBITA + brush stroke
 * The mark and wordmark are cut on the same seam, so stacking them
 * edge-to-edge rebuilds the full logo (hero animation). The wordmark crop
 * still carries the mascot's feet at its top edge — only use it stacked.
 */
export const LOGO = {
  lockup: { src: "/logos/bombita-lockup.png", width: 1400, height: 1352 },
  /** mascot + BOMBITA, without PARTY — pair with your own sub-line (PARTY, WEAR…). */
  logo: { src: "/logos/bombita-logo.png", width: 1400, height: 1240 },
  mark: { src: "/logos/bombita-mark.png", width: 1200, height: 708 },
  wordmark: { src: "/logos/bombita-wordmark.png", width: 1400, height: 413 },
};

/** Mascot + gold ring. Size it with a width class (height follows). */
export function BombitaMark({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src={LOGO.mark.src}
      width={LOGO.mark.width}
      height={LOGO.mark.height}
      alt=""
      aria-hidden
      priority={priority}
      sizes="(min-width: 768px) 30vw, 60vw"
      className={cn("h-auto select-none", className)}
    />
  );
}

/** Gold dry-brush BOMBITA wordmark. Size it with a width class. */
export function Wordmark({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src={LOGO.wordmark.src}
      width={LOGO.wordmark.width}
      height={LOGO.wordmark.height}
      alt=""
      aria-hidden
      priority={priority}
      sizes="(min-width: 768px) 40vw, 80vw"
      className={cn("inline-block h-auto select-none", className)}
    />
  );
}

/** Tapered brush swipe used under headings. */
export function BrushUnderline({ className, color = "#e0262f" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 300 26" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M3 17 C60 8 150 4 297 7 L295 12 C220 11 120 14 6 23 Z" fill={color} />
      <path d="M40 19 C110 14 190 12 280 12" stroke={color} strokeOpacity=".55" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

/** Compact nav/footer logo: the official lockup at small size. */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src={LOGO.lockup.src}
        width={LOGO.lockup.width}
        height={LOGO.lockup.height}
        alt=""
        aria-hidden
        priority={priority}
        sizes="96px"
        className="h-auto w-[4.25rem] md:w-[4.75rem]"
      />
      <span className="sr-only">Bombita Party</span>
    </span>
  );
}

/** Full official lockup (mascot + BOMBITA + PARTY). Size it with a width class. */
export function Lockup({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src={LOGO.lockup.src}
      width={LOGO.lockup.width}
      height={LOGO.lockup.height}
      alt="Bombita Party"
      priority={priority}
      sizes="(min-width: 768px) 40vw, 80vw"
      className={cn("h-auto select-none", className)}
    />
  );
}

/** Mascot + BOMBITA without the PARTY line. Size it with a width class. */
export function BrandLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src={LOGO.logo.src}
      width={LOGO.logo.width}
      height={LOGO.logo.height}
      alt=""
      aria-hidden
      priority={priority}
      sizes="(min-width: 768px) 30vw, 70vw"
      className={cn("h-auto select-none", className)}
    />
  );
}
