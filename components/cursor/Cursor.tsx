"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Minimal desktop cursor: white dot → gold ring over interactive elements
 * → labelled disc over elements with data-cursor="view" (or any label).
 * Disabled on touch devices and when reduced motion is requested.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"default" | "hover" | "label">("default");
  const [label, setLabel] = useState("");

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced || !dot.current || !ring.current) return;
    // CSS reveals the cursor UI (and hides the native one) only with this class.
    document.documentElement.classList.add("has-cursor");
    gsap.set([dot.current, ring.current], { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    const dx = gsap.quickTo(dot.current, "x", { duration: 0.12, ease: "power3" });
    const dy = gsap.quickTo(dot.current, "y", { duration: 0.12, ease: "power3" });
    const rx = gsap.quickTo(ring.current, "x", { duration: 0.5, ease: "power3" });
    const ry = gsap.quickTo(ring.current, "y", { duration: 0.5, ease: "power3" });
    let shown = false;

    const move = (e: PointerEvent) => {
      if (!shown) {
        gsap.to([dot.current, ring.current], { autoAlpha: 1, duration: 0.3 });
        shown = true;
      }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      const labelled = t.closest<HTMLElement>("[data-cursor]");
      if (labelled) {
        setMode("label");
        setLabel(labelled.dataset.cursor || "View");
        return;
      }
      if (t.closest("a, button, [role='button'], input[type='submit'], label, select, summary")) {
        setMode("hover");
        return;
      }
      setMode("default");
    };
    const leave = () => {
      gsap.to([dot.current, ring.current], { autoAlpha: 0, duration: 0.3 });
      shown = false;
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  return (
    <>
      <div
        ref={ring}
        aria-hidden
        className={cn(
          "pointer-events-none fixed left-0 top-0 z-[130] hidden items-center [.has-cursor_&]:flex justify-center rounded-full transition-[width,height,background-color,border-color] duration-500 ease-[var(--ease-expo)]",
          mode === "default" && "h-2 w-2 border border-transparent",
          mode === "hover" && "h-14 w-14 border border-gold-400",
          mode === "label" && "h-24 w-24 border border-gold-400/0 bg-gold-400/95 backdrop-blur-sm",
        )}
      >
        <span
          className={cn(
            "text-[0.6rem] font-bold uppercase tracking-[0.25em] text-ink-950 transition-opacity duration-300",
            mode === "label" ? "opacity-100" : "opacity-0",
          )}
        >
          {label}
        </span>
      </div>
      <div
        ref={dot}
        aria-hidden
        className={cn(
          "pointer-events-none fixed left-0 top-0 z-[131] hidden h-1.5 w-1.5 [.has-cursor_&]:block rounded-full bg-white transition-opacity duration-300",
          mode === "label" && "opacity-0",
        )}
      />
    </>
  );
}
