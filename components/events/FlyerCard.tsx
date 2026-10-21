import Image from "next/image";
import type { BombitaEvent } from "@/lib/cms/types";
import { eventDate, ticketUrlFor } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TLink } from "@/components/ui/TLink";

/**
 * Flyer-style event card (ref): red date badge, "Bombita Party presenta",
 * big condensed title, script subtitle, time + venue, Tickets / RSVP.
 * Typography is generated from event data, so a plain photo works as a flyer.
 */
export function FlyerCard({ event, priority }: { event: BombitaEvent; priority?: boolean }) {
  const d = eventDate(event);
  const soon = event.status === "coming-soon";
  return (
    <article className="group relative flex flex-col overflow-hidden border border-white/10 bg-ink-800 transition-colors duration-500 hover:border-gold-400/60">
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={event.flyer.src}
          alt={event.flyer.alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          quality={75}
          className="img-cine object-cover transition-transform duration-[1.6s] ease-[var(--ease-expo)] group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-ink-950/5" />

        <div className="absolute left-3 top-3 bg-red-500 px-3 pb-2 pt-2.5 text-center font-display leading-[0.85] text-white shadow-[0_10px_30px_-10px_rgba(224,38,47,.8)]">
          <span className="block text-2xl">{d.weekdayShort}</span>
          <span className="block text-2xl">
            {d.month} {d.day}
          </span>
        </div>
        {event.tagline && (
          <p className="absolute right-4 top-4 max-w-[55%] text-right font-display text-xl leading-none tracking-wide text-white drop-shadow">
            {event.tagline}
          </p>
        )}

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-5 pb-6 text-center">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/85">Bombita Party presenta</p>
          <h3 className="mt-2">
            <TLink
              href={`/events/${event.slug}`}
              data-cursor="Details"
              className="block pt-[0.12em] font-display text-[clamp(2.5rem,5vw,3.6rem)] uppercase leading-[0.9] tracking-wide text-chrome-gradient after:absolute after:inset-0 after:content-['']"
            >
              {event.title}
            </TLink>
          </h3>
          {event.subtitle && (
            <p className="-mt-0.5 -rotate-3 font-hand text-3xl text-red-500 drop-shadow-[0_2px_10px_rgba(0,0,0,.9)]">
              {event.subtitle}
            </p>
          )}
          <p className="mt-3 font-display text-xl tracking-wider text-white">{d.timeRange}</p>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/75">{event.venue.name}</p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-3 p-4">
        {soon ? (
          <Button href="/#join" variant="red" size="sm" className="w-full" magnetic={false} arrow={false}>
            Notify me
          </Button>
        ) : (
          <Button href={ticketUrlFor(event)} size="sm" className="w-full" magnetic={false} arrow={false}>
            Get Tickets
          </Button>
        )}
        <Button href={`/events/${event.slug}#rsvp`} variant="light" size="sm" className="w-full" magnetic={false} arrow={false}>
          RSVP
        </Button>
      </div>
    </article>
  );
}
