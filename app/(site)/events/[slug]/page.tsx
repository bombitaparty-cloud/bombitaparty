import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, Music2, ShieldCheck, Shirt } from "lucide-react";
import { getAllEvents, getEventBySlug, getUpcomingEvents, isPast } from "@/lib/cms";
import { site } from "@/data/site";
import { eventDate, lineup, tableUrlFor, ticketUrlFor } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TLink } from "@/components/ui/TLink";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatusBadge } from "@/components/events/StatusBadge";
import { EventRow } from "@/components/events/EventRow";
import { MobileTicketBar } from "@/components/events/MobileTicketBar";
import { RsvpForm } from "@/components/events/RsvpForm";
import { PhotoGrid } from "@/components/gallery/PhotoGrid";
import { InlineVideo } from "@/components/video/InlineVideo";
import { ImageReveal, Reveal, SplitReveal } from "@/components/animations/Reveal";

/** Re-render hourly so past events roll off and CMS edits appear without a redeploy. */
export const revalidate = 300;

export async function generateStaticParams() {
  return (await getAllEvents()).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEventBySlug(slug);
  if (!e) return {};
  const d = eventDate(e);
  const title = `${e.title}${e.subtitle ? ` — ${e.subtitle}` : ""} · ${d.month} ${d.day}`;
  const description = `${d.long} at ${e.venue.name}, ${e.venue.city}. ${e.description.slice(0, 140)}…`;
  return {
    title,
    description,
    alternates: { canonical: `/events/${e.slug}` },
    openGraph: { title, description, type: "website", images: [{ url: e.flyer.src, alt: e.flyer.alt }] },
    twitter: { card: "summary_large_image", title, description, images: [e.flyer.src] },
  };
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const d = eventDate(event);
  const acts = lineup(event);
  const past = isPast(event);
  const soldOut = event.status === "sold-out";
  const comingSoon = event.status === "coming-soon";
  const more = (await getUpcomingEvents()).filter((e) => e.slug !== event.slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${event.title}${event.subtitle ? ` — ${event.subtitle}` : ""}`,
    description: event.description,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: [event.flyer.src],
    location: {
      "@type": "Place",
      name: event.venue.name,
      address: { "@type": "PostalAddress", streetAddress: event.venue.address, addressLocality: "New York", addressRegion: "NY", addressCountry: "US" },
    },
    performer: acts.map((name) => ({ "@type": "PerformingGroup", name })),
    organizer: { "@type": "Organization", name: "BOMBITA", url: site.url },
    offers: {
      "@type": "Offer",
      url: ticketUrlFor(event),
      availability: soldOut ? "https://schema.org/SoldOut" : comingSoon ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
      validFrom: new Date().toISOString().slice(0, 10),
    },
  };

  const facts = [
    { icon: CalendarDays, label: "Date", value: d.long },
    { icon: Clock, label: "Time", value: d.timeRange },
    { icon: MapPin, label: "Venue", value: `${event.venue.name} — ${event.venue.address}, ${event.venue.city}`, href: event.venue.mapUrl },
    ...(acts.length ? [{ icon: Music2, label: "Line-up", value: acts.join(" · ") }] : []),
    ...(event.ageLimit ? [{ icon: ShieldCheck, label: "Entry", value: `${event.ageLimit}+ with valid ID` }] : []),
    ...(event.dressCode ? [{ icon: Shirt, label: "Dress code", value: event.dressCode }] : []),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden pb-12 pt-[var(--nav-h)] md:pb-24 lg:pt-[calc(var(--nav-h)+4rem)]">
        <div className="absolute inset-0 -z-10">
          <Image src={event.flyer.src} alt="" fill priority sizes="100vw" quality={60} className="scale-110 object-cover opacity-40 blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/60 via-ink-950/80 to-ink-950" />
        </div>

        <div className="container-lux">
          <TLink href="/events" className="eyebrow hidden items-center gap-2 text-mute transition-colors hover:text-gold-300 lg:inline-flex">
            <ArrowLeft className="h-3.5 w-3.5" /> All events
          </TLink>

          <div className="grid gap-8 lg:mt-8 lg:grid-cols-12 lg:gap-16">
            <ImageReveal className="aspect-[4/5] max-lg:-mx-[var(--gutter)] lg:col-span-5 lg:border lg:border-gold-500/30">
              <Image
                src={event.flyer.src}
                alt={event.flyer.alt}
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                quality={75}
                className="img-cine object-cover"
              />
              {/* Phones: story-style overlay — back link, status, date and title on the flyer */}
              <div className="absolute inset-0 flex flex-col justify-between bg-[linear-gradient(to_bottom,rgba(5,5,5,.6),transparent_30%,transparent_42%,rgba(5,5,5,.85)_72%,#050505)] p-5 lg:hidden">
                <div className="flex items-center justify-between gap-3">
                  <TLink href="/events" className="flex h-10 items-center gap-2 rounded-full bg-ink-950/70 px-4 text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md">
                    <ArrowLeft className="h-3.5 w-3.5" /> Events
                  </TLink>
                  <StatusBadge status={past ? "past" : event.status} className="bg-ink-950/70 backdrop-blur-md" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/90">
                    {d.weekdayEs} · {d.timeRange}
                  </p>
                  <p className="font-display text-7xl leading-[0.85] tracking-tight">
                    {d.month} {d.day}
                  </p>
                  <h1 className="mt-3">
                    <span className="block -rotate-2 font-brush text-5xl leading-[0.9] text-gold-gradient drop-shadow-[0_4px_20px_rgba(0,0,0,.8)]">{event.title}</span>
                    {event.subtitle && <span className="mt-1 block pl-1 font-serif text-2xl italic text-white">{event.subtitle}</span>}
                  </h1>
                  <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-mute">{event.venue.name}</p>
                </div>
              </div>
            </ImageReveal>

            <div className="flex flex-col justify-center lg:col-span-7">
              <div className="hidden flex-wrap items-center gap-4 lg:flex">
                <StatusBadge status={past ? "past" : event.status} />
                <span className="eyebrow text-mute-2">{event.venue.name}</span>
              </div>
              <p className="mt-8 hidden text-sm font-bold uppercase tracking-[0.3em] text-white/90 lg:block">{d.weekdayEs}</p>
              <p className="hidden font-display text-[clamp(4.5rem,12vw,9rem)] leading-[0.82] tracking-tight lg:block">
                {d.month} {d.day}
              </p>
              <h1 className="mt-6 hidden lg:block">
                <span className="block -rotate-2 font-brush text-[clamp(3rem,7.5vw,6.5rem)] leading-[0.9] text-gold-gradient">
                  {event.title}
                </span>
                {event.subtitle && (
                  <span className="mt-2 block pl-1 font-serif text-3xl italic text-white md:text-5xl">{event.subtitle}</span>
                )}
              </h1>
              {event.tagline && (
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-white/80 lg:mt-6 lg:tracking-[0.4em]">{event.tagline}</p>
              )}

              <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap lg:mt-10">
                {past ? (
                  <Button href="/photos" variant="outline" size="lg">
                    View the recap
                  </Button>
                ) : comingSoon ? (
                  <Button href="/#join" size="lg">
                    Get notified
                  </Button>
                ) : (
                  <>
                    <Button href={ticketUrlFor(event)} size="lg" className="w-full sm:w-auto">
                      {soldOut ? "Join waitlist" : "Get Tickets"}
                    </Button>
                    <Button href={tableUrlFor(event)} variant="outline" size="lg" className="w-full sm:w-auto">
                      Reserve a Table
                    </Button>
                  </>
                )}
              </div>
              {!past && (
                <TLink href="/birthdays" className="link-lux mt-5 inline-block text-xs font-semibold uppercase tracking-[0.22em] text-gold-300">
                  Celebrating a birthday? Plan it with us →
                </TLink>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Details ── */}
      <section aria-labelledby="about-night" className="container-lux grid gap-14 py-16 md:py-24 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionLabel>The night</SectionLabel>
          <SplitReveal as="h2" className="mt-6 font-display text-5xl leading-[0.9] tracking-wide md:text-7xl">
            <span id="about-night">About the event</span>
          </SplitReveal>
          <Reveal>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">{event.description}</p>
          </Reveal>
        </div>
        <Reveal as="dl" stagger={0.06} className="border-t border-white/10 lg:col-span-5">
          {facts.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex gap-5 border-b border-white/10 py-5">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" strokeWidth={1.4} aria-hidden />
              <div>
                <dt className="eyebrow text-[0.6rem] text-mute-2">{label}</dt>
                <dd className="mt-1.5 text-sm text-white">
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="link-lux hover:text-gold-300">
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      {!past && (
        <section id="rsvp" aria-labelledby="rsvp-title" className="scroll-mt-28 border-y border-white/10 bg-ink-900 py-16 md:py-24">
          <div className="container-lux grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionLabel>Guest list</SectionLabel>
              <h2 id="rsvp-title" className="mt-5 font-display text-5xl tracking-wide md:text-6xl">
                RSVP
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-mute">
                Get on the Bombita guest list for {event.title}. RSVP is free — for guaranteed entry, grab tickets or reserve a table.
              </p>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <RsvpForm event={event.slug} eventTitle={event.title} />
            </div>
          </div>
        </section>
      )}

      {event.video && (
        <section aria-label="Event video" className="container-lux py-16 md:py-24">
          <InlineVideo src={event.video} poster={event.gallery[0]?.src ?? event.flyer.src} title={event.title} />
        </section>
      )}

      {event.gallery.length > 0 && (
        <section aria-labelledby="event-gallery" className="container-lux pb-20 md:pb-28">
          <SectionLabel>Gallery</SectionLabel>
          <h2 id="event-gallery" className="mb-10 mt-5 font-display text-5xl tracking-wide md:text-6xl">
            The vibe
          </h2>
          <PhotoGrid
            filters={false}
            photos={event.gallery.map((g, i) => ({ ...g, id: `${event.slug}-${i}`, shape: i % 3 === 0 ? "portrait" : "landscape" }))}
          />
        </section>
      )}

      {more.length > 0 && (
        <section aria-labelledby="more-events" className="border-t border-white/10 bg-ink-900 py-20 md:py-28">
          <div className="container-lux">
            <div className="mb-10 flex items-end justify-between">
              <h2 id="more-events" className="font-display text-5xl tracking-wide md:text-6xl">
                More nights
              </h2>
              <TLink href="/events" className="link-lux eyebrow text-white/80">
                View all →
              </TLink>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {more.map((e) => (
                <EventRow key={e.slug} event={e} />
              ))}
            </div>
          </div>
        </section>
      )}

      {!past && !comingSoon && (
        <MobileTicketBar
          ticketUrl={ticketUrlFor(event)}
          label={soldOut ? "Sold out" : "Get Tickets"}
          disabled={soldOut}
          meta={`${d.weekdayShort} ${d.month} ${d.day} · ${event.venue.name}`}
        />
      )}
    </>
  );
}
