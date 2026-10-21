"use client";

import { useRef, type ElementType, type ReactNode, type CSSProperties } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/** Default to `relative` unless the caller positions the element itself. */
const pos = (c?: string) => (/\b(absolute|fixed|sticky)\b/.test(c ?? "") ? "" : "relative");

interface BaseProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delay?: number;
  style?: CSSProperties;
}

/** Fade + rise on scroll. With `stagger`, animates direct children in sequence. */
export function Reveal({
  children,
  className,
  as: Tag = "div",
  delay = 0,
  y = 40,
  stagger,
  start = "top 85%",
  style,
}: BaseProps & { y?: number; stagger?: number; start?: string }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      const targets = stagger ? Array.from(el.children) : el;
      gsap.from(targets, {
        y,
        autoAlpha: 0,
        duration: 1.2,
        delay,
        stagger,
        ease: "expo.out",
        scrollTrigger: { trigger: el, start, once: true },
      });
    },
    { scope: ref },
  );
  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}

/** Masked line-by-line headline reveal (SplitText). */
export function SplitReveal({
  children,
  className,
  as: Tag = "h2",
  delay = 0,
  type = "lines",
  start = "top 85%",
  style,
}: BaseProps & { type?: "lines" | "words" | "chars"; start?: string }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) {
        gsap.set(el, { autoAlpha: 1 });
        return;
      }
      let split: SplitText | undefined;
      document.fonts.ready.then(() => {
        if (!ref.current) return;
        split = SplitText.create(el, {
          type: type === "lines" ? "lines" : `lines,${type}`,
          mask: "lines",
          linesClass: "split-line",
          autoSplit: type === "lines",
          onSplit(self) {
            const targets = type === "lines" ? self.lines : type === "words" ? self.words : self.chars;
            return gsap.from(targets, {
              yPercent: 110,
              rotate: type === "chars" ? 6 : 2,
              duration: 1.25,
              delay,
              stagger: type === "chars" ? 0.025 : 0.09,
              ease: "expo.out",
              scrollTrigger: { trigger: el, start, once: true },
            });
          },
        });
        gsap.set(el, { autoAlpha: 1 });
      });
      return () => split?.revert();
    },
    { scope: ref },
  );
  return (
    <Tag ref={ref} className={cn("[.js_&]:invisible", className)} style={style}>
      {children}
    </Tag>
  );
}

/** Vertical parallax for media. Wrap an absolutely-filled image. */
export function Parallax({
  children,
  className,
  speed = 12,
  scale = 1.18,
}: { children: ReactNode; className?: string; speed?: number; scale?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (pointer: fine)", () => {
        gsap.fromTo(
          inner.current,
          { yPercent: -speed, scale },
          {
            yPercent: speed,
            scale,
            ease: "none",
            scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={cn(pos(className), "overflow-hidden", className)}>
      <div ref={inner} className="absolute inset-0 will-change-transform">
        {children}
      </div>
    </div>
  );
}

/** Curtain reveal for images: clip-path opens while the image settles from a zoom. */
export function ImageReveal({
  children,
  className,
  direction = "up",
  delay = 0,
}: { children: ReactNode; className?: string; direction?: "up" | "left" | "right"; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      const from =
        direction === "up" ? "inset(100% 0% 0% 0%)" : direction === "left" ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)";
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 88%", once: true }, delay });
      tl.fromTo(el, { clipPath: from }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" }).from(
        el.firstElementChild,
        { scale: 1.3, duration: 1.8, ease: "expo.out" },
        0.1,
      );
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={cn(pos(className), "overflow-hidden", className)}>
      {children}
    </div>
  );
}

/** Gold line that draws across when scrolled into view. */
export function LineDraw({ className, origin = "left" }: { className?: string; origin?: "left" | "center" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!ref.current || prefersReducedMotion()) return;
    gsap.fromTo(
      ref.current,
      { scaleX: 0 },
      { scaleX: 1, duration: 1.6, ease: "expo.inOut", scrollTrigger: { trigger: ref.current, start: "top 92%", once: true } },
    );
  });
  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("h-px bg-gradient-to-r from-gold-500/0 via-gold-400 to-gold-500/0", className)}
      style={{ transformOrigin: origin }}
    />
  );
}

/** Counts up to `to` when visible. */
export function Counter({ to, className, pad = 2 }: { to: number; className?: string; pad?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const out = (n: number) => (el.textContent = String(Math.round(n)).padStart(pad, "0"));
    if (prefersReducedMotion()) return out(to);
    const obj = { n: 0 };
    out(0);
    gsap.to(obj, {
      n: to,
      duration: 2,
      ease: "expo.out",
      onUpdate: () => out(obj.n),
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });
  return (
    <span ref={ref} className={className}>
      {String(to).padStart(pad, "0")}
    </span>
  );
}

export { ScrollTrigger };
