"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useIntro } from "@/components/animations/Providers";
import { Lockup } from "@/components/ui/Logo";

const R = 62;
const C = 2 * Math.PI * R;

/**
 * Branded preloader (~1.5s): mark appears → gold ring fills → mark pulses →
 * gold line spans the screen → black halves part to reveal the hero.
 * Plays once per session (first page view only). Skipped for
 * reduced motion — decided pre-paint by the inline script in layout.tsx.
 */
export function Preloader() {
  const { finish } = useIntro();
  const root = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useGSAP(
    () => {
      const html = document.documentElement;
      if (html.dataset.intro === "skip") {
        finish(false);
        setGone(true);
        return;
      }
      const q = gsap.utils.selector(root);
      const counter = { v: 0 };
      const pct = q("[data-pct]")[0] as HTMLElement;

      const tl = gsap.timeline({
        defaults: { ease: "expo.out" },
        onComplete: () => {
          html.dataset.intro = "done";
          try { sessionStorage.setItem("bombita-intro", "1"); } catch {}
          setGone(true);
        },
      });

      tl.from(q("[data-mark]"), { scale: 0.6, autoAlpha: 0, duration: 0.7 })
        .from(q("[data-label]"), { autoAlpha: 0, y: 10, duration: 0.6 }, 0.15)
        .to(q("[data-ring]"), { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, 0.1)
        .to(counter, { v: 100, duration: 1.1, ease: "power2.inOut", onUpdate: () => { pct.textContent = String(Math.round(counter.v)).padStart(2, "0"); } }, 0.1)
        .to(q("[data-mark]"), { scale: 1.08, duration: 0.35, ease: "power2.out" }, 1.05)
        .to(q("[data-center]"), { scale: 0.92, autoAlpha: 0, duration: 0.35, ease: "power2.in" }, 1.3)
        .fromTo(q("[data-line]"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "expo.inOut" }, 1.35)
        .add(() => {
          html.dataset.intro = "done";
          finish(true);
        }, 1.75)
        .to(q("[data-top]"), { yPercent: -100, duration: 0.8, ease: "expo.inOut" }, 1.75)
        .to(q("[data-bottom]"), { yPercent: 100, duration: 0.8, ease: "expo.inOut" }, 1.75)
        .to(q("[data-line]"), { autoAlpha: 0, duration: 0.3 }, 1.8);
      // Same choreography, played faster so content shows sooner.
      tl.timeScale(1.6);
    },
    { scope: root },
  );

  if (gone) return null;

  return (
    <div ref={root} data-preloader aria-hidden className="fixed inset-0 z-[140]">
      <div data-top className="absolute inset-x-0 top-0 h-1/2 bg-ink-950" />
      <div data-bottom className="absolute inset-x-0 bottom-0 h-1/2 bg-ink-950" />
      <div
        data-line
        className="absolute left-0 top-1/2 h-px w-full origin-center scale-x-0 bg-gradient-to-r from-transparent via-gold-300 to-transparent"
        style={{ boxShadow: "0 0 30px rgba(241,210,122,.6)" }}
      />
      <div data-center className="absolute inset-0 flex flex-col items-center justify-center gap-8">
        <div className="relative h-60 w-60 md:h-72 md:w-72">
          <svg viewBox="0 0 140 140" className="absolute inset-0 -rotate-90">
            <circle cx="70" cy="70" r={R} stroke="rgba(255,255,255,.08)" strokeWidth="1" fill="none" />
            <circle
              data-ring
              cx="70"
              cy="70"
              r={R}
              stroke="url(#pl-gold)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C}
            />
            <defs>
              <linearGradient id="pl-gold" x1="0" x2="1">
                <stop offset="0" stopColor="#A8862A" />
                <stop offset=".5" stopColor="#F1D27A" />
                <stop offset="1" stopColor="#D4AF37" />
              </linearGradient>
            </defs>
          </svg>
          <div data-mark className="absolute inset-0 flex items-center justify-center">
            <Lockup className="w-[68%]" priority />
          </div>
        </div>
        <div data-label className="flex items-center gap-4 text-[0.625rem] font-semibold uppercase tracking-[0.5em] text-mute">
          <span>Bombita NYC</span>
          <span className="h-px w-8 bg-gold-500/60" />
          <span className="tabular-nums text-gold-300"><span data-pct>00</span></span>
        </div>
      </div>
    </div>
  );
}
