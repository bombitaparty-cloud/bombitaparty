"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { site } from "@/data/site";
import type { BombitaEvent } from "@/lib/cms/types";
import { gsap, ScrollTrigger, SplitText, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { playInline } from "@/lib/utils/video";
import { eventDate, ticketUrlFor } from "@/lib/utils";
import { useIntro } from "@/components/animations/Providers";
import { Button } from "@/components/ui/Button";
import { TLink } from "@/components/ui/TLink";
import { BombitaMark, BrandLogo, Wordmark } from "@/components/ui/Logo";
import { PlayButton } from "@/components/video/PlayButton";
import { VideoModal } from "@/components/video/VideoModal";

/** Start a muted loop only once it's actually needed. */
function startVideo(v: HTMLVideoElement | null, src: string, at = 0) {
  if (!v || v.dataset.loaded) return;
  v.dataset.loaded = "1";
  if (at) v.addEventListener("loadedmetadata", () => (v.currentTime = at % (v.duration || 15)), { once: true });
  playInline(v, src);
}

/**
 * Hero built on the client's recap footage.
 * Desktop: blurred backdrop + two tilted vertical reel cards flanking the logo.
 * Mobile: the vertical film full-screen behind the logo.
 */
export function Hero({ nextEvent }: { nextEvent?: BombitaEvent }) {
  const root = useRef<HTMLElement>(null);
  const mobileVid = useRef<HTMLVideoElement>(null);
  const backdrop = useRef<HTMLVideoElement>(null);
  const cardA = useRef<HTMLVideoElement>(null);
  const cardB = useRef<HTMLVideoElement>(null);
  const { ready, cinematic } = useIntro();
  const [reelOpen, setReelOpen] = useState(false);
  const { phrases, hero } = site;
  const d = nextEvent ? eventDate(nextEvent) : null;

  // Load only the footage for the current layout (phones never fetch the desktop set).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const load = () => {
      if (mq.matches) {
        startVideo(backdrop.current, hero.video.backdrop);
        startVideo(cardA.current, hero.video.src);
        startVideo(cardB.current, hero.video.src, 7.5);
      } else {
        // 720p is sharp on a phone and a third of the 1080p download.
        startVideo(mobileVid.current, hero.video.src);
      }
    };
    load();
    mq.addEventListener("change", load);
    return () => mq.removeEventListener("change", load);
  }, [hero.video]);

  useGSAP(
    () => {
      if (!ready) return;
      const q = gsap.utils.selector(root);
      const hidden = q("[data-hero-hide]");
      if (prefersReducedMotion()) {
        gsap.set(hidden, { autoAlpha: 1 });
        gsap.set(q("[data-logo-final]"), { opacity: 1 });
        gsap.set(q("[data-wordmark], [data-mascot] > img"), { opacity: 0 });
        return;
      }
      const party = SplitText.create(q("[data-party]"), { type: "chars" });
      const k = cinematic ? 1 : 0.7;
      gsap.set(hidden, { autoAlpha: 1 });

      gsap
        .timeline({ defaults: { ease: "expo.out" } })
        .fromTo(q("[data-media]"), { scale: 1.15, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 2.2 * k }, 0)
        .from(q("[data-card='a']"), { xPercent: -120, rotate: -22, autoAlpha: 0, duration: 1.6 }, 0.2 * k)
        .from(q("[data-card='b']"), { xPercent: 120, rotate: 22, autoAlpha: 0, duration: 1.6 }, 0.3 * k)
        .from(q("[data-mascot]"), { y: -140, scale: 0.55, rotate: -18, autoAlpha: 0, duration: 1.4, ease: "back.out(1.5)" }, 0.25 * k)
        .from(q("[data-spark]"), { scale: 0, autoAlpha: 0, duration: 0.6, ease: "back.out(3)" }, 1 * k)
        .fromTo(
          q("[data-wordmark]"),
          { clipPath: "inset(0 100% 0 0)", x: -30 },
          { clipPath: "inset(0 0% 0 0)", x: 0, duration: 1.1, ease: "power3.inOut" },
          0.7 * k,
        )
        .from(party.chars, { autoAlpha: 0, x: -30, duration: 0.9, stagger: 0.06 }, 1.15 * k)
        .from(q("[data-sub] > *"), { y: 14, autoAlpha: 0, duration: 0.9, stagger: 0.06 }, 1.25 * k)
        .from(q("[data-cta] > *"), { y: 36, autoAlpha: 0, duration: 1.1, stagger: 0.09 }, 1.35 * k)
        .from(q("[data-bottom] > *"), { y: 20, autoAlpha: 0, duration: 1, stagger: 0.08 }, 1.5 * k)
        .set(q("[data-logo-final]"), { opacity: 1 }, 2.2 * k)
        .set(q("[data-wordmark], [data-mascot] > img"), { opacity: 0 }, 2.25 * k);

      // Idle life: mascot floats, cards sway — only while the hero is on screen.
      const idle = [
        gsap.to(q("[data-mascot]"), { y: -8, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 2.2 }),
        gsap.to(q("[data-card]"), { y: -12, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.8, delay: 2 }),
      ];
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: ({ isActive }) => {
          idle.forEach((t) => (isActive ? t.resume() : t.pause()));
          // Stop decoding hero footage once it's scrolled away.
          for (const v of [mobileVid.current, backdrop.current, cardA.current, cardB.current]) {
            if (!v?.dataset.loaded) continue;
            if (isActive) v.play().catch(() => {});
            else v.pause();
          }
        },
      });

      // Scroll-out: logo lifts (all screens); cards spread + footage deepens on desktop only —
      // on phones transforming the full-screen video every frame costs more than it shows.
      const out = gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } })
        .to(q("[data-content]"), { yPercent: -18, autoAlpha: 0, ease: "none" }, 0);
      if (window.matchMedia("(min-width: 1024px)").matches) {
        out
          .to(q("[data-card='a']"), { xPercent: -30, rotate: -14, ease: "none" }, 0)
          .to(q("[data-card='b']"), { xPercent: 30, rotate: 14, ease: "none" }, 0)
          .to(q("[data-media-inner]"), { yPercent: 10, scale: 1.08, ease: "none" }, 0);
      }

      return () => party.revert();
    },
    { dependencies: [ready], scope: root },
  );

  const card = (id: "a" | "b", ref: React.RefObject<HTMLVideoElement | null>) => (
    <figure
      data-card={id}
      data-hero-hide
      aria-hidden
      className={
        "absolute top-1/2 hidden w-[clamp(10rem,14vw,16.5rem)] -translate-y-[54%] lg:block " +
        (id === "a" ? "left-[4vw] -rotate-6" : "right-[4vw] rotate-6")
      }
    >
      <div className="relative aspect-[9/16] overflow-hidden border border-gold-400/60 bg-ink-900 shadow-[0_40px_80px_-20px_rgba(0,0,0,.9),0_0_60px_-20px_rgba(224,185,79,.45)]">
        <Image src={hero.video.poster} alt="" fill sizes="20vw" quality={75} className="object-cover" />
        <video ref={ref} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline preload="none" poster={hero.video.poster} />
        <span className="absolute inset-0 bg-gradient-to-t from-ink-950/50 via-transparent to-transparent" />
      </div>
    </figure>
  );

  return (
    <section ref={root} aria-label="Bombita Party" className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-ink-950">
      {/* ── Media ── */}
      <div data-media data-hero-hide className="absolute inset-0">
        <div data-media-inner className="absolute inset-0">
          <Image src={hero.video.poster} alt="" fill priority sizes="100vw" quality={75} className="object-cover lg:scale-110 lg:blur-2xl" />
          {/* phones: the vertical film, full-screen */}
          <video ref={mobileVid} className="absolute inset-0 h-full w-full object-cover lg:hidden" muted loop playsInline preload="none" poster={hero.video.poster} aria-hidden />
          {/* desktop: blurred landscape backdrop */}
          <video ref={backdrop} className="absolute inset-0 hidden h-full w-full object-cover lg:block" muted loop playsInline preload="none" aria-hidden />
        </div>
        <div className="vignette absolute inset-0" />
        <div className="absolute inset-0 bg-ink-950/35 lg:bg-ink-950/50" />
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent lg:hidden" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_50%_at_50%_42%,rgba(5,5,5,.6),transparent_75%)]" />
      </div>

      {card("a", cardA)}
      {card("b", cardB)}

      {/* ── Logo ── */}
      <div
        data-content
        className="container-lux relative z-10 flex flex-1 flex-col items-center justify-center pb-44 pt-[calc(var(--nav-h)+1rem)] text-center lg:pb-28"
      >
        <h1 className="relative flex w-[min(80vw,23rem)] flex-col items-center md:w-[min(46vw,28rem)] xl:w-[30rem]">
          <span className="sr-only">
            {phrases.heroTitle} {phrases.heroSubtitle} — {phrases.tagline}
          </span>
          <span data-mascot data-hero-hide aria-hidden className="relative block w-full">
            <BombitaMark priority className="block w-full" />
            <span
              data-spark
              className="absolute left-[60%] top-[-3%] aspect-square w-[16%] rounded-full bg-[radial-gradient(circle,rgba(255,240,190,.95),rgba(255,140,40,.45)_40%,transparent_70%)] mix-blend-screen animate-[spark_0.9s_ease-in-out_infinite_alternate]"
            />
          </span>
          <span data-wordmark data-hero-hide aria-hidden className="-mt-px block w-full">
            <Wordmark priority className="block w-full" />
          </span>
          {/* Seamless final frame: one image replaces the two animated halves */}
          <span data-logo-final aria-hidden className="pointer-events-none absolute inset-x-0 top-0 block w-full opacity-0">
            <BrandLogo priority className="block w-full" />
          </span>
          <span aria-hidden data-party data-hero-hide className="mt-2 block pl-[0.8em] text-lg font-semibold uppercase tracking-[0.8em] text-white md:text-2xl">
            {phrases.heroSubtitle}
          </span>
        </h1>

        <div data-sub className="mt-4 flex flex-col items-center gap-3">
          <p data-hero-hide className="pl-[0.5em] text-[0.62rem] font-semibold uppercase tracking-[0.5em] text-gold-300 md:text-xs">
            {phrases.city}
          </p>
          <p data-hero-hide className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-white/90 md:text-xs">
            {[...phrases.eyebrow.split("×").map((w) => w.trim()), "A Movement"].map((w, i) => (
              <span key={w} className="flex items-center gap-4">
                {i > 0 && <span className="h-3 w-px bg-red-500" aria-hidden />}
                {w}
              </span>
            ))}
          </p>
        </div>

        <div data-cta className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div data-hero-hide>
            <Button href={ticketUrlFor(nextEvent)} size="lg" className="w-full sm:w-auto">
              Get Tickets
            </Button>
          </div>
          <div data-hero-hide>
            <Button href="/events" variant="light" size="lg" className="w-full sm:w-auto">
              Upcoming Events
            </Button>
          </div>
          <div data-hero-hide>
            <Button href="/wear" variant="red" size="lg" className="w-full sm:w-auto">
              Bombita Wear
            </Button>
          </div>
        </div>
      </div>

      {/* ── Bottom rail ── */}
      <div data-bottom className="container-lux absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 flex items-end justify-between gap-6 pb-3 lg:bottom-0 lg:pb-8">
        <button
          type="button"
          data-hero-hide
          onClick={() => setReelOpen(true)}
          className="group flex items-center gap-4 text-left"
          aria-label="Watch the vibe — play the Bombita Party recap film with sound"
        >
          <PlayButton size="sm" />
          <span className="eyebrow hidden text-white/80 transition-colors group-hover:text-gold-300 sm:block">Watch the vibe</span>
        </button>

        <div data-hero-hide className="absolute left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex" aria-hidden>
          <span className="flex h-9 w-5 justify-center rounded-full border border-white/40 pt-1.5">
            <span className="animate-scroll-dot h-1.5 w-px bg-gold-300" />
          </span>
          <span className="text-[0.55rem] font-semibold uppercase tracking-[0.4em] text-white/60">Scroll to explore</span>
        </div>

        {nextEvent && d ? (
          <TLink data-hero-hide href={`/events/${nextEvent.slug}`} className="group flex items-center gap-3 text-right">
            <span>
              <span className="eyebrow block text-gold-300">Next · {d.weekdayEs}</span>
              <span className="mt-1 block font-display text-2xl leading-none tracking-wide text-white md:text-3xl">
                {d.month} {d.day}
              </span>
              <span className="mt-1 hidden text-[0.7rem] uppercase tracking-[0.2em] text-mute transition-colors group-hover:text-white sm:block">
                {nextEvent.title}
              </span>
            </span>
            <span className="h-12 w-px bg-red-500" aria-hidden />
          </TLink>
        ) : (
          <p data-hero-hide className="eyebrow text-right text-white/70">{phrases.city}</p>
        )}
      </div>

      <VideoModal
        open={reelOpen}
        onClose={() => setReelOpen(false)}
        sources={site.reel.sources}
        poster={site.reel.poster}
        portrait
        title="Bombita Party — the recap"
      />
    </section>
  );
}
