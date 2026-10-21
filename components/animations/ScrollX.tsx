"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/** Drifts its row horizontally as the page scrolls (scrubbed). */
export function ScrollX({
  children,
  className,
  distance = 18,
  reverse,
}: {
  children: ReactNode;
  className?: string;
  /** Travel as a percentage of the row width. */
  distance?: number;
  reverse?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // Desktop: the row drifts with page scroll. Phones: native finger swipe.
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        gsap.fromTo(
          row.current,
          { xPercent: reverse ? -distance : 0 },
          {
            xPercent: reverse ? 0 : -distance,
            ease: "none",
            scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden max-md:no-scrollbar max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:overscroll-x-contain",
        className,
      )}
    >
      <div ref={row} className="flex w-max will-change-transform max-md:px-[var(--gutter)] max-md:[&>*]:snap-start max-md:[&>*]:scroll-ml-[var(--gutter)]">
        {children}
      </div>
    </div>
  );
}
