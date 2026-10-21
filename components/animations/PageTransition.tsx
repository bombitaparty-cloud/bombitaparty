"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

interface TransitionCtx {
  navigate: (href: string) => void;
}
const TransitionContext = createContext<TransitionCtx>({ navigate: () => {} });
export const usePageTransition = () => useContext(TransitionContext);

/**
 * Cinematic route transition: black panel wipes up + gold line draws,
 * route changes underneath, then the panel lifts away (~700ms total).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const safety = useRef<number | undefined>(undefined);

  const reveal = useCallback(() => {
    window.clearTimeout(safety.current);
    gsap
      .timeline({
        onComplete: () => {
          busy.current = false;
          gsap.set(overlayRef.current, { autoAlpha: 0 });
        },
      })
      .to(lineRef.current, { scaleX: 0, transformOrigin: "100% 50%", duration: 0.3, ease: "expo.in" })
      .to(panelRef.current, { scaleY: 0, transformOrigin: "50% 0%", duration: 0.5, ease: "expo.inOut" }, "-=0.08");
  }, []);

  const navigate = useCallback(
    (href: string) => {
      const url = new URL(href, window.location.href);
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        if (!url.hash) window.scrollTo({ top: 0, behavior: "smooth" });
        else router.push(href);
        return;
      }
      if (busy.current) return;
      if (prefersReducedMotion()) {
        router.push(href);
        return;
      }
      busy.current = true;
      gsap
        .timeline()
        .set(overlayRef.current, { autoAlpha: 1 })
        .fromTo(panelRef.current, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.42, ease: "expo.inOut" })
        .fromTo(lineRef.current, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.36, ease: "expo.inOut" }, "-=0.2")
        .add(() => {
          router.push(href);
          // Never leave the screen covered if navigation stalls.
          safety.current = window.setTimeout(reveal, 4000);
        });
    },
    [router, reveal],
  );

  useEffect(() => {
    if (busy.current) reveal();
  }, [pathname, reveal]);

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[120] invisible"
      >
        <div ref={panelRef} className="absolute inset-0 origin-bottom scale-y-0 bg-ink-950" />
        <div className="absolute inset-x-0 top-1/2 flex justify-center">
          <div
            ref={lineRef}
            className="hairline w-[min(70vw,720px)] scale-x-0"
            style={{ boxShadow: "0 0 24px rgba(224,185,79,.55)" }}
          />
        </div>
      </div>
    </TransitionContext.Provider>
  );
}
