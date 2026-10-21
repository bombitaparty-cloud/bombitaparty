"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { PageTransition } from "./PageTransition";

/* ───────────── Intro (preloader → hero) coordination ───────────── */

interface IntroCtx {
  ready: boolean;
  /** True when the full preloader played (hero can use the longer entrance). */
  cinematic: boolean;
  finish: (cinematic: boolean) => void;
}
const IntroContext = createContext<IntroCtx>({ ready: false, cinematic: false, finish: () => {} });
export const useIntro = () => useContext(IntroContext);

/* ───────────── Smooth scroll (Lenis) ───────────── */

const LenisContext = createContext<{ current: Lenis | null }>({ current: null });
export const useLenis = () => useContext(LenisContext);

export function Providers({ children }: { children: ReactNode }) {
  const [intro, setIntro] = useState({ ready: false, cinematic: false });
  const finish = useCallback((cinematic: boolean) => setIntro({ ready: true, cinematic }), []);
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Phones: don't recompute every trigger when the address bar shows/hides.
    ScrollTrigger.config({ ignoreMobileResize: true });
    // Smooth wheel scrolling only helps mouse/trackpad; touch devices keep native
    // (GPU-accelerated) scrolling and skip the per-frame Lenis ticker entirely.
    if (prefersReducedMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Pause scrolling while the preloader plays.
  useEffect(() => {
    if (!intro.ready) lenisRef.current?.stop();
    else lenisRef.current?.start();
  }, [intro.ready]);

  // Infinite CSS loops (marquees, spinning rings) pause while off-screen.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.toggleAttribute("data-offscreen", !e.isIntersecting)),
      { rootMargin: "100px" },
    );
    const id = window.setTimeout(() => document.querySelectorAll(".animate-marquee, .animate-spin-slow").forEach((el) => io.observe(el)), 300);
    return () => {
      window.clearTimeout(id);
      io.disconnect();
    };
  }, [pathname]);

  // New route → top of page, recalc triggers once images/layout settle.
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 250);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return (
    <LenisContext.Provider value={lenisRef}>
      <IntroContext.Provider value={{ ...intro, finish }}>
        <PageTransition>{children}</PageTransition>
      </IntroContext.Provider>
    </LenisContext.Provider>
  );
}
