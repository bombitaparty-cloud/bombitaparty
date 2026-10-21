import type { Metadata } from "next";
import Image from "next/image";
import { getFeaturedEvent, getPastEvents, getUpcomingEvents } from "@/lib/cms";
import { eventDate, lineup, ticketUrlFor } from "@/lib/utils";
import { img } from "@/data/media";
import { BrushUnderline } from "@/components/ui/Logo";
import { FlyerCard } from "@/components/events/FlyerCard";
import { ExperienceBanner } from "@/components/events/ExperienceBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TLink } from "@/components/ui/TLink";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/events/StatusBadge";
import { ImageReveal, Reveal, SplitReveal } from "@/components/animations/Reveal";

/** Re-render hourly so past events roll off and CMS edits appear without a redeploy. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming Bombita nights in New York City — Latin music, live artists, DJs, tickets and table reservations.",
  alternates: { canonical: "/events" },
};

export default async function EventsPage() {
  const [featured, upcoming, past] = await Promise.all([getFeaturedEvent(), getUpcomingEvents(), getPastEvents()]);

  return (
    <>
      {/* ── Hero (ref: NYC's home for upcoming events) ── */}
      <section className="relative isolate overflow-hidden pt-[var(--nav-h)]">
        <div className="container-lux grid min-h-[78svh] items-center gap-10 py-14 lg:grid-cols-12">
          <div className="relative z-10 lg:col-span-6">
            <p className="pl-[0.45em] text-xs font-semibold uppercase tracking-[0.45em] text-red-500 md:text-sm">NYC&apos;s home for</p>
            <SplitReveal as="h1" start="top 100%" className="mt-4 font-display text-[clamp(4.5rem,12vw,10rem)] uppercase leading-[0.84] tracking-wide">
              Upcoming
              <br />
              Events
            </SplitReveal>
            <p className="mt-6 flex flex-wrap gap-x-3 gap-y-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-white/85 md:text-xs">
              Music <span className="text-white/40">/</span> Culture <span className="text-white/40">/</span> People <span className="text-white/40">/</span> Good vibes
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button href="#calendar" variant="red" size="lg">
                View full calendar
              </Button>
              {featured && (
                <Button href={ticketUrlFor(featured)} size="lg">
                  Get Tickets
                </Button>
              )}
            </div>
          </div>
          <div className="relative lg:col-span-6">
            <ImageReveal className="aspect-[4/3] w-full lg:aspect-[5/4]" direction="left">
              <Image src={img.sparklersCrowd} alt="Bottle sparklers raised over the crowd" fill priority sizes="(min-width: 1024px) 50vw, 100vw" quality={75} className="img-cine object-cover" />
            </ImageReveal>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950 via-transparent to-transparent" />
            <p aria-hidden className="absolute -bottom-4 right-4 -rotate-6 font-hand text-4xl leading-[0.95] text-white drop-shadow-[0_4px_20px_rgba(0,0,0,.9)] md:text-5xl">
              More
              <br />
              than a party
              <BrushUnderline className="mt-1 block h-3 w-32" />
            </p>
          </div>
        </div>
      </section>

      {/* ── Flyer grid ── */}
      <section id="upcoming" aria-labelledby="upcoming-title" className="container-lux scroll-mt-24 pb-16 pt-10 md:pb-24">
        <div className="mb-10 flex items-end justify-between gap-6">
          <h2 id="upcoming-title" className="font-display text-5xl uppercase tracking-wide md:text-6xl">
            Upcoming events
          </h2>
          <a href="#calendar" className="link-lux eyebrow shrink-0 text-white/80 hover:text-white">
            View all events →
          </a>
        </div>
        <Reveal stagger={0.1} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.slice(0, 6).map((e, i) => (
            <FlyerCard key={e.slug} event={e} priority={i < 3} />
          ))}
        </Reveal>
        <div className="mt-8">
          <ExperienceBanner />
        </div>
      </section>

      <section id="calendar" aria-labelledby="all-upcoming" className="container-lux scroll-mt-24 pb-24 md:pb-32">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <SectionLabel>Full calendar</SectionLabel>
            <h2 id="all-upcoming" className="mt-5 font-display text-5xl tracking-wide md:text-7xl">
              Every date
            </h2>
          </div>
          <p className="eyebrow text-mute-2">{String(upcoming.length).padStart(2, "0")} dates</p>
        </div>

        <Reveal as="ol" stagger={0.08} className="border-t border-white/10">
          {upcoming.map((e) => {
            const d = eventDate(e);
            return (
              <li key={e.slug} className="group relative border-b border-white/10">
                <div className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-4 py-7 transition-colors duration-500 md:grid-cols-[12rem_1fr_16rem_auto] md:gap-x-10 md:py-9">
                  <div className="leading-none">
                    <span className="block text-[0.6rem] font-bold uppercase tracking-[0.25em] text-gold-400">{d.weekdayEs}</span>
                    <span className="mt-1 block whitespace-nowrap font-display text-5xl tracking-tight md:text-7xl">
                      {d.month} {d.dayPadded}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3>
                      <TLink
                        href={`/events/${e.slug}`}
                        data-cursor="Details"
                        className="font-display text-3xl tracking-wide transition-colors duration-500 after:absolute after:inset-0 after:content-[''] group-hover:text-gold-300 md:text-5xl"
                      >
                        {e.title}
                      </TLink>
                    </h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-mute">
                      {e.subtitle ? `${e.subtitle} · ` : ""}
                      {e.venue.name} · {d.timeRange}
                    </p>
                  </div>
                  <div className="col-span-2 flex items-center gap-4 md:col-span-1">
                    <div className="relative hidden h-20 w-32 overflow-hidden md:block">
                      <Image
                        src={e.flyer.src}
                        alt=""
                        fill
                        sizes="128px"
                        quality={60}
                        className="object-cover grayscale transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0"
                      />
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="relative z-10 col-span-2 md:col-span-1">
                    {e.status === "coming-soon" ? (
                      <Button href="/#join" variant="red" size="sm">
                        Notify me
                      </Button>
                    ) : (
                      <Button href={ticketUrlFor(e)} size="sm">
                        Tickets
                      </Button>
                    )}
                  </div>
                </div>
                <span
                  aria-hidden
                  className="absolute bottom-[-1px] left-0 h-px w-full origin-left scale-x-0 bg-gold-400 transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-x-100"
                />
              </li>
            );
          })}
        </Reveal>
      </section>

      {past.length > 0 && (
        <section id="past" aria-labelledby="past-title" className="scroll-mt-24 border-t border-white/10 bg-ink-900 py-24 md:py-32">
          <div className="container-lux">
            <SectionLabel>Recaps</SectionLabel>
            <h2 id="past-title" className="mt-5 font-display text-5xl tracking-wide md:text-7xl">
              Past nights
            </h2>
            <Reveal stagger={0.08} className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((e) => {
                const d = eventDate(e);
                return (
                  <TLink key={e.slug} href={`/events/${e.slug}`} data-cursor="Recap" className="group relative block aspect-[4/5] overflow-hidden">
                    <Image
                      src={e.flyer.src}
                      alt={e.flyer.alt}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      quality={60}
                      className="object-cover grayscale transition-all duration-[1.2s] ease-[var(--ease-expo)] group-hover:scale-105 group-hover:grayscale-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <p className="eyebrow text-gold-400">
                        {d.month} {d.day}, {d.year}
                      </p>
                      <h3 className="mt-2 font-display text-4xl tracking-wide">{e.title}</h3>
                      <p className="text-xs uppercase tracking-[0.2em] text-mute">{lineup(e).join(" · ") || e.venue.name}</p>
                    </div>
                  </TLink>
                );
              })}
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
