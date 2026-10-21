"use client";

import { useRef } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { socials, socialHandle } from "@/data/social";
import { gsap, useGSAP } from "@/lib/gsap";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { SplitReveal } from "@/components/animations/Reveal";

/** Editorial social list; on desktop a preview image follows the pointer. */
export function SocialSection() {
  const root = useRef<HTMLElement>(null);
  const preview = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      const el = preview.current!;
      gsap.set(el, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.8 });
      const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
      const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
      const list = root.current!.querySelector("[data-social-list]") as HTMLElement;
      const move = (e: PointerEvent) => {
        const r = list.getBoundingClientRect();
        x(e.clientX - r.left);
        y(e.clientY - r.top);
      };
      const enter = () => gsap.to(el, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "expo.out" });
      const leave = () => gsap.to(el, { autoAlpha: 0, scale: 0.8, duration: 0.4 });
      list.addEventListener("pointermove", move);
      list.addEventListener("pointerenter", enter);
      list.addEventListener("pointerleave", leave);
      return () => {
        list.removeEventListener("pointermove", move);
        list.removeEventListener("pointerenter", enter);
        list.removeEventListener("pointerleave", leave);
      };
    },
    { scope: root },
  );

  const show = (i: number) => {
    preview.current?.querySelectorAll<HTMLElement>("[data-img]").forEach((n, j) => {
      n.style.opacity = i === j ? "1" : "0";
    });
  };

  return (
    <section ref={root} aria-labelledby="social-title" className="relative py-24 md:py-36">
      <div className="container-lux">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionLabel index="07">Follow the movement</SectionLabel>
            <SplitReveal as="h2" className="mt-6 font-display text-[clamp(2.75rem,9vw,10rem)] leading-[0.82] tracking-wide">
              <span id="social-title" className="text-gold-vertical">{socialHandle.toUpperCase()}</span>
            </SplitReveal>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-mute">
            Flyers drop here first. Recaps, aftermovies and the moments you missed — tag us and join the story.
          </p>
        </div>

        <div data-social-list className="relative mt-14 border-t border-white/10">
          <div
            ref={preview}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-10 hidden h-64 w-48 overflow-hidden border border-gold-400/40 md:block"
          >
            {socials.map((s, i) => (
              <div key={s.network} data-img className="absolute inset-0 transition-opacity duration-500" style={{ opacity: i === 0 ? 1 : 0 }}>
                <Image src={s.image} alt="" fill sizes="192px" quality={60} className="object-cover" />
              </div>
            ))}
          </div>
          <ul>
            {socials.map((s, i) => (
              <li key={s.network}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerEnter={() => show(i)}
                  onFocus={() => show(i)}
                  className="group relative flex items-center gap-5 overflow-hidden border-b border-white/10 py-7 md:gap-10 md:py-10"
                >
                  <span aria-hidden className="absolute inset-0 origin-bottom scale-y-0 bg-gold-400 transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-y-100" />
                  <span className="relative text-[0.6rem] font-bold tracking-[0.3em] text-mute-2 transition-colors duration-500 group-hover:text-ink-950">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <SocialIcon
                    network={s.network}
                    className="relative h-7 w-7 text-gold-400 transition-colors duration-500 group-hover:text-ink-950 md:h-9 md:w-9"
                  />
                  <span className="relative flex-1">
                    <span className="block font-display text-5xl leading-none tracking-wide text-white transition-[color,transform] duration-700 ease-[var(--ease-expo)] group-hover:translate-x-3 group-hover:text-ink-950 md:text-8xl">
                      {s.label}
                    </span>
                    <span className="mt-2 block text-sm font-semibold tracking-[0.12em] text-gold-300 transition-colors duration-500 group-hover:text-ink-950 sm:hidden">
                      {s.handle}
                    </span>
                    <span className="mt-2 hidden text-xs uppercase tracking-[0.2em] text-mute transition-colors duration-500 group-hover:text-ink-950/70 sm:block">
                      {s.blurb}
                    </span>
                  </span>
                  <span className="relative hidden text-sm font-semibold tracking-[0.15em] text-white/70 transition-colors duration-500 group-hover:text-ink-950 sm:block">
                    {s.handle}
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="relative h-6 w-6 text-white transition-[transform,color] duration-700 ease-[var(--ease-expo)] group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:rotate-45 group-hover:text-ink-950 md:h-10 md:w-10"
                  />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
