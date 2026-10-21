import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { BombitaEvent } from "@/lib/cms/types";
import { cn, eventDate } from "@/lib/utils";
import { TLink } from "@/components/ui/TLink";

/** Compact editorial row: image · date · name / venue / time · arrow. */
export function EventRow({ event, className }: { event: BombitaEvent; className?: string }) {
  const d = eventDate(event);
  return (
    <TLink
      href={`/events/${event.slug}`}
      className={cn(
        "group relative flex items-stretch gap-4 border border-white/10 bg-ink-800/60 p-2.5 transition-[border-color,background-color] duration-500 hover:border-gold-400/60 hover:bg-ink-600 sm:gap-6",
        className,
      )}
    >
      <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden sm:w-28">
        <Image
          src={event.flyer.src}
          alt=""
          fill
          sizes="112px"
          quality={60}
          className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-expo)] group-hover:scale-110"
        />
      </div>
      <div className="flex w-14 shrink-0 flex-col justify-center border-r border-white/10 pr-3 sm:w-20 sm:pr-4">
        <span className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-mute">{d.weekdayEs}</span>
        <span className="font-display text-3xl leading-none tracking-tight text-white sm:text-4xl">
          {d.month}
          <br className="sm:hidden" /> {d.day}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
        <h3 className="line-clamp-3 text-sm font-bold uppercase leading-snug tracking-[0.04em] [overflow-wrap:anywhere] sm:tracking-[0.08em] text-white transition-colors duration-500 group-hover:text-gold-300 sm:truncate sm:text-base">
          {event.title}
        </h3>
        {event.subtitle && <p className="line-clamp-2 text-xs uppercase tracking-[0.08em] text-white/70 sm:line-clamp-1">{event.subtitle}</p>}
        <p className="mt-1.5 line-clamp-2 text-[0.7rem] uppercase tracking-[0.12em] text-mute sm:truncate">
          {event.venue.name} · {d.timeRange}
        </p>
      </div>
      <span className="flex items-center pr-2 text-gold-400" aria-hidden>
        <ChevronRight className="h-5 w-5 transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-1.5" />
      </span>
    </TLink>
  );
}
