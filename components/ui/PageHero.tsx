import Image from "next/image";
import type { ReactNode } from "react";
import { Parallax, SplitReveal, Reveal } from "@/components/animations/Reveal";
import { SectionLabel } from "./SectionLabel";

/** Cinematic header used by inner pages. */
export function PageHero({
  eyebrow,
  title,
  accent,
  intro,
  image,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  intro?: string;
  image: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden pb-14 pt-[calc(var(--nav-h)+4rem)] md:min-h-[82vh] md:pb-20">
      <Parallax className="absolute inset-0 -z-10" speed={10}>
        <Image src={image} alt="" fill priority sizes="100vw" quality={75} className="img-cine object-cover" />
      </Parallax>
      <div className="vignette absolute inset-0 -z-10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950/80 via-ink-950/30 to-transparent" />

      <div className="container-lux">
        <SectionLabel>{eyebrow}</SectionLabel>
        <SplitReveal
          as="h1"
          start="top 100%"
          className="mt-6 font-display text-[clamp(4rem,14vw,13rem)] leading-[0.82] tracking-wide"
        >
          {title}
          {accent && (
            <>
              {" "}
              <span className="text-gold-vertical">{accent}</span>
            </>
          )}
        </SplitReveal>
        {intro && (
          <Reveal delay={0.3} start="top 100%">
            <p className="mt-6 max-w-xl font-serif text-xl italic leading-snug text-white/85 md:text-2xl">{intro}</p>
          </Reveal>
        )}
        {children && (
          <Reveal delay={0.45} start="top 100%" className="mt-8">
            {children}
          </Reveal>
        )}
      </div>
    </section>
  );
}
